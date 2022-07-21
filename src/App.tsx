import React, {useEffect, useRef, useState} from 'react';
import './App.css';
import WaveSurfer from "wavesurfer.js";
import Region from 'wavesurfer.js/src/plugin/regions';
import {Button, Container, createStyles, Group, MantineTheme, Text, Title, useMantineTheme} from "@mantine/core";
import landing from './assets/1.jpg';
import {Icon as TablerIcon, Photo, Upload, X} from 'tabler-icons-react';
import {Dropzone, DropzoneStatus} from '@mantine/dropzone';


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
    <Group position="center" spacing="xl" style={{ minHeight: 220, pointerEvents: 'none' }}>
        <ImageUploadIcon status={status} style={{ color: getIconColor(status, theme) }} size={80} />

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

function App() {
    const { classes } = useStyles();
    const theme = useMantineTheme();

    const onDropHandler = (files: File[]) => {
        for (let i = 0, file = files[i]; i < files.length;  i++) {
            console.log(file);

            wavesurfer.empty();
            wavesurfer.loadBlob(file);

            return;
        }
    }

    const [hasReadyBuffer, setReadyBuffer] = useState(false);
    const [playing, setPlaying] = useState(false);

    const togglePlay = () => wavesurfer.playPause(); // Воспроизведение/пауза

    const waveRef = useRef(null);

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
                Region.create({
                    dragSelection: false
                })
            ]
        });

        /**
         * В буфер что-то загружено, с этим нужно поработать
         */
        wavesurfer.on('ready', () => {
            setReadyBuffer(true);


        });


    });

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
                        Сколько раз вы сталкивались с ситуацией, когда по радио или в видео на YouTube слышали классную песню,
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

            <div ref={waveRef}></div>

            {hasReadyBuffer && (
                <div>


                    <Button onClick={togglePlay}>{playing ? 'Пауза' : 'Играть'}</Button>


                </div>
            )}

        </Container>
    );
}

export default App;
