import { PlaylistMeta } from 'shared-interfaces';
import { playlistsAdapter, initialPlaylistMetaState } from './playlists.state';
import { initialState, PlaylistState } from './state';
import {
    selectPlaylistState,
    selectIsEpgAvailable,
    selectActive,
    selectCurrentEpgProgram,
    selectCurrentPlaylistId,
    selectChannels,
    selectPlaylistsLoadingFlag,
    selectAllPlaylistsMeta,
    selectActiveTypeFilters,
    selectPlaylistEntity,
    selectActivePlaylistId,
    selectPlaylistTitle,
    selectPlaylistEntities,
    selectActivePlaylist,
    selectFavorites,
    selectPlaylistById,
} from './selectors';

function makePlaylistMeta(
    overrides: Partial<PlaylistMeta> = {}
): PlaylistMeta {
    return {
        _id: 'pl1',
        title: 'Test Playlist',
        count: 5,
        importDate: '2024-01-01',
        autoRefresh: false,
        favorites: [],
        ...overrides,
    } as PlaylistMeta;
}

function makeState(overrides: Partial<PlaylistState> = {}): PlaylistState {
    return { ...initialState, ...overrides };
}

function projectState(state: PlaylistState): { playlistState: PlaylistState } {
    return { playlistState: state };
}

