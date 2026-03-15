import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { Observable, of, ReplaySubject } from 'rxjs';
import { PlaylistEffects } from './effects';
import {
    ChannelActions,
    FavoritesActions,
    PlaylistActions,
} from './actions';
import {
    selectActive,
    selectActivePlaylistId,
    selectChannels,
    selectFavorites,
} from './selectors';
import { Channel, Playlist, PlaylistMeta } from 'shared-interfaces';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { StorageMap } from '@ngx-pwa/local-storage';
import { TranslateService } from '@ngx-translate/core';
import { DataService, PlaylistsService } from 'services';
import { EpgService } from '@iptvnator/epg/data-access';
import { initialState } from './state';

function makeChannel(overrides: Partial<Channel> = {}): Channel {
    return {
        id: 'ch1',
        url: 'http://example.com/stream',
        name: 'Test Channel',
        group: { title: 'Group' },
        tvg: { id: 'tvg1', name: 'TVG', url: '', logo: '', rec: '' },
        http: { referrer: '', 'user-agent': '', origin: '' },
        radio: '',
        epgParams: '',
        ...overrides,
    };
}

function makePlaylist(overrides: Partial<Playlist> = {}): Playlist {
    return {
        _id: 'pl1',
        title: 'Test',
        count: 1,
        importDate: '2024-01-01',
        lastUsage: '2024-01-01',
        autoRefresh: false,
        favorites: [],
        playlist: { items: [{ id: 'i1', url: 'http://s/1' }] },
        ...overrides,
    } as Playlist;
}

