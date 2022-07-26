/**
 * Worker Messages
 */
export type TWorkerMessage = TWorkerMessageProgress | TWorkerMessageProcess;

export type TWorkerMessageProgress = {
    action: 'progress';
    payload: number;
}

export type TWorkerMessageProcess = {
    action: 'processed';
    payload: BlobPart[];
}

/**
 * Music fields
 */
export type TMusic = {

    /**
     * ACRCloud unique identifier
     */
    acrid: string;

    /**
     * External standard code
     */
    external_ids?: {

        /**
         * ISRC/UPC code etc.
         */
        [key: string]: string | undefined;
    };

    /**
     * Track title
     */
    title: string;

    /**
     * Match confidence score. Range: 70 - 100
     */
    score: number;

    /**
     * Album fields
     */
    album: TAlbum;

    /**
     * Artists fields
     */
    artists: TArtist[];

    /**
     * Genres fields
     */
    genres?: TGenre[];

    /**
     * Music label name
     */
    label?: string;

    /**
     * Duration of the track in millisecond
     */
    duration_ms?: number;

    /**
     * Release data of the track, format:YYYY-MM-DD
     */
    release_date?: string;

    /**
     * External 3rd party IDs and metadata
     */
    external_metadata?: TExternalMetadata;

    /**
     * Lyrics related metadata
     */
    lyrics?: {
        [key: string]: any;
    };

};

export type TLang = {
    code: string;
    name: string;
};

export type TAlbum = {
    name: string;
    langs?: TLang[];
};

export type TArtist = {
    name: string;
    langs?: TLang[];
};

export type TGenre = {
    name: string;
};

/**
 * External 3rd party IDs and metadata
 */
export type TExternalMetadata = {
    youtube?: TMetadataYoutube;
    musicbrainz?: TMetadataMusicbrainz[];
    deezer?: TMetadataDeezer;
    spotify?: TMetadataSpotify;
    musicstory?: TMetadataMusicstory;
}

export type TMetadataYoutube = {
    vid: string;
};

export type TMetadataMusicbrainz = {
    track: {
        id: string;
    };
};

export type TMetadataDeezer = {
    track: {
        id: string;
        name: string;
    };
    artists: Array<{ id?: number; name: string; }>;
    album: {
        id?: number;
        name: string;
    };
};

export type TMetadataSpotify = {
    track: {
        id: string;
        name?: string;
    };
    artists: Array<{ id?: string; name: string; }>;
    album: {
        id?: string;
        name: string;
    };
};

export type TMetadataMusicstory = {
    track: {
        id: number;
    };
    album: {
        id: number;
    };
};