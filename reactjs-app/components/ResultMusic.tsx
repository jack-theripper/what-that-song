import React, {useMemo} from 'react';
import {TMusic} from "../types";

interface ResultMusicProps {
    item: TMusic;
}

const ResultMusic: React.FC<ResultMusicProps> = ({item}) => {

    const artist = useMemo<string>(() => item.artists.map(artist => artist.name).join(', '), [item.artists]);

    return (
        <div>
            <h3>{artist.length > 0 && `${artist} - `}{item.title} (совпадение {item.score}%)</h3>
            <ul>
                <li>Альбом: {item.album?.name}</li>
                <li>Жанры: {item.genres?.map(genre => (<span key={genre.name}>{genre.name}</span>))}</li>
                <li>Лэйбл: {item.label}</li>
                <li>Дата релиза: {item.release_date}</li>

                {item.external_metadata && Object.keys(item.external_metadata).map(externalId => (
                    (externalId === 'youtube') && (<li key={externalId}>https://www.youtube.com/watch?v={item.external_metadata?.youtube?.vid}</li>)
                ))}

                {item.external_metadata?.spotify && (
                    <li>https://open.spotify.com/track/{item.external_metadata.spotify.track.id}</li>
                )}

                {item.external_metadata?.musicbrainz && (
                    item.external_metadata.musicbrainz.map(item => (
                        <li>https://musicbrainz.org/recording/{item.track.id}</li>
                    ))
                )}



            </ul>


        </div>
    );
};

export default ResultMusic;