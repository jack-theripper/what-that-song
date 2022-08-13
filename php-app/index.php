<?php

use Arhitector\WhatThatSong\Identify;
use Arhitector\WhatThatSong\Processing;
use Arhitector\WhatThatSong\TelegramGenericCommand;
use Longman\TelegramBot\Entities\Update;
use Longman\TelegramBot\Exception\TelegramException;
use Longman\TelegramBot\Request;
use Longman\TelegramBot\Telegram;
use Phalcon\DI\FactoryDefault;
use Phalcon\Mvc\Micro;
use Symfony\Component\Process\ExecutableFinder;

require_once __DIR__ . '/../vendor/autoload.php';

// Initializing a DI Container
$di = new FactoryDefault();

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

$app->get('/api', function () {
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

    // self
    $requrl = "http://identify-eu-west-1.acrcloud.com";
    $access_key = getenv('_ACCESS_KEY');
    $access_secret = getenv('_ACCESS_SECRET');

    $bus = [
        new Processing($ffmpegPath, $file),
        new Identify($requrl, $access_key, $access_secret),
        fn(string $response) => json_decode($response, false)
    ];

    $result = null;

    foreach ($bus as $entry) {
        $result = $entry($result);
    }

    $response = ['success' => false];

    switch ($result->status->code) {
        case 0: // Recognition succeed
            return ['success' => true, 'payload' => (array)$result->metadata->music];


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

/**
 * Веб-хук для обработки сообщений от телеграм бота.
 */
$app->post('/api/webhook', function () {

    $bot_api_key = getenv('TELEGRAM_BOT_API_KEY');

    try {
        $bot = new Telegram($bot_api_key, '$bot_username');
        $bot->useGetUpdatesWithoutDatabase();
        $bot->setDownloadPath(__DIR__ . '/bot_downloads/');
        $bot->addCommandClass(TelegramGenericCommand::class);
        $bot->enableLimiter();

        $bot->handle();
    } catch (Exception $exception) {
        throw $exception;
    }

    return ['success' => true];
});

$app->notFound(function () {
    return ['success' => false, 'message' => 'not found'];
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

$app->handle($_SERVER["REQUEST_URI"]);