import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MatSidenavModule } from '@angular/material/sidenav';
import { ActivatedRoute } from '@angular/router';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { StorageMap } from '@ngx-pwa/local-storage';
import { TranslateModule } from '@ngx-translate/core';
import { MockModule, MockProviders } from 'ng-mocks';
import { of } from 'rxjs';
import { PLAYLIST_PLAYER_ACTIONS } from '@iptvnator/playlist/shared/util';
import { DataService, PlaylistsService, SettingsStore } from 'services';
import { VideoPlayer } from 'shared-interfaces';
import { VideoPlayerComponent } from './video-player.component';

describe('VideoPlayerComponent', () => {
    let component: VideoPlayerComponent;
    let fixture: ComponentFixture<VideoPlayerComponent>;
    let mockStore: MockStore;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            providers: [
                {
                    provide: DataService,
                    useValue: {
                        sendIpcEvent: jest.fn(),
                        listenOn: jest.fn(),
                        removeAllListeners: jest.fn(),
                        getAppVersion: jest.fn(() => '1.0.0'),
                        getAppEnvironment: jest.fn(() => 'electron'),
                    },
                },
                {
                    provide: ActivatedRoute,
                    useValue: {
                        params: of({ id: '1' }),
                        snapshot: {
                            queryParams: {
                                url: 'https://iptvnator/list.m3u',
                            },
                            data: {},
                        },
                    },
                },
                {
                    provide: StorageMap,
                    useValue: { get: jest.fn(() => of(null)) },
                },
                {
                    provide: SettingsStore,
                    useValue: {
                        player: jest.fn(() => VideoPlayer.VideoJs),
                        showCaptions: jest.fn(() => false),
                        settings: jest.fn(() => ({
                            player: VideoPlayer.VideoJs,
                            showCaptions: false,
                        })),
                    },
                },
                {
                    provide: PLAYLIST_PLAYER_ACTIONS,
                    useValue: { openSettings: jest.fn() },
                },
                provideMockStore({
                    initialState: {
                        playlistState: {
                            active: undefined,
                            currentEpgProgram: undefined,
                            epgAvailable: false,
                            channels: [],
                            currentPlaylistId: undefined,
                            playlists: {
                                ids: [],
                                entities: {},
                                selectedId: '',
                                allPlaylistsLoaded: false,
                                selectedFilters: [],
                            },
                        },
                    },
                }),
                MockProviders(PlaylistsService),
            ],
            imports: [
                VideoPlayerComponent,
                TranslateModule.forRoot(),
                MockModule(MatSidenavModule),
            ],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(VideoPlayerComponent);
        component = fixture.componentInstance;
        mockStore = TestBed.inject(MockStore);
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should have default player settings', () => {
        expect(component.playerSettings).toEqual({
            player: VideoPlayer.VideoJs,
            showCaptions: false,
        });
    });
});
