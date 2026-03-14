import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MockModule, MockProvider } from 'ng-mocks';
import { of } from 'rxjs';
import { DatabaseService, DataService, SortService } from 'services';
import { DialogService } from 'components';
import { PlaylistMeta } from 'shared-interfaces';
import { RecentPlaylistsComponent } from './recent-playlists.component';

describe('RecentPlaylistsComponent', () => {
    let component: RecentPlaylistsComponent;
    let fixture: ComponentFixture<RecentPlaylistsComponent>;
    let dialog: MatDialog;
    let dialogService: DialogService;
    let mockStore: MockStore;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            imports: [
                RecentPlaylistsComponent,
                MockModule(MatDialogModule),
                TranslateModule.forRoot(),
            ],
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
                    provide: DatabaseService,
                    useValue: {
                        deletePlaylist: jest.fn(() =>
                            Promise.resolve(true)
                        ),
                        deleteXtreamPlaylistContent: jest.fn(),
                        updateXtreamPlaylistDetails: jest.fn(),
                    },
                },
                {
                    provide: SortService,
                    useValue: {
                        getSortOptions: jest.fn(() =>
                            of({ by: 'title', order: 'asc' })
                        ),
                        sortPlaylists: jest.fn(
                            (playlists: PlaylistMeta[]) => playlists
                        ),
                    },
                },
                {
                    provide: Router,
                    useValue: { navigate: jest.fn() },
                },
                MockProvider(DialogService),
                MockProvider(MatSnackBar),
                MockProvider(TranslateService, {
                    instant: jest.fn((key: string) => key),
                }),
                provideMockStore({
                    initialState: {
                        playlistState: {
                            playlists: {
                                ids: [],
                                entities: {},
                                selectedId: '',
                                allPlaylistsLoaded: true,
                                selectedFilters: [
                                    'm3u',
                                    'xtream',
                                    'stalker',
                                ],
                            },
                            currentPlaylistId: undefined,
                        },
                    },
                }),
            ],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(RecentPlaylistsComponent);
        component = fixture.componentInstance;
        dialog = TestBed.inject(MatDialog);
        dialogService = TestBed.inject(DialogService);
        mockStore = TestBed.inject(MockStore);
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should open the info dialog', () => {
        jest.spyOn(dialog, 'open');
        component.openInfoDialog({} as PlaylistMeta);
        expect(dialog.open).toHaveBeenCalledTimes(1);
    });

    it('should dispatch after drop event', () => {
        const event = {
            previousIndex: 0,
            currentIndex: 1,
            item: undefined,
            container: undefined,
            previousContainer: undefined,
            isPointerOverContainer: true,
            distance: { x: 0, y: 0 },
            dropPoint: { x: 0, y: 0 },
        } as any;
        jest.spyOn(mockStore, 'dispatch');
        component.drop(event, []);
        expect(mockStore.dispatch).toHaveBeenCalledTimes(1);
    });

    it('should open the confirmation dialog on remove click', () => {
        const playlistId = '12345';
        jest.spyOn(dialogService, 'openConfirmDialog');
        component.removeClicked(playlistId);
        expect(dialogService.openConfirmDialog).toHaveBeenCalledTimes(1);
    });

    it('should navigate to playlist on getPlaylist', () => {
        const router = TestBed.inject(Router);
        const playlistMeta = {
            _id: '6789',
            title: 'Test Playlist',
        } as unknown as PlaylistMeta;

        component.getPlaylist(playlistMeta);
        expect(router.navigate).toHaveBeenCalledWith([
            '/workspace',
            'playlists',
            '6789',
        ]);
    });
});
