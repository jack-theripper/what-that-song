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
        [key: string]: string;
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
        id: number;
    };
    artists: Array<{ id: number }>;
    album: {
        id: number;
    };
};

export type TMetadataSpotify = {
    track: {
        id: string;
    };
    artists: Array<{ id: string; }>;
    album: {
        id: string;
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

/*

  
          


            release_by_territories: [{territories: [DK], release_date: 2006-04-17}, {territories: [JP], release_date: 2006-10-17}, {territories: [SE], release_date: 2005-06-21}, {territories: [BG, AL, BA, CZ, EE, HR, HU, LT, LV, MK, ME, PL, RO, RS, SI, SK, UA], release_date: 2006-03-24}, {territories: [GB, IE, NZ], release_date: 2005-07-18}, {territories: [FR], release_date: 2005-07-26}]

        }

}*/
