import { Channel } from 'shared-interfaces';
import { FavoritesActions } from '../actions';
import { initialState, PlaylistState } from '../state';
import { playlistsAdapter } from '../playlists.state';
import { playlistReducer } from './index';

const reducer = playlistReducer;

function makeChannel(overrides: Partial<Channel> = {}): Channel {
    return {
        id: 'ch1',
        url: 'http://example.com/stream1',
        name: 'Test Channel',
        group: { title: 'Group' },
        tvg: { id: '', name: '', url: '', logo: '', rec: '' },
        http: { referrer: '', 'user-agent': '', origin: '' },
        radio: '',
        ...overrides,
    };
}

function stateWithPlaylist(
    playlistId: string,
    favorites: string[] = []
): PlaylistState {
    return {
        ...initialState,
        playlists: {
            ...playlistsAdapter.addOne(
                {
                    _id: playlistId,
                    title: 'Test',
                    count: 0,
                    importDate: '',
                    autoRefresh: false,
                    favorites,
                } as any,
                initialState.playlists
            ),
            selectedId: playlistId,
        },
    };
}

describe('favoritesReducers', () => {
    describe('updateFavorites', () => {
        it('should add channel URL to favorites when not present', () => {
            const prev = stateWithPlaylist('pl1', []);
            const channel = makeChannel({ url: 'http://new-fav' });
            const state = reducer(
                prev,
                FavoritesActions.updateFavorites({ channel })
            );

            const favorites =
                state.playlists.entities['pl1']?.favorites as string[];
            expect(favorites).toContain('http://new-fav');
        });

        it('should remove channel URL from favorites when already present', () => {
            const prev = stateWithPlaylist('pl1', [
                'http://existing',
                'http://other',
            ]);
            const channel = makeChannel({ url: 'http://existing' });
            const state = reducer(
                prev,
                FavoritesActions.updateFavorites({ channel })
            );

            const favorites =
                state.playlists.entities['pl1']?.favorites as string[];
            expect(favorites).not.toContain('http://existing');
            expect(favorites).toContain('http://other');
        });
    });

    describe('setFavorites', () => {
        it('should replace favorites with given channelIds', () => {
            const prev = stateWithPlaylist('pl1', ['http://old']);
            const state = reducer(
                prev,
                FavoritesActions.setFavorites({
                    channelIds: ['http://a', 'http://b'],
                })
            );

            const favorites =
                state.playlists.entities['pl1']?.favorites as string[];
            expect(favorites).toEqual(['http://a', 'http://b']);
        });

        it('should set empty favorites', () => {
            const prev = stateWithPlaylist('pl1', ['http://old']);
            const state = reducer(
                prev,
                FavoritesActions.setFavorites({ channelIds: [] })
            );

            const favorites =
                state.playlists.entities['pl1']?.favorites as string[];
            expect(favorites).toEqual([]);
        });
    });
});