describe('Selectors', () => {
    describe('selectIsEpgAvailable', () => {
        it('should return epgAvailable flag', () => {
            const state = makeState({ epgAvailable: true });
            expect(selectIsEpgAvailable.projector(state)).toBe(true);
        });

        it('should return false by default', () => {
            expect(selectIsEpgAvailable.projector(initialState)).toBe(false);
        });
    });

    describe('selectActive', () => {
        it('should return active channel', () => {
            const channel = { name: 'CH1' } as any;
            const state = makeState({ active: channel });
            expect(selectActive.projector(state)).toBe(channel);
        });

        it('should return undefined when no active', () => {
            expect(selectActive.projector(initialState)).toBeUndefined();
        });
    });

    describe('selectCurrentEpgProgram', () => {
        it('should return current EPG program', () => {
            const program = { title: 'News' } as any;
            const state = makeState({ currentEpgProgram: program });
            expect(selectCurrentEpgProgram.projector(state)).toBe(program);
        });
    });

    describe('selectCurrentPlaylistId', () => {
        it('should return currentPlaylistId', () => {
            const state = makeState({ currentPlaylistId: 'abc' });
            expect(selectCurrentPlaylistId.projector(state)).toBe('abc');
        });
    });

    describe('selectChannels', () => {
        it('should return channels array', () => {
            const channels = [{ id: 'c1' }, { id: 'c2' }] as any[];
            const state = makeState({ channels });
            expect(selectChannels.projector(state)).toEqual(channels);
        });

        it('should return empty array by default', () => {
            expect(selectChannels.projector(initialState)).toEqual([]);
        });
    });

    describe('selectPlaylistsLoadingFlag', () => {
        it('should return allPlaylistsLoaded flag', () => {
            const state = makeState({
                playlists: {
                    ...initialPlaylistMetaState,
                    allPlaylistsLoaded: true,
                },
            });
            expect(selectPlaylistsLoadingFlag.projector(state)).toBe(true);
        });
    });

    describe('selectAllPlaylistsMeta', () => {
        it('should return all playlist metas as array', () => {
            const meta1 = makePlaylistMeta({ _id: 'p1' });
            const meta2 = makePlaylistMeta({ _id: 'p2' });
            const playlists = playlistsAdapter.addMany(
                [meta1, meta2],
                initialPlaylistMetaState
            );
            expect(selectAllPlaylistsMeta.projector(playlists)).toHaveLength(2);
        });
    });

    describe('selectActiveTypeFilters', () => {
        it('should return selectedFilters', () => {
            const playlists = {
                ...initialPlaylistMetaState,
                selectedFilters: ['m3u', 'xtream'],
            };
            const entities = playlistsAdapter.getSelectors().selectEntities;
            expect(selectActiveTypeFilters.projector(playlists, entities)).toEqual([
                'm3u',
                'xtream',
            ]);
        });
    });

    describe('selectPlaylistEntity', () => {
        it('should return entity by id', () => {
            const meta = makePlaylistMeta({ _id: 'p1', title: 'My PL' });
            const playlists = playlistsAdapter.addOne(
                meta,
                initialPlaylistMetaState
            );
            const selector = selectPlaylistEntity('p1');
            const entities = playlists;
            expect(
                selector.projector(entities, entities.entities)
            ).toBeDefined();
        });
    });

    describe('selectActivePlaylistId', () => {
        it('should return selectedId', () => {
            const playlists = {
                ...initialPlaylistMetaState,
                selectedId: 'sel-1',
            };
            const entities = playlists;
            expect(
                selectActivePlaylistId.projector(playlists, entities)
            ).toBe('sel-1');
        });
    });

    describe('selectPlaylistTitle', () => {
        it('should return title of selected playlist', () => {
            const meta = makePlaylistMeta({ _id: 'p1', title: 'My Title' });
            const playlists = {
                ...playlistsAdapter.addOne(meta, initialPlaylistMetaState),
                selectedId: 'p1',
            };
            const result = selectPlaylistTitle.projector(
                playlists,
                playlists.entities,
                'p1'
            );
            expect(result).toBe('My Title');
        });

        it('should return Untitled playlist when no selected', () => {
            const playlists = initialPlaylistMetaState;
            expect(
                selectPlaylistTitle.projector(
                    playlists,
                    playlists.entities,
                    undefined
                )
            ).toBe('Untitled playlist');
        });

        it('should fall back to filename when title missing', () => {
            const meta = makePlaylistMeta({
                _id: 'p1',
                title: '',
                filename: 'file.m3u',
            });
            const playlists = {
                ...playlistsAdapter.addOne(meta, initialPlaylistMetaState),
                selectedId: 'p1',
            };
            expect(
                selectPlaylistTitle.projector(
                    playlists,
                    playlists.entities,
                    'p1'
                )
            ).toBe('file.m3u');
        });
    });

    describe('selectActivePlaylist', () => {
        it('should return the selected playlist', () => {
            const meta = makePlaylistMeta({ _id: 'p1' });
            const playlists = {
                ...playlistsAdapter.addOne(meta, initialPlaylistMetaState),
                selectedId: 'p1',
            };
            expect(selectActivePlaylist.projector(playlists)).toEqual(
                expect.objectContaining({ _id: 'p1' })
            );
        });

        it('should return null when selectedId is empty', () => {
            expect(
                selectActivePlaylist.projector(initialPlaylistMetaState)
            ).toBeNull();
        });
    });

    describe('selectFavorites', () => {
        it('should return string favorites from selected playlist', () => {
            const meta = makePlaylistMeta({
                _id: 'p1',
                favorites: ['http://a', 'http://b'],
            });
            const playlists = {
                ...playlistsAdapter.addOne(meta, initialPlaylistMetaState),
                selectedId: 'p1',
            };
            expect(
                selectFavorites.projector(playlists, playlists.entities, 'p1')
            ).toEqual(['http://a', 'http://b']);
        });

        it('should return empty array when no favorites', () => {
            expect(
                selectFavorites.projector(
                    initialPlaylistMetaState,
                    initialPlaylistMetaState.entities,
                    ''
                )
            ).toEqual([]);
        });
    });

    describe('selectPlaylistById', () => {
        it('should return playlist by id', () => {
            const meta = makePlaylistMeta({ _id: 'p1' });
            const playlists = playlistsAdapter.addOne(
                meta,
                initialPlaylistMetaState
            );
            const selector = selectPlaylistById('p1');
            expect(selector.projector(playlists.entities)).toEqual(
                expect.objectContaining({ _id: 'p1' })
            );
        });

        it('should return undefined for non-existent id', () => {
            const selector = selectPlaylistById('missing');
            expect(
                selector.projector(initialPlaylistMetaState.entities)
            ).toBeUndefined();
        });
    });
});
