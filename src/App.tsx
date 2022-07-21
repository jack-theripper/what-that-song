import React, {useEffect, useMemo, useRef, useState} from 'react';
import './App.css';
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin, {Region} from 'wavesurfer.js/src/plugin/regions';
import {Button, Container, createStyles, Group, MantineTheme, Text, Title, useMantineTheme} from "@mantine/core";
import landing from './assets/1.jpg';
import {Icon as TablerIcon, Photo, Upload, X} from 'tabler-icons-react';
import {Dropzone, DropzoneStatus} from '@mantine/dropzone';
import {WaveSurferBackend} from "wavesurfer.js/types/backend";

// eslint-disable-next-line
import Worker from 'comlink-loader!./workers/worker.ts';

let wavesurfer: WaveSurfer;
let region: Region;

const useStyles = createStyles((theme) => ({
    wrapper: {
        position: 'relative',
        paddingTop: 120,
        paddingBottom: 80,

        '@media (max-width: 755px)': {
            paddingTop: 80,
            paddingBottom: 60,
        },
    },

    inner: {
        position: 'relative',
        zIndex: 1,
        padding: '10em 5em',
        borderRadius: '5em',
        background: 'url(' + landing + ') no-repeat',
        backgroundPosition: 'center'
    },

    dots: {
        position: 'absolute',
        color: theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[1],

        '@media (max-width: 755px)': {
            display: 'none',
        },
    },

    dotsLeft: {
        left: 0,
        top: 0,
    },

    title: {
        textAlign: 'center',
        fontWeight: 800,
        fontSize: 40,
        letterSpacing: -1,
        color: theme.colorScheme === 'dark' ? theme.white : theme.black,
        marginBottom: theme.spacing.xs,
        fontFamily: `Greycliff CF, ${theme.fontFamily}`,

        '@media (max-width: 520px)': {
            fontSize: 28,
            textAlign: 'left',
        },
    },

    description: {
        textAlign: 'center',

        '@media (max-width: 520px)': {
            textAlign: 'left',
            fontSize: theme.fontSizes.md,
        },
    },

}));

function getIconColor(status: DropzoneStatus, theme: MantineTheme) {
    return status.accepted
        ? theme.colors[theme.primaryColor][theme.colorScheme === 'dark' ? 4 : 6]
        : status.rejected
            ? theme.colors.red[theme.colorScheme === 'dark' ? 4 : 6]
            : theme.colorScheme === 'dark'
                ? theme.colors.dark[0]
                : theme.colors.gray[7];
}

function ImageUploadIcon({
                             status,
                             ...props
                         }: React.ComponentProps<TablerIcon> & { status: DropzoneStatus }) {
    if (status.accepted) {
        return <Upload {...props} />;
    }

    if (status.rejected) {
        return <X {...props} />;
    }

    return <Photo {...props} />;
}

export const dropzoneChildren = (status: DropzoneStatus, theme: MantineTheme) => (
    <Group position="center" spacing="xl" style={{minHeight: 220, pointerEvents: 'none'}}>
        <ImageUploadIcon status={status} style={{color: getIconColor(status, theme)}} size={80}/>

        <div>
            <Text size="xl" inline>
                Drag images here or click to select files
            </Text>
            <Text size="sm" color="dimmed" inline mt={7}>
                Attach as many files as you like, each file should not exceed 5mb
            </Text>
        </div>
    </Group>
);

/**
 * Обработчик изенения размера региона. Ограничивать размер региона в диапазоне {5..15}
 */
const _onResize = function (this: Region, delta: number, direction: string) {
    let start, end;

    if (direction === 'start') {
        start = Math.min(this.start + delta, this.end);
        end = Math.max(this.start + delta, this.end)
    } else {
        start = Math.min(this.end + delta, this.start);
        end = Math.max(this.end + delta, this.start);
    }

    if (end - start > 15 || end - start < 5) {
        this.onDrag(delta);
    } else {
        this.update({start: start, end: end});
    }
}

const _worker = new Worker();

