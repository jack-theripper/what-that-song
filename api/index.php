<?php

use GuzzleHttp\RequestOptions;
use Phalcon\Mvc\Micro;
use Symfony\Component\Process\ExecutableFinder;
use Symfony\Component\Process\Process;

require_once __DIR__ . '/../vendor/autoload.php';

// Initializing a DI Container
$di = new \Phalcon\DI\FactoryDefault();

/**
 * Overriding Response-object to set the Content-type header globally
 */
$di->setShared('response', function () {
	$response = new \Phalcon\Http\Response();
	$response->setContentType('application/json', 'utf-8');
	$response->setHeader('Access-Control-Allow-Origin', '*');
	$response->setHeader('Access-Control-Allow-Header', 'X-Requested-With, Content-Type, Accept, Origin, Authorization');
	$response->setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');

	return $response;
});

$app = new Micro($di);

/**
 * Функция проверки, что пришли нужные данные т.е конвертированный pcm в lame
 *
 * @param $rawBytes
 * @return bool
 */
function checkBytes($rawBytes)
{
	if ($rawBytes != 'ID3') {
		$bytes[0] = ord($rawBytes[0]);
		$bytes[1] = ord($rawBytes[1]);

		if (($bytes[0] & 0xFF) != 0xFF || (($bytes[1] >> 5) & 0b111) != 0b111) {
			return false;
		}
	}

	return true;
}

$app->get('/', function () {
	return ['success' => true];
});

/**
 * Обработчик определения композиции по отрезку.
 */
$app->post('/api/recognize', function () {
	/** @var Micro $this */

	if (!$this->request->hasFiles()) {
		return ['success' => false];
	}

	$file = null;

	foreach ($this->request->getUploadedFiles(true) as $uploadedFile) {
		if ($uploadedFile->isUploadedFile()) {
			$file = $uploadedFile;
		}
	}

	if (!$file) {
		return ['success' => false];
	}

	$ffmpegPath = (new ExecutableFinder())->find('ffmpeg', false);

	if ($ffmpegPath === false) {
		return ['success' => false, 'message' => 'Ffmpeg is not available'];
	}

	$handle = fopen($file->getTempName(), 'rb');

	if (!checkBytes(fread($handle, 3))) {
		return ['success' => false, 'message' => 'Wrong data'];
	}

	fseek($handle, 0); // т.е. я читал первые байты в checkBytes, то нужно сбросить указатель

	// self
	$requrl = "";
	$access_key = '';
	$access_secret = '';

//	$process = new Process("\"{$ffmpegPath}\" -y -stdin -f mp3 -i - -ss 0 -t 15 -f mp3 -ar 44100 -");
	$process = new Process([$ffmpegPath, '-y', '-stdin', '-f', 'mp3', '-i', '-', '-ss', 0, '-t', 15, '-f', 'mp3', '-ar', 44100, '-']);
	$process->setInput($handle);

	try
	{
		$process->mustRun();
	}
	catch (\Exception $exception)
	{
		file_put_contents($this->logPath.$this->logName.'.log', $exception->getMessage());
	}

	$client = new \GuzzleHttp\Client([
		RequestOptions::HTTP_ERRORS => false,
		RequestOptions::VERIFY      => false
	]);

	$timestamp = time();
	$output = $process->getOutput();
	$signature = implode("\n", ['POST', '/v1/identify', $access_key, 'audio', 1, $timestamp]);

	// request
	$response = $client->post($requrl, [
		RequestOptions::FORM_PARAMS => [
			'access_key'        => $access_key,
			'data_type'         => 'audio',
			'sample'            => base64_encode($output),
			'sample_bytes'      => strlen($output),
			'signature_version' => 1,
			'signature'         => base64_encode(hash_hmac('sha1', $signature, $access_secret, true)),
			'timestamp'         => $timestamp,
			'audio_format'      => 'mp3'
		]
	]);

	// parsing
	$result = json_decode((string) $response->getBody(), false);
	$response = ['success' => false];

	switch ($result->status->code)
	{
		case 0: // Recognition succeed
			return ['success' => true, 'payload' => (array) $result->metadata->music];


		case 1001: // No recognition result

			$response['message'] = 'Результатов не найдено';

			break;

		case 2000: // Recording error (device may not have permission)

			$response['message'] = 'Recording error (device may not have permission)';

			break;

		case 3000: // Recognition service error（http error 500）

			$response['message'] = 'Recognition service error（http error 500）';

			break;

		case 2005: // Timeout

			$response['message'] = 'Operation timeout';

			break;

		case 2004: // Unable to generate fingerprint

			$response['message'] = 'Unable to generate fingerprint';

			break;

		case 2002: // Metadata parse error
		case 3011: // metadata error

			$response['message'] = 'Metadata parse error';

			break;

		case 3001: // Missing/Invalid Access Key
		case 3002: // Invalid ContentType. valid Content-Type is multipart/form-data
		case 3006: // Invalid parameters
		case 3014: // Invalid Signature
		case 3015: // Could not generate fingerprint

			$response['message'] = 'Could not generate fingerprint';

			break;

		case 3003: // Limit exceeded
		case 3016: // The file you uploaded was too large, we sugguest you cut large file to smaller file, 10-20 seconds audio file is enough to identify

			$response['message'] = 'Limit exceeded';

			break;

	}

	return $response;
});


// Making the correct answer after executing
$app->after(function () use ($app) {

	// Getting the return value of method
	$return = $app->getReturnedValue();

	if (is_array($return)) {
		// Transforming arrays to JSON
		$app->response->setContent(json_encode($return));
	} elseif (!strlen($return)) {
		// Successful response without any content
		$app->response->setStatusCode('204', 'No Content');
	} else {

		var_dump($return);
		// Unexpected response
		//throw new Exception('Bad Response');
	}

	// Sending response to the client
	$app->response->send();
});

$app->handle(
	$_SERVER["REQUEST_URI"]
);