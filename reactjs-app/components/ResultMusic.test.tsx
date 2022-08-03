import ResultMusic from "./ResultMusic";
import renderer from 'react-test-renderer';

const value = {
    "acrid": "b5f885d01752738bdec0a3b4077dcb23",
    "external_ids": {
        "isrc": "RUA3R2141382",
        "upc": "7422400001020"
    },
    "artists": [
        {
            "name": "LAZZY2WICE"
        }
    ],
    "result_from": 1,
    "title": "Do You Pray?",
    "play_offset_ms": 14580,
    "score": 100,
    "label": "MERLIN - LazzyMusic",
    "external_metadata": {
        "deezer": {
            "artists": [
                {
                    "name": "LAZZY2WICE"
                }
            ],
            "album": {
                "name": "The Blind Victim"
            },
            "track": {
                "name": "Do You Pray?",
                "id": "1825985157"
            }
        }
    },
    "album": {
        "name": "The Blind Victim"
    },
    "duration_ms": 122000,
    "release_date": "2022-07-15"
};

describe('ResultMusic component', () => {

    test('it rendering', () => {
        const component = renderer.create(<ResultMusic item={value}/>);
        const tree = component.toJSON();

        expect(tree).toMatchSnapshot();
    });

})