function App() {
    const {classes} = useStyles();
    const theme = useMantineTheme();


    useEffect(() => {
        // _worker.addEventListener('message', (event) => {
        //
        //     console.log(event);
        // });

    }, [])





    const onDropHandler = (files: File[]) => {
        for (let i = 0, file = files[i]; i < files.length; i++) {
            console.log(file);

            wavesurfer.empty();
            wavesurfer.loadBlob(file);

            return;
        }
    }

    /**
     * Загружено ли что-то в буфер и может ли пользователь с ним взаимодействовать
     */
    const [hasReadyBuffer, setReadyBuffer] = useState(false);

    /**
     * Флаг, который сохраняет текущее состояние - воспроизведение/пауза
     */
    const [playing, setPlaying] = useState(false);

    /**
     * Продолжительность загруженного буфера
     */
    const [duration, setDuration] = useState(0.0);

    /**
     * Текущая позиция воспроизведения в секундах
     */
    const [currentTime, setCurrentTime] = useState(0);

    const [encoding, setEncoding] = useState(false);

    /**
     * Воспроизведение/пауза
     */
    const togglePlay = () => wavesurfer.playPause();

    const waveRef = useRef(null);

    const processing = () => {
        setEncoding(true);

        let audioBuffer = (wavesurfer.backend as WaveSurferBackend & {buffer: AudioBuffer}).buffer;
        let sampleRate = audioBuffer.sampleRate;

        let start = region.start * sampleRate;
        let end = region.end * sampleRate;

        let buffers = [], vector, buffer;

        for (let channel = 0, channels = Math.min(2, audioBuffer.numberOfChannels); channel < channels; channel++) {
            buffer = audioBuffer.getChannelData(channel).slice(start, end);
            buffers[channel] = new Int16Array(buffer.length);

            for (let i = 0, length = buffer.length; i < length; ++i) {
                vector = buffer[i] * 0x7fff;
                buffers[channel][i] = vector < 0 ? Math.max(vector, -0x8000) : Math.min(vector, 0x7fff);
            }
        }

        _worker.postMessage('test');

        console.log(buffers);
    };

    /**
     * Инициализация WaveSurfer
     */
    useEffect(() => {

        if (!waveRef.current) {
            return;
        }

        wavesurfer = WaveSurfer.create({
            container: waveRef.current,
            height: 100,
            scrollParent: true,
            waveColor: '#ABB0BC',
            progressColor: '#8668A3',
            plugins: [
                RegionsPlugin.create({
                    dragSelection: false
                })
            ]
        });

        /**
         * Актуализируем состояние свойства 'playing'
         */
        wavesurfer.on('play', () => setPlaying(true));
        wavesurfer.on('pause', () => setPlaying(false));

        /**
         * Обновляем позицию воспроизведения при перемотке и воспроизведении
         */
        wavesurfer.on('seek', () => setCurrentTime(wavesurfer.getCurrentTime()));
        wavesurfer.on('audioprocess', () => setCurrentTime(wavesurfer.getCurrentTime()));

        /**
         * Если загружен новый буфер, необходимо удалить предыдущий регион
         */
        wavesurfer.on('loading', () => wavesurfer.clearRegions());

        /**
         * Заменяем обработчик изменения размера региона, чтобы иметь возможность ограничивать размер области
         */
        wavesurfer.Region.prototype.onResize = _onResize;

        /**
         * В буфер что-то загружено, с этим нужно поработать
         */
        wavesurfer.on('ready', () => {
            setReadyBuffer(true);
            setDuration(wavesurfer.getDuration());

            // Пересоздать регион
            region = wavesurfer.addRegion({
                start: 0,
                end: 15,
                color: 'rgba(114,161,219, 0.2)',
                drag: true,
                resize: Boolean(wavesurfer.getDuration() > 5)
            });

            console.log(region);

            /**
             * Запретить скроллинг во время манипуляций с регионом
             */
            region.on('update', () => wavesurfer.params.scrollParent = false);
            region.on('update-end', () => wavesurfer.params.scrollParent = true);

            // Обновить позицию региона
            // region.on('update-end', () => this.region = {start: region.start, end: region.end});
            // this.region = {start: region.start, end: region.end};

            /**
             * Воспроизвести фрагмент по двойному клику
             */
            region.on('dblclick', () => region.play()/*wavesurfer.play(region.start, region.end)*/);

            wavesurfer.play();


        });


    }, [waveRef]);

    return (
        <Container className={classes.wrapper} size={1400}>

            <div className={classes.inner}>
                <Title className={classes.title}>
                    Узнать название песни {' '}
                    <Text component="span" color={theme.primaryColor} inherit>
                        по отрывку
                    </Text>
                </Title>

                <Container p={0} size={600}>
                    <Text size="lg" color="dimmed" className={classes.description}>
                        Сколько раз вы сталкивались с ситуацией, когда по радио или в видео на YouTube слышали классную
                        песню,
                        но не знали кто ее поет, и никто в комментариях не смог сказать ее название?
                    </Text>
                </Container>
            </div>

            <Dropzone
                onDrop={onDropHandler}
                onReject={(files) => console.log('rejected files', files)}
                accept={['audio/*', 'video/*']}
            >
                {(status) => dropzoneChildren(status, theme)}
            </Dropzone>

            <p>{currentTime} / {duration}</p>

            <div className={` ${!hasReadyBuffer ? 'hidden-wave' : ''} `} ref={waveRef}></div>

            {hasReadyBuffer && (
                <div>

                    <Button onClick={togglePlay}>{playing ? 'Пауза' : 'Играть'}</Button>
                    <Button onClick={processing}>{encoding ? 'Обрабатывается' : 'Начать обработку'}</Button>


                </div>
            )}

        </Container>
    );
}

export default App;
