import React, {useEffect, useRef} from 'react';
import {Group, Text, useMantineTheme} from "@mantine/core";
import {Dropzone} from "@mantine/dropzone";
import {Music, Upload, X} from "tabler-icons-react";
import {FileRejection} from "react-dropzone";

interface SelectFileComponentProps {
    showSelect: any;
    onDrop(files: File[]): void;
    onReject(fileRejections: FileRejection[]): void;
}

const SelectFileComponent: React.FC<SelectFileComponentProps> = ({showSelect, onDrop, onReject}) => {

    const theme = useMantineTheme();
    const ref = useRef<() => void>(null);

    useEffect(() => {
        if (ref.current) ref.current()
    }, [showSelect]);

    return (
        <Dropzone.FullScreen openRef={ref} accept={['audio/*', 'video/*']} onDrop={onDrop} onReject={onReject} active>
            <Group position="center" spacing="xl" style={{minHeight: 220, pointerEvents: 'none'}}>
                <Dropzone.Accept>
                    <Upload size={50} color={theme.colors[theme.primaryColor][6]}/>
                </Dropzone.Accept>
                <Dropzone.Reject>
                    <X size={50} color={theme.colors.red[6]}/>
                </Dropzone.Reject>
                <Dropzone.Idle>
                    <Music size={50}/>
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
    );
};

export default SelectFileComponent;