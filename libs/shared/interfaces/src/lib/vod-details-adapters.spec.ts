import {
    normalizeXtreamVod,
    normalizeStalkerVod,
    normalizeVodDetails,
    createXtreamVodItem,
    createStalkerVodItem,
    getVodId,
    getVodNumericId,
} from './vod-details-adapters';
import { XtreamVodDetails } from './xtream-vod-details.interface';
import { StalkerVodDetails } from './stalker-vod-details.interface';

function makeXtreamDetails(
    overrides: Partial<XtreamVodDetails> = {}
): XtreamVodDetails {
    return {
        info: {
            kinopoisk_url: '',
            tmdb_id: 0,
            name: 'Xtream Movie',
            o_name: '',
            cover_big: 'http://img/cover.jpg',
            movie_image: 'http://img/movie.jpg',
            releasedate: '2023-06-15',
            episode_run_time: 0,
            youtube_trailer: 'abc123',
            director: 'Director',
            actors: 'Actor A',
            cast: 'Actor B',
            description: 'A movie',
            plot: 'A plot',
            age: '',
            mpaa_rating: '',
            rating_count_kinopoisk: 0,
            country: 'US',
            genre: 'Drama',
            backdrop_path: ['http://img/backdrop.jpg'],
            duration_secs: 5400,
            duration: '1:30',
            video: [],
            audio: [],
            bitrate: 0,
            rating: 7.5,
            rating_kinopoisk: '7.0',
            rating_imdb: '8.0',
        },
        movie_data: {
            stream_id: 42,
            name: 'Xtream Movie',
            added: '',
            category_id: '',
            container_extension: 'mkv',
            custom_sid: '',
            direct_source: '',
        },
        ...overrides,
    };
}

function makeStalkerDetails(
    overrides: Partial<StalkerVodDetails> = {}
): StalkerVodDetails {
    return {
        id: 'stalker-1',
        cmd: 'ffrt http://stream/1',
        info: {
            movie_image: 'http://img/stalker.jpg',
            description: 'Stalker movie',
            name: 'Formatted Name',
            o_name: 'Original Name',
            actors: 'Actor X',
            director: 'Director Y',
            releasedate: '2022-01-01',
            genre: 'Action',
            rating_imdb: '6.5',
            rating_kinopoisk: '6.0',
        },
        ...overrides,
    };
}

describe('normalizeXtreamVod', () => {
    it('should normalize full xtream details', () => {
        const result = normalizeXtreamVod(makeXtreamDetails());
        expect(result.title).toBe('Xtream Movie');
        expect(result.description).toBe('A movie');
        expect(result.posterUrl).toBe('http://img/movie.jpg');
        expect(result.backdropUrl).toBe('http://img/backdrop.jpg');
        expect(result.year).toBe('2023');
        expect(result.genre).toBe('Drama');
        expect(result.duration).toBe('1:30');
        expect(result.country).toBe('US');
        expect(result.director).toBe('Director');
        expect(result.actors).toBe('Actor A');
        expect(result.ratingImdb).toBe('8.0');
        expect(result.ratingKinopoisk).toBe('7.0');
        expect(result.youtubeTrailer).toBe('abc123');
    });

    it('should fall back to movie_data name when info name is empty', () => {
        const details = makeXtreamDetails();
        details.info.name = '';
        details.movie_data.name = 'Fallback Name';
        expect(normalizeXtreamVod(details).title).toBe('Fallback Name');
    });

    it('should return Unknown when no name fields are present', () => {
        const details = makeXtreamDetails();
        details.info.name = '';
        details.movie_data.name = '';
        expect(normalizeXtreamVod(details).title).toBe('Unknown');
    });

    it('should fall back to plot when description is empty', () => {
        const details = makeXtreamDetails();
        details.info.description = '';
        expect(normalizeXtreamVod(details).description).toBe('A plot');
    });

    it('should use duration_secs when duration is not available', () => {
        const details = makeXtreamDetails();
        details.info.duration = '';
        details.info.duration_secs = 3660;
        const result = normalizeXtreamVod(details);
        expect(result.duration).toBe('1h 1m');
    });

    it('should fall back to cover_big for poster', () => {
        const details = makeXtreamDetails();
        details.info.movie_image = '';
        expect(normalizeXtreamVod(details).posterUrl).toBe(
            'http://img/cover.jpg'
        );
    });

    it('should fall back to cast for actors', () => {
        const details = makeXtreamDetails();
        details.info.actors = '';
        expect(normalizeXtreamVod(details).actors).toBe('Actor B');
    });
});

