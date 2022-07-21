/* eslint-disable no-restricted-globals */
import lamejs from 'lamejs'

self.onmessage = (event) => {

    if (typeof event.data.buffers !== 'object' || typeof event.data.sampleRate === 'undefined') {
        return false;
    }

    let buffers = event.data.buffers, // вырезанный raw-кусочек, соответствует количеству каналов
        encoder = new lamejs.Mp3Encoder(buffers.length, parseInt(event.data.sampleRate), 128),
        samples = [],
        chunks = [],
        buffer;

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