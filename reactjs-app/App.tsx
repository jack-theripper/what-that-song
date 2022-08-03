import React, {useCallback, useEffect, useReducer, useRef, useState} from 'react';
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin, {Region} from 'wavesurfer.js/src/plugin/regions';
import {AppShell, Button, Container, Group, Paper, Text, Title, useMantineTheme} from "@mantine/core";
import {Cut, PlayerPause, PlayerPlay} from 'tabler-icons-react';
import {WaveSurferBackend} from "wavesurfer.js/types/backend";
import {useMainStyles} from "./styles/classes";
import {resizeHandler} from "./utils/resize-handler";
import {TMusic, TWorkerMessage} from "./types";
import {resetNavigationProgress, setNavigationProgress} from "@mantine/nprogress";
import {formattingTime} from "./utils/formatting-time";
import worker from './workers';

import ResultMusic from "./components/ResultMusic";
import SelectFileComponent from "./components/SelectFileComponent";
import RecognizeService from "./services/RecognizeService";

let wavesurfer: WaveSurfer;
let region: Region;

interface PromiseRecognizeT {
    success: boolean;
    payload: TMusic[];
}

const App: React.FC = () => {

    const {classes} = useMainStyles();
    const theme = useMantineTheme();

    const waveRef = useRef(null);

    const [items, setItems] = useState<Array<TMusic>>([]);
    const [hasReadyBuffer, setReadyBuffer] = useState(false);
    const [playing, setPlaying] = useState(false);
    const [duration, setDuration] = useState(0.0);
    const [currentTime, setCurrentTime] = useState(0);
    const [operation, setOperation] = useState<string | null>(null);

    const [isManualSelect, toggleManualSelectFile] = useReducer(state => !state, false);

    /**
     * Воспроизведение/пауза
     */
    const togglePlay = () => wavesurfer.playPause();

    /**
     * Обработчик при выборе файла.
     *
     * @param files
     */
    const dropHandler = (files: File[]) => {
        if (files.length < 1) {
            return;
        }

        setOperation('demuxing');
        wavesurfer.empty();
        wavesurfer.loadBlob(files[0]);
    }

    /**
     * Вырезать отрезок файла и передать его в воркер для перекодирования pcm в mpeg
     */
    const processing = useCallback(() => {
        setOperation('encoding');

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

    }, [wavesurfer]);

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

        wavesurfer.on('play', () => setPlaying(true));
        wavesurfer.on('pause', () => setPlaying(false));
        wavesurfer.on('seek', () => setCurrentTime(wavesurfer.getCurrentTime()));
        wavesurfer.on('audioprocess', () => setCurrentTime(wavesurfer.getCurrentTime()));
        wavesurfer.on('loading', () => wavesurfer.clearRegions());
        wavesurfer.Region.prototype.onResize = resizeHandler;
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
            region.on('dblclick', () => wavesurfer.play(region.start, region.end));

        });

    }, [waveRef]);

    /**
     * Обработчик для чтения сообщений воркера
     */
    useEffect(() => {

        worker.addEventListener('message', async (event: MessageEvent<TWorkerMessage>) => {

            if (event.data.action === "progress") {
                return setNavigationProgress(event.data.payload);
            }

            if (event.data.action === 'processed') {
                resetNavigationProgress();
                setOperation('sending');

                const buffer = (wavesurfer.backend as WaveSurferBackend & { buffer: AudioBuffer }).buffer;

                RecognizeService.fetchResults(event.data.payload, buffer.numberOfChannels, buffer.sampleRate)
                    .then(result => setItems(result.payload))
                    .catch(message => alert(message))
                    .finally(() => setOperation(null));

            }

        })

    }, []);

    return (
        <>

            <SelectFileComponent showSelect={isManualSelect} onDrop={dropHandler} onReject={() => null}/>

            <AppShell padding="md" fixed>
                <Container className={classes.wrapper} size={1400}>
                    <div className={classes.inner}>
                        <Title className={classes.title}>
                            Узнать название песни {' '}<Text component="span" color={theme.primaryColor} inherit>по
                            отрывку</Text>
                        </Title>
                        <Container p={'2em'} size={600}>
                            <Text size="lg" className={classes.description}>
                                Сколько раз вы сталкивались с ситуацией, когда по радио или в видео на YouTube слышали
                                классную песню, но не знали кто ее поет, и никто в комментариях не смог сказать ее
                                название?
                            </Text>
                        </Container>
                        <Group align={'center'} mb={'xl'}>
                            <Button size={'lg'} onClick={toggleManualSelectFile}>Выберите
                                файл</Button>
                            <p>или перетащите его мышкой</p>
                        </Group>

                        <div ref={waveRef}></div>

                        {items.length > 0 && (<div>
                            {items.map(item => <ResultMusic key={item.acrid} item={item}/>)}
                        </div>)}
                    </div>

                </Container>

                <div className={classes.stickypane} style={{display: hasReadyBuffer ? 'block' : 'none'}}>
                    <div className={classes.stickyblock}>
                        <Paper radius={'xl'} p={"xs"} pl={'xl'} pr={'xl'} withBorder>
                            <Group>
                                <Button onClick={togglePlay} leftIcon={playing ? <PlayerPause/> : <PlayerPlay/>} variant="white">
                                    {playing ? 'Пауза' : 'Играть'}
                                </Button>
                                <Button onClick={processing}
                                        loading={operation === 'encoding' || operation === 'sending'}
                                        leftIcon={<Cut/>} variant={'white'}>
                                    {operation === 'encoding' ? 'Обрабатывается' : 'Узнать навание?'}
                                </Button>
                                <span>{formattingTime(currentTime)}/{formattingTime(duration)}</span>
                            </Group>
                        </Paper>
                    </div>
                </div>

            </AppShell>
        </>
    );
};

export default App;
