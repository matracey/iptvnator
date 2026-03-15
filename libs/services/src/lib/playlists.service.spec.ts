import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { of, firstValueFrom } from 'rxjs';
import { PlaylistsService } from './playlists.service';
import { DbStores, Playlist, PlaylistUpdateState } from 'shared-interfaces';

describe('PlaylistsService', () => {
    let service: PlaylistsService;
    let dbService: NgxIndexedDBService;
    let snackBar: MatSnackBar;
    let translateService: TranslateService;

    const mockPlaylist: Playlist = {
        _id: 'test-id-1',
        title: 'Test Playlist',
        count: 5,
        importDate: '2024-01-01T00:00:00.000Z',
        lastUsage: '2024-01-02T00:00:00.000Z',
        favorites: ['fav-ch-1'],
        recentlyViewed: [],
        autoRefresh: false,
        playlist: {
            header: { raw: '#EXTM3U' },
            items: [
                { id: 'ch1', name: 'Channel 1', url: 'http://example.com/1' },
            ],
        },
    } as unknown as Playlist;

    beforeEach(() => {
        delete (window as any).electron;

        TestBed.configureTestingModule({
            providers: [
                PlaylistsService,
                {
                    provide: MatSnackBar,
                    useValue: { open: jest.fn() },
                },
                {
                    provide: TranslateService,
                    useValue: {
                        instant: jest.fn((key: string) => key),
                    },
                },
                {
                    provide: NgxIndexedDBService,
                    useValue: {
                        getAll: jest
                            .fn()
                            .mockReturnValue(of([mockPlaylist])),
                        add: jest.fn().mockReturnValue(of(mockPlaylist)),
                        getByID: jest
                            .fn()
                            .mockReturnValue(of(mockPlaylist)),
                        update: jest
                            .fn()
                            .mockImplementation((_store: string, data: any) =>
                                of(data)
                            ),
                        delete: jest.fn().mockReturnValue(of(true)),
                        clear: jest.fn().mockReturnValue(of(true)),
                        bulkAdd: jest.fn().mockReturnValue(of([])),
                    },
                },
            ],
        });

        service = TestBed.inject(PlaylistsService);
        dbService = TestBed.inject(NgxIndexedDBService);
        snackBar = TestBed.inject(MatSnackBar);
        translateService = TestBed.inject(TranslateService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('getAllPlaylists', () => {
        it('should return playlists from IndexedDB', async () => {
            const result = await firstValueFrom(service.getAllPlaylists());
            expect(result).toBeDefined();
            expect(result.length).toBe(1);
            expect(dbService.getAll).toHaveBeenCalledWith(DbStores.Playlists);
        });

        it('should strip playlist, items, and header from results', async () => {
            const playlistWithData = {
                ...mockPlaylist,
                items: ['extra-item'],
                header: { raw: '#EXTM3U' },
            };
            (dbService.getAll as jest.Mock).mockReturnValue(
                of([playlistWithData])
            );

            const result = await firstValueFrom(service.getAllPlaylists());
            expect(result[0]).not.toHaveProperty('items');
            expect(result[0]).not.toHaveProperty('header');
            expect(result[0]).not.toHaveProperty('playlist');
        });

        it('should return empty array when no playlists exist', async () => {
            (dbService.getAll as jest.Mock).mockReturnValue(of([]));
            const result = await firstValueFrom(service.getAllPlaylists());
            expect(result).toEqual([]);
        });
    });

    describe('addPlaylist', () => {
        it('should add playlist via IndexedDB', async () => {
            const result = await firstValueFrom(
                service.addPlaylist(mockPlaylist)
            );
            expect(result).toBeDefined();
            expect(dbService.add).toHaveBeenCalledWith(
                DbStores.Playlists,
                mockPlaylist
            );
        });
    });

    describe('updatePlaylist', () => {
        it('should merge updated playlist with existing and persist', async () => {
            const updatedPlaylist = {
                ...mockPlaylist,
                title: 'Updated Title',
            };

            const result = await firstValueFrom(
                service.updatePlaylist('test-id-1', updatedPlaylist)
            );

            expect(result).toBeDefined();
            expect(result._id).toBe('test-id-1');
            expect(result.title).toBe('Updated Title');
            expect(result.updateState).toBe(PlaylistUpdateState.UPDATED);
        });

        it('should preserve existing favorites on update', async () => {
            const existing = {
                ...mockPlaylist,
                favorites: ['keep-me'],
            } as Playlist;
            (dbService.getByID as jest.Mock).mockReturnValue(of(existing));

            const update = { ...mockPlaylist, favorites: ['replace-me'] };
            const result = await firstValueFrom(
                service.updatePlaylist('test-id-1', update)
            );

            expect(result.favorites).toEqual(['keep-me']);
        });

        it('should set updateDate to current timestamp', async () => {
            const before = Date.now();
            const result = await firstValueFrom(
                service.updatePlaylist('test-id-1', mockPlaylist)
            );
            expect(result.updateDate).toBeGreaterThanOrEqual(before);
        });
    });

    describe('deletePlaylist', () => {
        it('should delete playlist and return success', async () => {
            const result = await firstValueFrom(
                service.deletePlaylist('test-id-1')
            );
            expect(result).toEqual({ success: true });
            expect(dbService.delete).toHaveBeenCalledWith(
                DbStores.Playlists,
                'test-id-1'
            );
        });
    });

    describe('updateFavorites', () => {
        it('should update favorites for a playlist', async () => {
            const result = await firstValueFrom(
                service.updateFavorites('test-id-1', ['ch1', 'ch2'])
            );
            expect(result).toBeDefined();
            expect(result.favorites).toEqual(['ch1', 'ch2']);
        });
    });

    describe('setFavorites', () => {
        it('should set favorites for a playlist', async () => {
            const result = await firstValueFrom(
                service.setFavorites('test-id-1', ['ch3', 'ch4'])
            );
            expect(result).toBeDefined();
            expect(result.favorites).toEqual(['ch3', 'ch4']);
        });
    });

    describe('handlePlaylistParsing', () => {
        it('should parse valid M3U content', () => {
            const m3u =
                '#EXTM3U\n#EXTINF:-1,Channel 1\nhttp://example.com/stream1';
            const result = service.handlePlaylistParsing(
                'TEXT',
                m3u,
                'My Playlist'
            );
            expect(result).toBeDefined();
            expect(result.title).toBe('My Playlist');
            expect(result.playlist).toBeDefined();
        });

        it('should include path for FILE uploads', () => {
            const m3u =
                '#EXTM3U\n#EXTINF:-1,Channel 1\nhttp://example.com/stream1';
            const result = service.handlePlaylistParsing(
                'FILE',
                m3u,
                'File Playlist',
                '/path/to/file.m3u'
            );
            expect(result).toBeDefined();
            expect(result.filePath).toBe('/path/to/file.m3u');
        });
    });

    describe('addManyPlaylists', () => {
        it('should bulk add playlists via IndexedDB', async () => {
            const playlists = [
                mockPlaylist,
                { ...mockPlaylist, _id: 'test-id-2' } as Playlist,
            ];
            const result = service.addManyPlaylists(playlists);
            await firstValueFrom(result as any);
            expect(dbService.bulkAdd).toHaveBeenCalledWith(
                DbStores.Playlists,
                playlists
            );
        });
    });

    describe('updateManyPlaylists', () => {
        it('should return empty array for empty input', async () => {
            const result = await firstValueFrom(
                service.updateManyPlaylists([])
            );
            expect(result).toEqual([]);
        });

        it('should update multiple playlists with autoRefresh and updateDate', async () => {
            const playlists = [mockPlaylist];
            await firstValueFrom(service.updateManyPlaylists(playlists));
            const updateCall = (dbService.update as jest.Mock).mock.calls[0];
            expect(updateCall[0]).toBe(DbStores.Playlists);
            expect(updateCall[1].autoRefresh).toBe(true);
            expect(updateCall[1].updateDate).toBeDefined();
        });
    });

    describe('removeAll', () => {
        it('should clear all playlists from IndexedDB', async () => {
            await firstValueFrom(service.removeAll());
            expect(dbService.clear).toHaveBeenCalledWith(DbStores.Playlists);
        });
    });

    describe('updatePlaylistMeta', () => {
        it('should update title when provided', async () => {
            const result = await firstValueFrom(
                service.updatePlaylistMeta({
                    _id: 'test-id-1',
                    title: 'New Title',
                } as any)
            );
            expect(result.title).toBe('New Title');
        });

        it('should update autoRefresh when provided', async () => {
            const result = await firstValueFrom(
                service.updatePlaylistMeta({
                    _id: 'test-id-1',
                    autoRefresh: true,
                } as any)
            );
            expect(result.autoRefresh).toBe(true);
        });

        it('should not overwrite fields that are not provided', async () => {
            const result = await firstValueFrom(
                service.updatePlaylistMeta({
                    _id: 'test-id-1',
                    title: 'New Title',
                } as any)
            );
            // Original favorites should be preserved
            expect(result.favorites).toEqual(mockPlaylist.favorites);
        });
    });

    describe('updatePlaylistPositions', () => {
        it('should return empty array for empty input', async () => {
            const result = await firstValueFrom(
                service.updatePlaylistPositions([])
            );
            expect(result).toEqual([]);
        });

        it('should update position for each playlist', async () => {
            const updates = [
                { id: 'test-id-1', changes: { position: 2 } },
            ];
            await firstValueFrom(service.updatePlaylistPositions(updates));
            expect(dbService.getByID).toHaveBeenCalledWith(
                DbStores.Playlists,
                'test-id-1'
            );
            const updateCall = (dbService.update as jest.Mock).mock.calls[0];
            expect(updateCall[1].position).toBe(2);
        });
    });
});
