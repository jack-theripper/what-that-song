<?php

use Arhitector\WhatThatSong\Identify;
use Arhitector\WhatThatSong\Processing;
use Arhitector\WhatThatSong\TelegramGenericCommand;
use Longman\TelegramBot\Telegram;
use Phalcon\DI\FactoryDefault;
use Phalcon\Http\Response;
use Phalcon\Mvc\Micro;
use Symfony\Component\Process\ExecutableFinder;

require_once __DIR__ . '/../vendor/autoload.php';

$di = new FactoryDefault();

/**
 * Переопределить дефолтный Response чтобы на лету менять Content-type
 */
$di->setShared('response', function () {
    $response = new Response();
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

    $host = getenv('ACRCLOUD_HOST');
    $accessKey = getenv('ACRCLOUD_ACCESS_KEY');
    $accessSecret = getenv('ACRCLOUD_ACCESS_SECRET');

    $bus = [
        new Processing($ffmpegPath, $file),
        new Identify("https://{$host}", $accessKey, $accessSecret),
        fn(string $response) => json_decode($response, false)
    ];

    $result = null;

    foreach ($bus as $entry) {
        $result = $entry($result);
    }

    if ($result->status->code == 0) { // Recognition succeed
        return ['success' => true, 'payload' => (array)$result->metadata->music];
    }

    return ['success' => false, 'message' => sprintf('%d: %s', $result->status->code, $result->status->msg)];
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

/**
 * Обработчик не существует.
 */
$app->notFound(function () {
    return ['success' => false, 'message' => 'Not Found'];
});

/**
 * Хук выполняется после звпроса и оборачивает ответ в JSON.
 */
$app->after(function () use ($app) {
    $return = $app->getReturnedValue();

    if (is_array($return)) {
        $app->response->setContent(json_encode($return));
    } elseif (!strlen($return)) {
        $app->response->setStatusCode('204', 'No Content');
    } else { // Unexpected response
        throw new Exception('Bad Response');
    }

    $app->response->send();
});

$app->handle($_SERVER["REQUEST_URI"]);