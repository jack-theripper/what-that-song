<?php

namespace Arhitector\WhatThatSong;

use GuzzleHttp\Client;
use GuzzleHttp\ClientInterface;
use GuzzleHttp\RequestOptions;

/**
 * Генерирует сигнатуру и выполняет запросы к acr-cloud.
 */
class Identify
{

    /**
     * @var ClientInterface HTTP-клиент.
     */
    protected ClientInterface $client;

    /**
     * @var string Ключ
     */
    protected string $accessKey;

    /**
     * @var string Секрет
     */
    protected string $accessSecret;

    /**
     * Генерирует сигнатуру и выполняет запросы к acr-cloud.
     */
    public function __construct(string $baseUri, string $accessKey, string $accessSecret)
    {
        if (trim($accessKey) == '' || trim($accessSecret) == '') {
            throw new \InvalidArgumentException('The value of accessKey or accessSecret cannot be empty');
        }

        $this->accessKey = $accessKey;
        $this->accessSecret = $accessSecret;

        $this->client = new Client([
            RequestOptions::HTTP_ERRORS => false,
            RequestOptions::VERIFY => false,
            'base_uri' => $baseUri
        ]);
    }

    /**
     * Возвращет сконфигурируемый HTTP-клиент.
     *
     * @return ClientInterface
     */
    public function getClient()
    {
        return $this->client;
    }

    /**
     * @return string
     */
    public function getAccessKey(): string
    {
        return $this->accessKey;
    }

    /**
     * @return string
     */
    public function getAccessSecret(): string
    {
        return $this->accessSecret;
    }

    /**
     * @return string Возвращает ответ с результатами.
     */
    public function __invoke(string $output): string
    {
        $timestamp = time();
        $signature = implode("\n", ['POST', '/v1/identify', $this->getAccessKey(), 'audio', 1, $timestamp]);
        $response = $this->getClient()->post('/v1/identify', [
            RequestOptions::FORM_PARAMS => [
                'access_key'        => $this->getAccessKey(),
                'data_type'         => 'audio',
                'sample'            => base64_encode($output),
                'sample_bytes'      => strlen($output),
                'signature_version' => 1,
                'signature'         => base64_encode(hash_hmac('sha1', $signature, $this->getAccessSecret(), true)),
                'timestamp'         => $timestamp,
                'audio_format'      => 'mp3'
            ]
        ]);

        return (string) $response->getBody();
    }

}