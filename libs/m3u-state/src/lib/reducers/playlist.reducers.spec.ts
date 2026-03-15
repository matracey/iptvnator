import { createReducer } from '@ngrx/store';
import { Channel, Playlist, PlaylistMeta } from 'shared-interfaces';
import { PlaylistActions } from '../actions';
import { initialState, PlaylistState } from '../state';
import { playlistsAdapter } from '../playlists.state';
import { playlistReducers } from './playlist.reducers';

const reducer = createReducer(initialState, ...playlistReducers);

function makePlaylistMeta(
    overrides: Partial<PlaylistMeta> = {}
): PlaylistMeta {
    return {
        _id: 'pl1',
        title: 'Test',
        count: 0,
        importDate: '2024-01-01',
        autoRefresh: false,
        favorites: [],
        ...overrides,
    } as PlaylistMeta;
}

function makePlaylist(overrides: Partial<Playlist> = {}): Playlist {
    return {
        _id: 'pl1',
        title: 'Test',
        count: 2,
        importDate: '2024-01-01',
        lastUsage: '2024-01-01',
        autoRefresh: false,
        favorites: [],
        playlist: {
            items: [
                { id: 'i1', url: 'http://s/1' },
                { id: 'i2', url: 'http://s/2' },
            ],
        },
        ...overrides,
    } as Playlist;
}

function stateWithPlaylist(meta: PlaylistMeta): PlaylistState {
    return {
        ...initialState,
        playlists: playlistsAdapter.addOne(meta, initialState.playlists),
    };
}

