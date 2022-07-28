import React, {useCallback, useEffect, useRef, useState} from 'react';
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin, {Region} from 'wavesurfer.js/src/plugin/regions';
import {AppShell, Button, Container, Grid, Group, Paper, Progress, Text, Title, useMantineTheme} from "@mantine/core";
import landing from './assets/full-background.jpg';
import {Cut, Music, PlayerPlay, Upload, X} from 'tabler-icons-react';
import {WaveSurferBackend} from "wavesurfer.js/types/backend";
import {useMainStyles} from "./styles/main-styles";
import {resizeHandler} from "./utils/resize-handler";
import {Dropzone} from "@mantine/dropzone";
import {TMusic} from "./types";
import {resetNavigationProgress, setNavigationProgress} from "@mantine/nprogress";

let wavesurfer: WaveSurfer;
let region: Region;

interface PromiseRecognizeT {
    success: boolean;
    payload: TMusic[];
}

const worker = new Worker(new URL('./workers/mp3encoder.js', import.meta.url));

function App() {
    const {classes} = useMainStyles();
    const theme = useMantineTheme();


    const [items, setItems] = useState<Array<TMusic>>([]);

    /**
     * Обработчик для чтения сообщений воркера
     */
    useEffect(() => {

        worker.addEventListener('message', async (event) => {

            if (event.data.action !== 'processed') {
                console.log(event.data.value.toFixed(2));
                setNavigationProgress(event.data.value.toFixed(2));

                return ;
            }

            resetNavigationProgress();
            setOperation(null);

            const data = new FormData();
            const buffer = (wavesurfer.backend as WaveSurferBackend & { buffer: AudioBuffer }).buffer;

            data.append('file', new Blob(event.data.result), 'ly');
            data.append('channels', `${buffer.numberOfChannels}`); // typescript добавляет говнокода
            data.append('sampleRate', `${buffer.sampleRate}`);

            setOperation('sending');

            try {
                const response = await fetch('/api/recognize', {method: 'POST', body: data});
                const result: PromiseRecognizeT = await response.json();

                if (result.success) {
                    setItems(result.payload);
                }
            } catch (e) {
                alert(e);
            } finally {
                setOperation(null);
            }
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

    /**
     * Для отслеживания прогресса преобразований
     */
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
        setOperation('encoding');

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
            waveColor: '#9a9a9a',
            progressColor: '#228be6',
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
        wavesurfer.on('loading', complete => setNavigationProgress(complete));

        /**
         * В буфер что-то загружено, с этим нужно поработать
         */
        wavesurfer.on('ready', () => {
            setOperation(null);
            setReadyBuffer(true);
            setDuration(wavesurfer.getDuration());
            resetNavigationProgress();

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

    const openRef = useRef<() => void>(null);

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
                    <Container p={'2em'} size={600}>
                        <Text size="lg" className={classes.description}>
                            Сколько раз вы сталкивались с ситуацией, когда по радио или в видео на YouTube слышали
                            классную песню, но не знали кто ее поет, и никто в комментариях не смог сказать ее название?
                        </Text>
                    </Container>
                    <Group align={'center'} style={{justifyContent: "center"}}>
                        <Button size={'lg'} onClick={() => openRef.current && openRef.current()}>Выберите файл</Button>
                        <p>или перетащите его мышкой</p>
                    </Group>
                </div>

                <div >

                    <div ref={waveRef}></div>

                </div>

                <Dropzone.FullScreen openRef={openRef}
                    active={true}
                    accept={['audio/*', 'video/*']}
                    onDrop={onDropHandler}
                                     onReject={(files) => console.log('rejected files', files)}
                >
                    <Group position="center" spacing="xl" style={{ minHeight: 220, pointerEvents: 'none' }}>
                        <Dropzone.Accept>
                            <Upload
                                size={50}
                                color={theme.colors[theme.primaryColor][theme.colorScheme === 'dark' ? 4 : 6]}
                            />
                        </Dropzone.Accept>
                        <Dropzone.Reject>
                            <X
                                size={50}
                                color={theme.colors.red[theme.colorScheme === 'dark' ? 4 : 6]}
                            />
                        </Dropzone.Reject>
                        <Dropzone.Idle>
                            <Music size={50}  />
                        </Dropzone.Idle>

                        <div>
                            <Text size="xl" inline>
                                Выберите аудио или видео отрезок,
                            </Text>
                            <Text size="sm" color="dimmed" inline mt={7}>
                                отметьте фрагмент и найдите название композиции!
                            </Text>
                        </div>
                    </Group>
                </Dropzone.FullScreen>

            </Container>

            <div style={{
                position: 'fixed',
                zIndex: 10,
                bottom: '20px',
                left: 0,
                right: 0,
                textAlign: "center",
                display: !hasReadyBuffer ? 'none' : 'block'
            }}>
                <div style={{display: "inline-block"}}>
                    <Paper radius={'xl'} p={"xs"} pl={'xl'} pr={'xl'} withBorder>
                        <Group style={{justifyContent: 'center'}}>
                            <Button onClick={togglePlay} leftIcon={<PlayerPlay/>} variant="white">
                                {playing ? 'Пауза' : 'Играть'}
                            </Button>
                            <Button onClick={processing} loading={operation === 'encoding' || operation === 'sending'}
                                    leftIcon={<Cut/>} variant={'white'}>
                                {operation === 'encoding' ? 'Обрабатывается' : 'Узнать навание?'}
                            </Button>

                            <span style={{maxWidth: '2em', overflow: 'hidden'}}>
                                {currentTime}/{duration}
                            </span>
                        </Group>
                    </Paper>
                </div>
            </div>

        </AppShell>
    );
}

export default App;
