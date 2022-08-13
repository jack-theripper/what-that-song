<?php

namespace Arhitector\WhatThatSong;

use Phalcon\Http\Request\File;
use Symfony\Component\Process\Process;

/**
 * Перекодирвоание полученного отрывка
 */
class Processing
{

    /**
     * @var string Путь до исполняемого файла `ffmpeg`
     */
    protected string $ffmpegPath;

    /**
     * @var File Полученный файл
     */
    protected File $file;

    /**
     * @var bool Проверять формат если пришли "сырые" данные?
     */
    protected bool $checkMp3;

    /**
     * Перекодирвоание полученного отрывка
     *
     * @param string $ffmpegPath Путь до исполняемого файла `ffmpeg`
     * @param File $file Полученный файл
     * @param bool $checkMp3
     */
    public function __construct(string $ffmpegPath, File $file, bool $checkMp3 = true)
    {
        $this->ffmpegPath = $ffmpegPath;
        $this->file = $file;
        $this->checkMp3 = $checkMp3;
    }

    /**
     * Возвращает путь до исполняемого файла `ffmpeg`.
     *
     * @return string
     */
    public function getFfmpegPath(): string
    {
        return $this->ffmpegPath;
    }

    /**
     * Возвращает полученный файл.
     *
     * @return File
     */
    public function getFile(): File
    {
        return $this->file;
    }

    /**
     * Выполняет перекодирование и возвращает новые данные в виде строки.
     *
     * @return string
     */
    public function __invoke(): string
    {
        if ($this->checkMp3) {
            $handle = fopen($this->getFile()->getTempName(), 'rb');

            if (!$handle || !$this->checkBytes(fread($handle, 3))) {
                fclose($handle);
                throw new \RuntimeException('Wrong data');
            }

            fclose($handle);
        }

        $process = new Process([$this->getFfmpegPath(), '-y', '-i', $this->getFile()->getTempName(), '-ss', 0, '-t', 15, '-f', 'mp3', '-ar', 44100, '-']);
        $process->setTimeout(30);

        try {
            $process->mustRun();
        } catch (\Exception $exception) {
            throw new \RuntimeException($exception->getMessage(), $exception->getCode(), $exception);
        }

        return $process->getOutput();
    }

    /**
     * Функция проверки, что пришли нужные данные т.е конвертированный pcm в lame
     *
     * @param $rawBytes
     * @return bool
     */
    protected function checkBytes($rawBytes): bool
    {
        if ($rawBytes !== 'ID3') {
            $bytes[0] = ord($rawBytes[0]);
            $bytes[1] = ord($rawBytes[1]);

            if (($bytes[0] & 0xFF) != 0xFF || (($bytes[1] >> 5) & 0b111) != 0b111) {
                return false;
            }
        }

        return true;
    }

}