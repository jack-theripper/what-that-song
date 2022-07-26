import {createStyles} from "@mantine/core";

export const useMainStyles = createStyles((theme) => ({
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
        background: 'rgba(255,255,255, 0.8)',
        '.mantine-Group-root': {
            justifyContent: 'center'
        },
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
    stickypane: {
        position: 'fixed',
        zIndex: 10,
        bottom: '20px',
        left: 0,
        right: 0,
        textAlign: "center",
        display: 'none'
    },
    stickyblock: {
        display: "inline-block",
        '.mantine-Group-root': {
            justifyContent: 'center'
        },
        'span': {
            maxWidth: '10em',
            overflow: 'hidden'
        }
    }

}));