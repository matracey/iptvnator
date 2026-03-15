import {
    aggregateFavoriteChannels,
    createFavoritesPlaylist,
    getFilenameFromUrl,
    createPlaylistObject,
    getExtensionFromUrl,
} from './playlist.utils';
import { Channel, Playlist, ParsedPlaylist } from 'shared-interfaces';

jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));

function makeChannel(overrides: Partial<Channel> = {}): Channel {
    return {
        id: 'ch1',
        url: 'http://example.com/stream1',
        name: 'Channel 1',
        group: { title: 'Group A' },
        tvg: { id: '', name: '', url: '', logo: '', rec: '' },
        http: { referrer: '', 'user-agent': '', origin: '' },
        radio: '',
        ...overrides,
    };
}

function makePlaylist(overrides: Partial<Playlist> = {}): Playlist {
    return {
        _id: 'pl1',
        title: 'Test Playlist',
        count: 0,
        importDate: '2024-01-01',
        lastUsage: '2024-01-01',
        autoRefresh: false,
        favorites: [],
        playlist: { items: [] },
        ...overrides,
    };
}

describe('aggregateFavoriteChannels', () => {
    it('should return empty array when no playlists', () => {
        expect(aggregateFavoriteChannels([])).toEqual([]);
    });

    it('should return empty array when playlists have no favorites', () => {
        const playlists = [makePlaylist({ favorites: [] })];
        expect(aggregateFavoriteChannels(playlists)).toEqual([]);
    });

    it('should return matching channels by id', () => {
        const ch = makeChannel({ id: 'fav1', url: 'http://a.com/s' });
        const playlists = [
            makePlaylist({
                favorites: ['fav1'],
                playlist: { items: [ch] },
            }),
        ];
        expect(aggregateFavoriteChannels(playlists)).toEqual([ch]);
    });

    it('should return matching channels by url', () => {
        const ch = makeChannel({ id: 'other', url: 'http://a.com/fav' });
        const playlists = [
            makePlaylist({
                favorites: ['http://a.com/fav'],
                playlist: { items: [ch] },
            }),
        ];
        expect(aggregateFavoriteChannels(playlists)).toEqual([ch]);
    });

    it('should aggregate from multiple playlists', () => {
        const ch1 = makeChannel({ id: 'c1', url: 'http://a.com/1' });
        const ch2 = makeChannel({ id: 'c2', url: 'http://a.com/2' });
        const playlists = [
            makePlaylist({
                favorites: ['c1'],
                playlist: { items: [ch1] },
            }),
            makePlaylist({
                _id: 'pl2',
                favorites: ['http://a.com/2'],
                playlist: { items: [ch2] },
            }),
        ];
        expect(aggregateFavoriteChannels(playlists)).toEqual([ch1, ch2]);
    });

    it('should skip channels not in favorites', () => {
        const ch1 = makeChannel({ id: 'c1', url: 'http://a.com/1' });
        const ch2 = makeChannel({ id: 'c2', url: 'http://a.com/2' });
        const playlists = [
            makePlaylist({
                favorites: ['c1'],
                playlist: { items: [ch1, ch2] },
            }),
        ];
        expect(aggregateFavoriteChannels(playlists)).toEqual([ch1]);
    });
});

describe('createFavoritesPlaylist', () => {
    it('should create a favorites playlist from channels', () => {
        const channels = [
            makeChannel({ url: 'http://a.com/1' }),
            makeChannel({ url: 'http://a.com/2' }),
        ];
        const result = createFavoritesPlaylist(channels);
        expect(result._id).toBe('global-favorites');
        expect(result.count).toBe(2);
        expect(result.playlist?.items).toEqual(channels);
        expect(result.favorites).toEqual([
            'http://a.com/1',
            'http://a.com/2',
        ]);
        expect(result.filename).toBe('Global favorites');
    });

    it('should handle empty channels array', () => {
        const result = createFavoritesPlaylist([]);
        expect(result.count).toBe(0);
        expect(result.playlist?.items).toEqual([]);
        expect(result.favorites).toEqual([]);
    });
});

describe('getFilenameFromUrl', () => {
    it('should extract filename from URL', () => {
        expect(getFilenameFromUrl('http://example.com/path/file.m3u')).toBe(
            'file.m3u'
        );
    });

    it('should return Untitled playlist for empty string', () => {
        expect(getFilenameFromUrl('')).toBe('Untitled playlist');
    });

    it('should return Untitled playlist for single character', () => {
        expect(getFilenameFromUrl('a')).toBe('Untitled playlist');
    });

    it('should handle URL with no path', () => {
        expect(getFilenameFromUrl('http://example.com/')).toBe('');
    });

    it('should handle URL with no slashes (just two chars)', () => {
        expect(getFilenameFromUrl('ab')).toBe('ab');
    });
});

describe('createPlaylistObject', () => {
    const parsedPlaylist: ParsedPlaylist = {
        header: { attrs: { 'x-tvg-url': '' }, raw: '' },
        items: [
            {
                name: 'Item 1',
                tvg: { id: '', name: '', url: '', logo: '', rec: '' },
                group: { title: '' },
                http: { referrer: '', 'user-agent': '' },
                url: 'http://a.com/1',
                raw: '',
            },
        ],
    };

    it('should create playlist object with URL upload type', () => {
        const result = createPlaylistObject(
            'My Playlist',
            parsedPlaylist,
            'http://remote.com/list.m3u',
            'URL'
        );
        expect(result._id).toBe('test-uuid');
        expect(result.filename).toBe('My Playlist');
        expect(result.title).toBe('My Playlist');
        expect(result.count).toBe(1);
        expect(result.url).toBe('http://remote.com/list.m3u');
        expect(result.filePath).toBeUndefined();
        expect(result.favorites).toEqual([]);
        expect(result.autoRefresh).toBe(false);
        expect(result.playlist.items[0].id).toBe('test-uuid');
    });

    it('should create playlist object with FILE upload type', () => {
        const result = createPlaylistObject(
            'Local',
            parsedPlaylist,
            '/tmp/file.m3u',
            'FILE'
        );
        expect(result.filePath).toBe('/tmp/file.m3u');
        expect(result.url).toBeUndefined();
    });

    it('should create playlist object with TEXT upload type', () => {
        const result = createPlaylistObject('Text', parsedPlaylist, '', 'TEXT');
        expect(result.url).toBeUndefined();
        expect(result.filePath).toBeUndefined();
    });

    it('should set importDate and lastUsage as ISO strings', () => {
        const result = createPlaylistObject('P', parsedPlaylist);
        expect(() => new Date(result.importDate)).not.toThrow();
        expect(() => new Date(result.lastUsage)).not.toThrow();
    });
});

describe('getExtensionFromUrl', () => {
    it('should extract extension from simple URL', () => {
        expect(getExtensionFromUrl('http://example.com/file.m3u8')).toBe(
            'm3u8'
        );
    });

    it('should extract extension ignoring query params', () => {
        expect(
            getExtensionFromUrl('http://example.com/file.ts?token=abc')
        ).toBe('ts');
    });

    it('should extract extension ignoring hash', () => {
        expect(getExtensionFromUrl('http://example.com/file.mp4#start')).toBe(
            'mp4'
        );
    });

    it('should return last dot-segment for URL without file extension', () => {
        expect(getExtensionFromUrl('http://example.com/stream')).toBe(
            'com/stream'
        );
    });
});