describe('PlaylistEffects', () => {
    let effects: PlaylistEffects;
    let actions$: ReplaySubject<any>;
    let store: MockStore;
    let playlistsService: jest.Mocked<Partial<PlaylistsService>>;
    let dataService: jest.Mocked<Partial<DataService>>;
    let epgService: jest.Mocked<Partial<EpgService>>;
    let snackBar: jest.Mocked<Partial<MatSnackBar>>;
    let router: jest.Mocked<Partial<Router>>;
    let storage: jest.Mocked<Partial<StorageMap>>;
    let translate: jest.Mocked<Partial<TranslateService>>;

    beforeEach(() => {
        actions$ = new ReplaySubject(1);

        playlistsService = {
            getAllPlaylists: jest.fn().mockReturnValue(of([])),
            updateFavorites: jest.fn().mockReturnValue(of({})),
            setFavorites: jest.fn().mockReturnValue(of({})),
            deletePlaylist: jest.fn().mockReturnValue(of({ success: true })),
            updatePlaylist: jest.fn().mockReturnValue(of({})),
            handlePlaylistParsing: jest.fn().mockReturnValue(makePlaylist()),
            addPlaylist: jest.fn().mockReturnValue(of(makePlaylist())),
            updatePlaylistMeta: jest.fn().mockReturnValue(of({})),
            updatePlaylistPositions: jest.fn().mockReturnValue(of([])),
            addManyPlaylists: jest.fn().mockReturnValue(of([])),
            updateManyPlaylists: jest.fn().mockReturnValue(of([])),
            removeAll: jest.fn().mockReturnValue(of(undefined)),
        };

        dataService = {
            sendIpcEvent: jest.fn(),
        };

        epgService = {
            getChannelPrograms: jest.fn(),
        };

        snackBar = {
            open: jest.fn(),
        };

        router = {
            navigate: jest.fn(),
        };

        storage = {
            get: jest.fn().mockReturnValue(of({})),
        };

        translate = {
            instant: jest.fn().mockReturnValue('translated'),
        };

        TestBed.configureTestingModule({
            providers: [
                PlaylistEffects,
                provideMockActions(() => actions$),
                provideMockStore({
                    initialState: { playlistState: initialState },
                    selectors: [
                        { selector: selectFavorites, value: [] },
                        { selector: selectActivePlaylistId, value: 'pl1' },
                        { selector: selectActive, value: undefined },
                        { selector: selectChannels, value: [] },
                    ],
                }),
                { provide: PlaylistsService, useValue: playlistsService },
                { provide: DataService, useValue: dataService },
                { provide: EpgService, useValue: epgService },
                { provide: MatSnackBar, useValue: snackBar },
                { provide: Router, useValue: router },
                { provide: StorageMap, useValue: storage },
                { provide: TranslateService, useValue: translate },
            ],
        });

        effects = TestBed.inject(PlaylistEffects);
        store = TestBed.inject(MockStore);
    });

    afterEach(() => {
        store.resetSelectors();
    });

    describe('loadPlaylists$', () => {
        it('should load playlists and dispatch success', (done) => {
            const playlists = [
                { _id: 'p1', title: 'PL1' } as PlaylistMeta,
            ];
            playlistsService.getAllPlaylists!.mockReturnValue(of(playlists as any));

            effects.loadPlaylists$.subscribe((action) => {
                expect(action.type).toBe(
                    PlaylistActions.loadPlaylistsSuccess.type
                );
                expect((action as any).playlists).toEqual(playlists);
                done();
            });

            actions$.next(PlaylistActions.loadPlaylists());
        });
    });

    describe('updateFavorites$', () => {
        it('should call updateFavorites on service and show snackbar', (done) => {
            store.overrideSelector(selectFavorites, ['http://fav1']);
            store.overrideSelector(selectActivePlaylistId, 'pl1');
            store.refreshState();

            playlistsService.updateFavorites!.mockReturnValue(of({} as any));

            const channel = makeChannel({ url: 'http://fav1' });

            effects.updateFavorites$.subscribe(() => {
                expect(playlistsService.updateFavorites).toHaveBeenCalledWith(
                    'pl1',
                    ['http://fav1']
                );
                expect(snackBar.open).toHaveBeenCalled();
                done();
            });

            actions$.next(FavoritesActions.updateFavorites({ channel }));
        });
    });

    describe('setActiveChannel$', () => {
        it('should dispatch setActiveChannelSuccess', (done) => {
            const channel = makeChannel();
            storage.get!.mockReturnValue(of({}));

            effects.setActiveChannel$.subscribe((action) => {
                expect(action.type).toBe(
                    ChannelActions.setActiveChannelSuccess.type
                );
                expect((action as any).channel).toEqual(channel);
                done();
            });

            actions$.next(ChannelActions.setActiveChannel({ channel }));
        });

        it('should call epgService.getChannelPrograms', (done) => {
            const channel = makeChannel();

            effects.setActiveChannel$.subscribe(() => {
                expect(epgService.getChannelPrograms).toHaveBeenCalledWith(
                    'tvg1'
                );
                done();
            });

            actions$.next(ChannelActions.setActiveChannel({ channel }));
        });
    });

    describe('parsePlaylist$', () => {
        it('should parse playlist and dispatch addPlaylist', (done) => {
            const parsed = makePlaylist({ _id: 'parsed' });
            playlistsService.handlePlaylistParsing!.mockReturnValue(parsed);

            effects.parsePlaylist$.subscribe((action) => {
                expect(action.type).toBe(PlaylistActions.addPlaylist.type);
                expect((action as any).playlist).toEqual(parsed);
                done();
            });

            actions$.next(
                PlaylistActions.parsePlaylist({
                    uploadType: 'TEXT',
                    playlist: '#EXTM3U\n#EXTINF:-1,Test\nhttp://test.com',
                    title: 'Test',
                })
            );
        });
    });

    describe('removePlaylist$', () => {
        it('should call deletePlaylist on service', (done) => {
            playlistsService.deletePlaylist!.mockReturnValue(
                of({ success: true })
            );

            effects.removePlaylist$.subscribe(() => {
                expect(
                    playlistsService.deletePlaylist
                ).toHaveBeenCalledWith('pl-del');
                done();
            });

            actions$.next(
                PlaylistActions.removePlaylist({ playlistId: 'pl-del' })
            );
        });
    });

    describe('setAdjacentChannelAsActive$', () => {
        it('should set next channel as active', (done) => {
            const ch1 = makeChannel({ id: 'c1' });
            const ch2 = makeChannel({ id: 'c2' });
            store.overrideSelector(selectChannels, [ch1, ch2]);
            store.overrideSelector(selectActive, ch1);
            store.refreshState();

            effects.setAdjacentChannelAsActive$.subscribe((action) => {
                expect(action.type).toBe(
                    ChannelActions.setActiveChannelSuccess.type
                );
                expect((action as any).channel.id).toBe('c2');
                done();
            });

            actions$.next(
                ChannelActions.setAdjacentChannelAsActive({
                    direction: 'next',
                })
            );
        });

        it('should set previous channel as active', (done) => {
            const ch1 = makeChannel({ id: 'c1' });
            const ch2 = makeChannel({ id: 'c2' });
            store.overrideSelector(selectChannels, [ch1, ch2]);
            store.overrideSelector(selectActive, ch2);
            store.refreshState();

            effects.setAdjacentChannelAsActive$.subscribe((action) => {
                expect(action.type).toBe(
                    ChannelActions.setActiveChannelSuccess.type
                );
                expect((action as any).channel.id).toBe('c1');
                done();
            });

            actions$.next(
                ChannelActions.setAdjacentChannelAsActive({
                    direction: 'previous',
                })
            );
        });
    });
});
