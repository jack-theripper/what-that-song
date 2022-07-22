import React, {useCallback, useEffect, useRef, useState} from 'react';
import './App.css';
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin, {Region} from 'wavesurfer.js/src/plugin/regions';
import {
    AppShell,
    Button,
    Container,
    Group,
    MantineTheme,
    Paper,
    Progress,
    Text,
    Title,
    useMantineTheme
} from "@mantine/core";
import landing from './assets/1.jpg';
import {Icon as TablerIcon, Music, Upload, X} from 'tabler-icons-react';
import {Dropzone, DropzoneStatus} from '@mantine/dropzone';
import {WaveSurferBackend} from "wavesurfer.js/types/backend";
import {useMainStyles} from "./styles/main-styles";
import {resizeHandler} from "./utils/resize-handler";

let wavesurfer: WaveSurfer;
let region: Region;

interface ArtistT {
    name: string;
}

interface GenreT {
    name: string;
}

interface AlbumT {
    name: string;
}

interface MusicT {
    title: string;
    artists: ArtistT[];
    genres: GenreT[];
    album: AlbumT;
    duration_ms: number;
    release_date: string;
    score: number;
    label: string;
}


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

    return <Music {...props} />;
}

export const dropzoneChildren = (status: DropzoneStatus, theme: MantineTheme) => (
    <Group position="center" spacing="xl" style={{pointerEvents: 'none'}}>
        <ImageUploadIcon status={status} style={{color: getIconColor(status, theme)}} size={80}/>

        <div>
            <Text size="xl" inline>
                Выберите аудио или видео отрезок,
            </Text>
            <Text size="sm" color="dimmed" inline mt={7}>
                отметьте фрагмент и найдите название композиции!
            </Text>
        </div>
    </Group>
);

const worker = new Worker(new URL('./workers/mp3encoder.js', import.meta.url));

function App() {
    const {classes} = useMainStyles();
    const theme = useMantineTheme();


    const [items, setItems] = useState([]);

    useEffect(() => {

        worker.addEventListener('message', (event) => {

            console.log(event.data.result);

            const data = new FormData();

            data.append('file', new Blob(event.data.result), 'ly');
            data.append('channels', 'wavesurfer.numberOfChannels');
            data.append('sampleRate', 'buffer.sampleRate');

            fetch('http://localhost:80/api/recognize', {
                method: 'POST',
                body: data
            }).then(r => r.json())
                .then(result => {
                    if (result.success) {
                        setItems(result.payload)
                    }
                });

        })

    }, [worker])


    const onDropHandler = (files: File[]) => {
        for (let i = 0, file = files[i]; i < files.length; i++) {
            console.log(file);

            setOperation('demuxing');
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


    const [progress, setProgress] = useState(0);
    const [operation, setOperation] = useState<string | null>(null);

    /**
     * Воспроизведение/пауза
     */
    const togglePlay = () => wavesurfer.playPause();

    const waveRef = useRef(null);

    /**
     * Вырезать отрезок файла и передать его в воркер для перекодирования pcm в mpeg
     */
    const processing = useCallback(() => {
        setEncoding(true);

        // Косяк при типизации. На самом деле там есть AudioBuffer
        let audioBuffer = (wavesurfer.backend as WaveSurferBackend & { buffer: AudioBuffer }).buffer;
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

        worker.postMessage({action: 'process', buffers, sampleRate: audioBuffer.sampleRate});

    }, [wavesurfer, worker]);

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
        wavesurfer.Region.prototype.onResize = resizeHandler;

        /**
         * Прогресс обработки
         */
        wavesurfer.on('loading', complete => setProgress(complete));

        /**
         * В буфер что-то загружено, с этим нужно поработать
         */
        wavesurfer.on('ready', () => {
            setProgress(100);
            setOperation(null);
            setReadyBuffer(true);
            setDuration(wavesurfer.getDuration());

            /**
             * Пересоздать регион
             */
            region = wavesurfer.addRegion({
                start: 0,
                end: 15,
                color: 'rgba(114,161,219, 0.2)',
                drag: true,
                resize: Boolean(wavesurfer.getDuration() > 5)
            });

            /**
             * Запретить скроллинг во время манипуляций с регионом
             */
            region.on('update', () => wavesurfer.params.scrollParent = false);
            region.on('update-end', () => wavesurfer.params.scrollParent = true);

            /**
             * Воспроизвести фрагмент по двойному клику
             */
            region.on('dblclick', () => region.play()/*wavesurfer.play(region.start, region.end)*/);

        });

    }, [waveRef]);

    return (

        <AppShell padding="md" fixed={true} styles={(theme) => ({
            root: {
                background: `url(${landing}) no-repeat`,
                backgroundSize: 'cover',
                backgroundAttachment: 'fixed'
            },
        })}
        >

            <Container className={classes.wrapper} size={1400}>
                <div className={classes.inner}>
                    <Title className={classes.title}>
                        Узнать название песни {' '}<Text component="span" color={theme.primaryColor} inherit>по
                        отрывку</Text>
                    </Title>
                    <Container p={0} size={600}>
                        <Text size="lg" color="dimmed" className={classes.description}>
                            Сколько раз вы сталкивались с ситуацией, когда по радио или в видео на YouTube слышали
                            классную песню, но не знали кто ее поет, и никто в комментариях не смог сказать ее название?
                        </Text>
                    </Container>

                    <Dropzone onDrop={onDropHandler} mt={'1em'}
                              accept={['audio/*', 'video/*']}
                              onReject={(files) => console.log('rejected files', files)}
                    >
                        {(status) => (dropzoneChildren(status, theme))}
                    </Dropzone>
                </div>

                {(operation == 'demuxing' && progress < 100) && <Progress value={progress}/>}

                <Paper p={'1em'} mt={'2em'} style={{display: (!hasReadyBuffer ? 'none' : 'block')}}>
                    <p>Играет: {currentTime}, продолжительность {duration}</p>
                    <div ref={waveRef}></div>
                    <Group mt={'1em'}>
                        <Button onClick={togglePlay} variant={'light'}>{playing ? 'Пауза' : 'Играть'}</Button>
                        <Button onClick={processing}
                                variant={'outline'}>{encoding ? 'Обрабатывается' : 'Узнать навание?'}</Button>
                    </Group>
                </Paper>

                {items.length > 0 &&

                    items.map((item: MusicT) => (<div>

                        {item.artists.map((artist) => (<span>{artist.name}</span>))} - {item.title}
                        <span>{item.label}, {item.release_date}</span>

                    </div>))
                }


            </Container>

        </AppShell>
    );
}

export default App;
