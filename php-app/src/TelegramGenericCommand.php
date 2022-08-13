<?php

namespace Arhitector\WhatThatSong;

use DateTime;
use Exception;
use Longman\TelegramBot\Commands\SystemCommand;
use Longman\TelegramBot\Entities\ServerResponse;
use Longman\TelegramBot\Request;
use Longman\TelegramBot\Telegram;
use Phalcon\Http\Request\File;
use Symfony\Component\Process\ExecutableFinder;

/**
 * Обработчик всех сообщений телеграмм.
 */
class TelegramGenericCommand extends SystemCommand
{
    /**
     * @var string
     */
    protected $name = Telegram::GENERIC_MESSAGE_COMMAND;

    /**
     * @inheritDoc
     */
    public function execute(): ServerResponse
    {
        $message = $this->getMessage();
        $fileOrVoice = $message->getAudio() ?: $message->getVoice() ?: $message->getVideo();

        if (!$fileOrVoice) {
            return $this->replyToChat('Отправьте аудио, видео-файл или запись с микрофона чтобы узнать исполнителя');
        }

        $this->replyToChat('Запрос обрабатывается 😜 ...');
        $fileResponse = Request::getFile($fileOrVoice->getRawData());

        if (!$fileResponse->isOk() || !Request::downloadFile($fileResponse->getResult())) {
            return $this->replyToChat('Не удалось получить эту запись для обработки');
        }

        $filePath = $this->getTelegram()->getDownloadPath() . DIRECTORY_SEPARATOR . $fileResponse->getResult()->getFilePath();

        // self
        $requrl = "http://identify-eu-west-1.acrcloud.com";
        $access_key = getenv('_ACCESS_KEY');
        $access_secret = getenv('_ACCESS_SECRET');

        try {
            if (($ffmpegPath = (new ExecutableFinder())->find('ffmpeg', false)) === false) {
                throw new Exception('Ffmpeg is not available');
            }

            $bus = [
                new Processing($ffmpegPath, new File(['tmp_name' => $filePath]), false),
                new Identify($requrl, $access_key, $access_secret),
                fn(string $response) => json_decode($response, false)
            ];

            $result = null;

            foreach ($bus as $entry) {
                $result = $entry($result);
            }

            if ($result->status->code == 0 && isset($result->metadata->music)) { // Recognition succeed
                $output = "Вероятные совпадения:\r\n";

                foreach ($this->hydrate($result) as $ind => $item) {
                    $output .= ($ind + 1) . '. ' . implode($item['artists']) . ' - ' . $item['title'] . "\r\n";
                }

                return $this->replyToChat($output);
            } else {
                return $this->replyToChat('Странно 👀.. ' . $result->status->code . '; ' . $result->status->msg);
            }
        } catch (Exception $exception) {
            return $this->replyToChat($exception->getMessage());
        } finally {
            if (file_exists($filePath)) {
                unlink($filePath);
            }
        }
    }

    /**
     * Развернуть ответ в массив.
     *
     * @param $result
     * @return array
     */
    protected function hydrate($result)
    {
        $items = [];

        foreach ($result->metadata->music ?: [] as $value) {
            $item = [];

            $item['title'] = isset($value->title) ? trim($value->title) : 'Без названия*';
            $item['artists'] = [];

            if (isset($value->artists) && is_array($value->artists)) {
                foreach ($value->artists as $artist) {
                    $item['artists'][] = trim($artist->name);
                }

                $item['artists'] = array_filter($item['artists'], 'mb_strlen');
            }

            $item['album'] = null;

            if (isset($value->album->name) && trim($value->album->name) != '') {
                $item['album'] = trim($value->album->name);
            }

            $item['duration'] = isset($value->duration_ms) ? (int)$value->duration_ms / 1000 : 0;
            $item['released_at'] = 0;

            if (isset($value->release_date)) {
                try {
                    $date = DateTime::createFromFormat('Y-m-d', $value->release_date);
                    $item['released_at'] = $date->getTimestamp();
                } catch (\Exception $exc) {

                }
            }

            $items[] = $item;
        }

        return $items;
    }

}