describe('playlistReducers', () => {
    describe('loadPlaylistsSuccess', () => {
        it('should add playlists and set allPlaylistsLoaded', () => {
            const playlists = [
                makePlaylistMeta({ _id: 'p1' }),
                makePlaylistMeta({ _id: 'p2' }),
            ];
            const state = reducer(
                initialState,
                PlaylistActions.loadPlaylistsSuccess({ playlists })
            );
            expect(state.playlists.ids).toHaveLength(2);
            expect(state.playlists.allPlaylistsLoaded).toBe(true);
        });
    });

    describe('removePlaylist', () => {
        it('should remove playlist by id', () => {
            const prev = stateWithPlaylist(makePlaylistMeta({ _id: 'p1' }));
            const state = reducer(
                prev,
                PlaylistActions.removePlaylist({ playlistId: 'p1' })
            );
            expect(state.playlists.ids).toHaveLength(0);
        });
    });

    describe('addPlaylist', () => {
        it('should add a single playlist', () => {
            const playlist = makePlaylist({ _id: 'new1' });
            const state = reducer(
                initialState,
                PlaylistActions.addPlaylist({ playlist })
            );
            expect(state.playlists.ids).toContain('new1');
        });
    });

    describe('addManyPlaylists', () => {
        it('should add multiple playlists', () => {
            const playlists = [
                makePlaylist({ _id: 'a1' }),
                makePlaylist({ _id: 'a2' }),
            ];
            const state = reducer(
                initialState,
                PlaylistActions.addManyPlaylists({ playlists })
            );
            expect(state.playlists.ids).toHaveLength(2);
        });
    });

    describe('setActivePlaylist', () => {
        it('should set selectedId', () => {
            const state = reducer(
                initialState,
                PlaylistActions.setActivePlaylist({ playlistId: 'pl-x' })
            );
            expect(state.playlists.selectedId).toBe('pl-x');
        });
    });

    describe('updatePlaylist', () => {
        it('should update playlist and preserve favorites', () => {
            const meta = makePlaylistMeta({
                _id: 'p1',
                favorites: ['http://fav'],
            });
            const prev = stateWithPlaylist(meta);
            const updatedPlaylist = makePlaylist({
                _id: 'p1',
                title: 'Updated',
            });

            const state = reducer(
                prev,
                PlaylistActions.updatePlaylist({
                    playlistId: 'p1',
                    playlist: updatedPlaylist,
                })
            );

            const entity = state.playlists.entities['p1'];
            expect(entity?.title).toBe('Updated');
            expect(entity?.favorites).toEqual(['http://fav']);
            expect(entity?.count).toBe(2);
        });
    });

    describe('updatePlaylistPositions', () => {
        it('should update positions for multiple playlists', () => {
            let prev = initialState;
            prev = {
                ...prev,
                playlists: playlistsAdapter.addMany(
                    [
                        makePlaylistMeta({ _id: 'p1' }),
                        makePlaylistMeta({ _id: 'p2' }),
                    ],
                    prev.playlists
                ),
            };
            const state = reducer(
                prev,
                PlaylistActions.updatePlaylistPositions({
                    positionUpdates: [
                        { id: 'p1', changes: { position: 1 } },
                        { id: 'p2', changes: { position: 0 } },
                    ],
                })
            );

            expect((state.playlists.entities['p1'] as any).position).toBe(1);
            expect((state.playlists.entities['p2'] as any).position).toBe(0);
        });
    });

    describe('updatePlaylistMeta', () => {
        it('should update only provided fields', () => {
            const prev = stateWithPlaylist(
                makePlaylistMeta({ _id: 'p1', title: 'Old Title' })
            );
            const state = reducer(
                prev,
                PlaylistActions.updatePlaylistMeta({
                    playlist: { _id: 'p1', title: 'New Title' } as any,
                })
            );
            expect(state.playlists.entities['p1']?.title).toBe('New Title');
        });
    });

    describe('removeAllPlaylists', () => {
        it('should remove all playlists', () => {
            let prev = initialState;
            prev = {
                ...prev,
                playlists: playlistsAdapter.addMany(
                    [
                        makePlaylistMeta({ _id: 'p1' }),
                        makePlaylistMeta({ _id: 'p2' }),
                    ],
                    prev.playlists
                ),
            };
            const state = reducer(prev, PlaylistActions.removeAllPlaylists());
            expect(state.playlists.ids).toHaveLength(0);
        });
    });

    describe('setCurrentPlaylistId', () => {
        it('should set currentPlaylistId', () => {
            const state = reducer(
                initialState,
                PlaylistActions.setCurrentPlaylistId({ playlistId: 'abc' })
            );
            expect(state.currentPlaylistId).toBe('abc');
        });

        it('should accept undefined', () => {
            const prev = { ...initialState, currentPlaylistId: 'old' };
            const state = reducer(
                prev,
                PlaylistActions.setCurrentPlaylistId({
                    playlistId: undefined,
                })
            );
            expect(state.currentPlaylistId).toBeUndefined();
        });
    });

    describe('handleAddingPlaylistByUrl', () => {
        it('should set channels when isTemporary is true', () => {
            const playlist = makePlaylist();
            const state = reducer(
                initialState,
                PlaylistActions.handleAddingPlaylistByUrl({
                    isTemporary: true,
                    playlist,
                })
            );
            expect(state.channels).toEqual(
                playlist.playlist.items as Channel[]
            );
            expect(state.playlists.ids).toHaveLength(0);
        });

        it('should add playlist when isTemporary is false', () => {
            const playlist = makePlaylist({ _id: 'url-pl' });
            const state = reducer(
                initialState,
                PlaylistActions.handleAddingPlaylistByUrl({
                    isTemporary: false,
                    playlist,
                })
            );
            expect(state.playlists.ids).toContain('url-pl');
        });
    });

    describe('updateManyPlaylists', () => {
        it('should update multiple playlists with updateDate', () => {
            let prev = initialState;
            prev = {
                ...prev,
                playlists: playlistsAdapter.addMany(
                    [
                        makePlaylistMeta({ _id: 'p1', title: 'A' }),
                        makePlaylistMeta({ _id: 'p2', title: 'B' }),
                    ],
                    prev.playlists
                ),
            };
            const state = reducer(
                prev,
                PlaylistActions.updateManyPlaylists({
                    playlists: [
                        makePlaylist({ _id: 'p1', title: 'A2' }),
                        makePlaylist({ _id: 'p2', title: 'B2' }),
                    ],
                })
            );
            expect(state.playlists.entities['p1']?.title).toBe('A2');
            expect(state.playlists.entities['p2']?.title).toBe('B2');
        });
    });
});