describe('normalizeStalkerVod', () => {
    it('should normalize stalker details preferring o_name', () => {
        const result = normalizeStalkerVod(makeStalkerDetails());
        expect(result.title).toBe('Original Name');
        expect(result.description).toBe('Stalker movie');
        expect(result.posterUrl).toBe('http://img/stalker.jpg');
        expect(result.backdropUrl).toBeUndefined();
        expect(result.year).toBe('2022');
        expect(result.genre).toBe('Action');
        expect(result.duration).toBeUndefined();
        expect(result.country).toBeUndefined();
        expect(result.director).toBe('Director Y');
        expect(result.actors).toBe('Actor X');
        expect(result.ratingImdb).toBe('6.5');
        expect(result.youtubeTrailer).toBeUndefined();
    });

    it('should fall back to name when o_name is absent', () => {
        const details = makeStalkerDetails();
        details.info.o_name = undefined;
        expect(normalizeStalkerVod(details).title).toBe('Formatted Name');
    });

    it('should return Unknown when no name available', () => {
        const details = makeStalkerDetails();
        details.info.o_name = undefined;
        details.info.name = '';
        expect(normalizeStalkerVod(details).title).toBe('Unknown');
    });
});

describe('normalizeVodDetails', () => {
    it('should dispatch to normalizeXtreamVod for xtream type', () => {
        const item = createXtreamVodItem(makeXtreamDetails(), 'pl1', 42);
        const result = normalizeVodDetails(item);
        expect(result.title).toBe('Xtream Movie');
    });

    it('should dispatch to normalizeStalkerVod for stalker type', () => {
        const item = createStalkerVodItem(makeStalkerDetails(), 'pl1');
        const result = normalizeVodDetails(item);
        expect(result.title).toBe('Original Name');
    });
});

describe('createXtreamVodItem', () => {
    it('should create an xtream vod item with explicit vodId', () => {
        const data = makeXtreamDetails();
        const item = createXtreamVodItem(data, 'playlist-1', 99);
        expect(item.type).toBe('xtream');
        expect(item.playlistId).toBe('playlist-1');
        expect(item.vodId).toBe(99);
        expect(item.data).toBe(data);
    });

    it('should use stream_id from movie_data when vodId not provided', () => {
        const data = makeXtreamDetails();
        const item = createXtreamVodItem(data, 'playlist-1');
        expect(item.vodId).toBe(42);
    });

    it('should default to 0 when no vodId or stream_id', () => {
        const data = makeXtreamDetails();
        (data as any).movie_data = undefined;
        const item = createXtreamVodItem(data, 'pl1');
        expect(item.vodId).toBe(0);
    });
});

describe('createStalkerVodItem', () => {
    it('should create a stalker vod item', () => {
        const data = makeStalkerDetails();
        const item = createStalkerVodItem(data, 'playlist-2');
        expect(item.type).toBe('stalker');
        expect(item.playlistId).toBe('playlist-2');
        expect(item.cmd).toBe('ffrt http://stream/1');
        expect(item.data).toBe(data);
    });
});

describe('getVodId', () => {
    it('should return vodId for xtream items', () => {
        const item = createXtreamVodItem(makeXtreamDetails(), 'pl1', 55);
        expect(getVodId(item)).toBe(55);
    });

    it('should return data.id for stalker items', () => {
        const item = createStalkerVodItem(makeStalkerDetails(), 'pl1');
        expect(getVodId(item)).toBe('stalker-1');
    });
});

describe('getVodNumericId', () => {
    it('should return vodId for xtream items', () => {
        const item = createXtreamVodItem(makeXtreamDetails(), 'pl1', 77);
        expect(getVodNumericId(item)).toBe(77);
    });

    it('should convert stalker id to number', () => {
        const details = makeStalkerDetails();
        details.id = '123';
        const item = createStalkerVodItem(details, 'pl1');
        expect(getVodNumericId(item)).toBe(123);
    });

    it('should return 0 for non-numeric stalker id', () => {
        const details = makeStalkerDetails();
        details.id = 'abc';
        const item = createStalkerVodItem(details, 'pl1');
        expect(getVodNumericId(item)).toBe(0);
    });
});
