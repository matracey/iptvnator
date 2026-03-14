import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { StorageMap } from '@ngx-pwa/local-storage';
import { TranslateModule } from '@ngx-translate/core';
import { MockProviders } from 'ng-mocks';
import { EpgService } from '@iptvnator/epg/data-access';
import { PlaylistsService } from 'services';
import { of } from 'rxjs';
import { ChannelListContainerComponent } from './channel-list-container.component';

describe('ChannelListContainerComponent', () => {
    let component: ChannelListContainerComponent;
    let fixture: ComponentFixture<ChannelListContainerComponent>;
    let mockStore: MockStore;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [
                ChannelListContainerComponent,
                TranslateModule.forRoot(),
                NoopAnimationsModule,
            ],
            providers: [
                provideMockStore({
                    initialState: {
                        playlistState: {
                            active: undefined,
                            channels: [],
                            currentPlaylistId: '',
                            playlists: {
                                ids: [],
                                entities: {},
                                selectedId: '',
                                allPlaylistsLoaded: false,
                                selectedFilters: [],
                            },
                        },
                    },
                    selectors: [],
                }),
                {
                    provide: EpgService,
                    useValue: {
                        getCurrentProgramsForChannels: jest.fn(() =>
                            of(new Map())
                        ),
                        getChannelPrograms: jest.fn(),
                        currentEpgPrograms$: of([]),
                        epgAvailable$: of(false),
                    },
                },
                MockProviders(PlaylistsService),
                {
                    provide: StorageMap,
                    useValue: { get: jest.fn(() => of(null)) },
                },
                {
                    provide: Router,
                    useValue: {
                        url: '/',
                        events: of(),
                        navigate: jest.fn(),
                    },
                },
            ],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(ChannelListContainerComponent);
        component = fixture.componentInstance;
        mockStore = TestBed.inject(MockStore);
        fixture.detectChanges();
    });

    it('should create component', () => {
        expect(component).toBeTruthy();
    });

    it('should have empty channel list by default', () => {
        expect(component._channelList).toHaveLength(0);
    });

    it('should dispatch channel selection action', () => {
        jest.spyOn(mockStore, 'dispatch');
        const channel = {
            id: '1',
            url: 'http://test.com/stream',
            name: 'Test Channel',
            group: { title: 'Group 1' },
        } as any;
        component.onChannelSelected(channel);
        expect(mockStore.dispatch).toHaveBeenCalledWith(
            expect.objectContaining({
                channel,
            })
        );
    });

    it('should dispatch favorite toggle action', () => {
        jest.spyOn(mockStore, 'dispatch');
        const channel = {
            id: '1',
            url: 'http://test.com/stream',
            name: 'Test Channel',
        } as any;
        const event = new MouseEvent('click');
        jest.spyOn(event, 'stopPropagation');
        component.onFavoriteToggled({ channel, event });
        expect(event.stopPropagation).toHaveBeenCalled();
        expect(mockStore.dispatch).toHaveBeenCalledWith(
            expect.objectContaining({ channel })
        );
    });

    it('should dispatch favorites reorder action', () => {
        jest.spyOn(mockStore, 'dispatch');
        component.onFavoritesReordered(['url1', 'url2']);
        expect(mockStore.dispatch).toHaveBeenCalledWith(
            expect.objectContaining({
                channelIds: ['url1', 'url2'],
            })
        );
    });

    it('should compute grouped channels', () => {
        component.channelList = [
            {
                id: '1',
                url: 'u1',
                name: 'C1',
                group: { title: 'News' },
            },
            {
                id: '2',
                url: 'u2',
                name: 'C2',
                group: { title: 'Sports' },
            },
            {
                id: '3',
                url: 'u3',
                name: 'C3',
                group: { title: 'News' },
            },
        ] as any[];

        const groups = component.groupedChannels();
        expect(Object.keys(groups)).toHaveLength(2);
        expect(groups['News']).toHaveLength(2);
        expect(groups['Sports']).toHaveLength(1);
    });
});
