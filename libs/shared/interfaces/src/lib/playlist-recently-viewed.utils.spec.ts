import { buildPlaylistRecentItems } from './playlist-recently-viewed.utils';
import { PlaylistMeta } from './playlist-meta.type';
import { M3uRecentlyViewedItem } from './playlist-recently-viewed.interface';
import { StalkerPortalItem } from './stalker-portal-item.interface';

function makeStalkerPlaylist(
    overrides: Partial<PlaylistMeta> = {}
): PlaylistMeta {
    return {
        _id: 'stalker-pl',
        title: 'Stalker Portal',
        count: 0,
        importDate: '2024-01-01',
        autoRefresh: false,
        favorites: [],
        macAddress: '00:1A:79:00:00:01',
        ...overrides,
    } as PlaylistMeta;
}

function makeM3uPlaylist(overrides: Partial<PlaylistMeta> = {}): PlaylistMeta {
    return {
        _id: 'm3u-pl',
        title: 'M3U Playlist',
        count: 0,
        importDate: '2024-01-01',
        autoRefresh: false,
        favorites: [],
        ...overrides,
    } as PlaylistMeta;
}

const labels = { stalker: 'Default Stalker', m3u: 'Default M3U' };

describe('buildPlaylistRecentItems', () => {
    it('should return empty array for empty playlists', () => {
        expect(buildPlaylistRecentItems([], labels)).toEqual([]);
    });

    it('should map stalker recently viewed items', () => {
        const stalkerItem: StalkerPortalItem = {
            id: 'st1',
            title: 'Stalker Channel',
            category_id: 'itv',
            cover: 'http://img/cover.jpg',
            added_at: 1700000000,
        };
        const playlist = makeStalkerPlaylist({
            recentlyViewed: [stalkerItem] as any,
        });

        const result = buildPlaylistRecentItems([playlist], labels);
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('st1');
        expect(result[0].title).toBe('Stalker Channel');
        expect(result[0].type).toBe('live');
        expect(result[0].source).toBe('stalker');
        expect(result[0].playlist_id).toBe('stalker-pl');
        expect(result[0].playlist_name).toBe('Stalker Portal');
        expect(result[0].poster_url).toBe('http://img/cover.jpg');
    });

    it('should use default label when playlist title is missing', () => {
        const stalkerItem: StalkerPortalItem = {
            id: 'st2',
            title: 'Ch',
        };
        const playlist = makeStalkerPlaylist({
            title: '',
            recentlyViewed: [stalkerItem] as any,
        });

        const result = buildPlaylistRecentItems([playlist], labels);
        expect(result[0].playlist_name).toBe('Default Stalker');
    });

    it('should map M3U recently viewed items', () => {
        const m3uItem: M3uRecentlyViewedItem = {
            source: 'm3u',
            id: 'ch1',
            url: 'http://stream/1',
            title: 'My Channel',
            category_id: 'live',
            added_at: '2024-01-15T00:00:00Z',
        };
        const playlist = makeM3uPlaylist({
            recentlyViewed: [m3uItem] as any,
        });

        const result = buildPlaylistRecentItems([playlist], labels);
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('ch1');
        expect(result[0].title).toBe('My Channel');
        expect(result[0].type).toBe('live');
        expect(result[0].source).toBe('m3u');
        expect(result[0].xtream_id).toBe('http://stream/1');
    });

    it('should skip M3U items with empty URL', () => {
        const m3uItem: M3uRecentlyViewedItem = {
            source: 'm3u',
            id: 'ch1',
            url: '   ',
            title: 'Empty',
            category_id: 'live',
            added_at: '',
        };
        const playlist = makeM3uPlaylist({
            recentlyViewed: [m3uItem] as any,
        });

        const result = buildPlaylistRecentItems([playlist], labels);
        expect(result).toHaveLength(0);
    });

    it('should skip xtream playlists (has serverUrl, no macAddress)', () => {
        const m3uItem: M3uRecentlyViewedItem = {
            source: 'm3u',
            id: 'ch1',
            url: 'http://s/1',
            title: 'Ch',
            category_id: 'live',
            added_at: '',
        };
        const playlist = makeM3uPlaylist({
            serverUrl: 'http://xtream.com',
            recentlyViewed: [m3uItem] as any,
        });

        const result = buildPlaylistRecentItems([playlist], labels);
        expect(result).toHaveLength(0);
    });

    it('should process multiple playlists', () => {
        const stalkerItem: StalkerPortalItem = { id: 's1', title: 'S' };
        const m3uItem: M3uRecentlyViewedItem = {
            source: 'm3u',
            id: 'm1',
            url: 'http://s/1',
            title: 'M',
            category_id: 'live',
            added_at: '',
        };
        const stalkerPl = makeStalkerPlaylist({
            recentlyViewed: [stalkerItem] as any,
        });
        const m3uPl = makeM3uPlaylist({
            recentlyViewed: [m3uItem] as any,
        });

        const result = buildPlaylistRecentItems([stalkerPl, m3uPl], labels);
        expect(result).toHaveLength(2);
        expect(result[0].source).toBe('stalker');
        expect(result[1].source).toBe('m3u');
    });

    it('should handle playlists with no recentlyViewed', () => {
        const playlist = makeM3uPlaylist();
        const result = buildPlaylistRecentItems([playlist], labels);
        expect(result).toEqual([]);
    });

    it('should use tvg_name or channel_id when title is empty for M3U item', () => {
        const m3uItem: M3uRecentlyViewedItem = {
            source: 'm3u',
            id: 'ch1',
            url: 'http://s/1',
            title: '',
            tvg_name: 'TVG Name',
            category_id: 'live',
            added_at: '',
        };
        const playlist = makeM3uPlaylist({
            recentlyViewed: [m3uItem] as any,
        });

        const result = buildPlaylistRecentItems([playlist], labels);
        expect(result[0].title).toBe('TVG Name');
    });
});
