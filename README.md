# What-That-Song (Что это за песня) - узнать название песни по отрывку

Пэт проект. Веб-приложение (клиент\сервер), с помощью которого
можно по «отрывку» песни узнать исполнителя. Пользователь
паратаскивает аудио или видео файл, выбирает отрезок и запускает "процесс", нажав на кнопку "Узнать песню".

Перекодированный и сжатый в браузере файл, отправляется на бэкенд (PHP+Phacon+FFMpeg) для дальнейшей обработки. Используется база отпечатков ACR-cloud. Ради интереса реализован telegram-бот.

- Веб-приложение: [https://what-that-song.herokuapp.com](https://what-that-song.herokuapp.com)
- Телеграм-бот: [https://t.me/whathatsongbot](https://t.me/whathatsongbot)

## Установка и deploy

Для изучения платформы Heroku, проект сделан для развертывания только на этой платформе, причем только на одном Dyno's.

Вам понадобятся Buildpacks:

- heroku/nodejs
- heroku/php
- https://github.com/jonathanong/heroku-buildpack-ffmpeg-latest.git

Кроме сборки React-приложения (build), устанавливается веб-сервер для PHP, стороннее расширение Phalcon и
набор консольных утилит FFMpeg.

### Требования

- Node.js
- PHP 7.4
- FFMpeg
- Phalcon (php-ext)

### Установка для разработки

- yarn
- composer install

В файле `reactjs-app/constants.ts` изменить адрес до API.

### Переменные окружения

Данные для доступа к базе Acrcloud

- ACRCLOUD_HOST
- ACRCLOUD_ACCESS_KEY
- ACRCLOUD_ACCESS_SECRET

Для работы телеграм бота

- TELEGRAM_BOT_API_KEY

### Запустить приложение для разработки


- yarn start
- php7.4 -S localhost:80 -t php-app/

Для локальной обработки веб-хуков телеграм можно воспользоваться [ngrok](https://ngrok.com/). Адрес домен.ngrok.io/api/webhook.

- ngrok http 80

(не забыть изменить API_BASE на `http://localhost:80`)

Открыть [http://localhost:3000](http://localhost:3000), чтобы просмотреть его в браузере.
Страница перезагрузится, если вы внесете изменения. Вы также увидите любые ошибки в консоли.
