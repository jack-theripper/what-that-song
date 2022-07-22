/* eslint-disable no-restricted-globals */
import lamejs from 'lamejs'

self.onmessage = (event) => {

    // Обязательно передавать sample rate чтобы не испортить дорожку!
    // В разных браузерах частота может различаться, где-то 48000, в другом 44100
    if (typeof event.data.buffers !== 'object' || typeof event.data.sampleRate === 'undefined') {
        return false;
    }

    let buffers = event.data.buffers, // вырезанный pcm-кусочек, соответствует количеству каналов
        encoder = new lamejs.Mp3Encoder(buffers.length, parseInt(event.data.sampleRate), 128),
        samples = [],
        chunks = [],
        buffer;

    // Большое спасибо человеку за библиотеку lamejs
    // Нарезаем каналы блоками по 1152 и перекодируем. Уже не помню почему 1152, этот обработчик я написал в 2017.
    for (let i = 0, length = buffers[0].length; i < length; i += 1152) {
        for (let channel = 0, channels = buffers.length; channel < channels; channel++) {
            samples[channel] = buffers[channel].slice(i, i + 1152);
        }

        buffer = encoder.encodeBuffer.apply(null, samples);

        if (buffer.length > 0) {
            chunks.push(buffer);
        }


    }

    buffer = encoder.flush();

    if (buffer.length > 0) {
        chunks.push(buffer);
    }

    postMessage({action: 'processed', result: chunks}); // отправляем перекодированные в mp3 чанки
};