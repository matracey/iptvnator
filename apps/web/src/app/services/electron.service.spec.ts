import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import {
    AUTO_UPDATE_PLAYLISTS,
    PLAYLIST_PARSE_BY_URL,
    PLAYLIST_UPDATE,
    XTREAM_REQUEST,
    XTREAM_RESPONSE,
    ERROR,
    Playlist,
} from 'shared-interfaces';
import { ElectronService } from './electron.service';

describe('ElectronService', () => {
    let service: ElectronService;
    let snackBar: jest.Mocked<Partial<MatSnackBar>>;
    let store: jest.Mocked<Partial<Store>>;
    let translateService: jest.Mocked<Partial<TranslateService>>;

    const mockElectron: Record<string, jest.Mock> = {
        fetchPlaylistByUrl: jest.fn(),
        updatePlaylistFromFilePath: jest.fn(),
        openInMpv: jest.fn(),
        openInVlc: jest.fn(),
        autoUpdatePlaylists: jest.fn(),
        xtreamRequest: jest.fn(),
        stalkerRequest: jest.fn(),
        onPlayerError: jest.fn(),
    };

    beforeEach(() => {
        (window as any).electron = mockElectron;

        jest.spyOn(console, 'log').mockImplementation(() => undefined);
        jest.spyOn(console, 'error').mockImplementation(() => undefined);

        snackBar = { open: jest.fn() };
        store = { dispatch: jest.fn() };
        translateService = {
            instant: jest.fn(((key: string) => key) as any),
        };

        TestBed.configureTestingModule({
            providers: [
                ElectronService,
                { provide: MatSnackBar, useValue: snackBar },
                { provide: Store, useValue: store },
                { provide: TranslateService, useValue: translateService },
            ],
        });

        service = TestBed.inject(ElectronService);
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
        delete (window as any).electron;
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('getAppVersion', () => {
        it('should return the app version', () => {
            const version = service.getAppVersion();
            expect(version).toBeDefined();
            expect(typeof version).toBe('string');
        });
    });

    describe('getAppEnvironment', () => {
        it('should return electron', () => {
            expect(service.getAppEnvironment()).toBe('electron');
        });
    });

    describe('sendIpcEvent - PLAYLIST_PARSE_BY_URL', () => {
        it('should fetch playlist by URL and dispatch action on success', async () => {
            const mockPlaylist = { title: 'Test', items: [] } as any;
            mockElectron.fetchPlaylistByUrl.mockResolvedValue(mockPlaylist);

            await service.sendIpcEvent(PLAYLIST_PARSE_BY_URL, {
                url: 'http://example.com/playlist.m3u',
            });

            await new Promise((r) => setTimeout(r, 0));

            expect(mockElectron.fetchPlaylistByUrl).toHaveBeenCalledWith(
                'http://example.com/playlist.m3u'
            );
            expect(store.dispatch).toHaveBeenCalled();
        });

        it('should show error snackbar on fetch failure with 403', async () => {
            mockElectron.fetchPlaylistByUrl.mockRejectedValue({
                response: { status: 403 },
            });

            await service.sendIpcEvent(PLAYLIST_PARSE_BY_URL, {
                url: 'http://example.com/playlist.m3u',
            });

            await new Promise((r) => setTimeout(r, 0));

            expect(snackBar.open).toHaveBeenCalledWith(
                'HOME.URL_UPLOAD.ERROR_403',
                'CLOSE',
                expect.objectContaining({ duration: 5000 })
            );
        });

        it('should show error snackbar on fetch failure with 404', async () => {
            mockElectron.fetchPlaylistByUrl.mockRejectedValue({
                response: { status: 404 },
            });

            await service.sendIpcEvent(PLAYLIST_PARSE_BY_URL, {
                url: 'http://example.com/not-found.m3u',
            });

            await new Promise((r) => setTimeout(r, 0));

            expect(snackBar.open).toHaveBeenCalledWith(
                'HOME.URL_UPLOAD.ERROR_404',
                'CLOSE',
                expect.objectContaining({ duration: 5000 })
            );
        });
    });

    describe('sendIpcEvent - PLAYLIST_UPDATE', () => {
        it('should update playlist from URL and dispatch', async () => {
            const mockPlaylist = { title: 'Updated' } as any;
            mockElectron.fetchPlaylistByUrl.mockResolvedValue(mockPlaylist);

            await service.sendIpcEvent(PLAYLIST_UPDATE, {
                id: 'p1',
                url: 'http://example.com/playlist.m3u',
                title: 'Test',
            });

            await new Promise((r) => setTimeout(r, 0));

            expect(mockElectron.fetchPlaylistByUrl).toHaveBeenCalledWith(
                'http://example.com/playlist.m3u',
                'Test'
            );
            expect(store.dispatch).toHaveBeenCalled();
        });

        it('should update playlist from file path', async () => {
            const mockPlaylist = { title: 'From File' } as any;
            mockElectron.updatePlaylistFromFilePath.mockResolvedValue(
                mockPlaylist
            );

            await service.sendIpcEvent(PLAYLIST_UPDATE, {
                id: 'p1',
                filePath: '/path/to/file.m3u',
                title: 'Test',
            });

            await new Promise((r) => setTimeout(r, 0));

            expect(
                mockElectron.updatePlaylistFromFilePath
            ).toHaveBeenCalledWith('/path/to/file.m3u', 'Test');
            expect(store.dispatch).toHaveBeenCalled();
        });
    });

    describe('sendIpcEvent - XTREAM_REQUEST', () => {
        it('should forward xtream request and return result on success', async () => {
            const mockResponse = {
                payload: { streams: [] },
                action: 'get_live_streams',
            };
            mockElectron.xtreamRequest.mockResolvedValue(mockResponse);
            // Mock postMessage to avoid jsdom 2-arg requirement
            jest.spyOn(window, 'postMessage').mockImplementation(() => undefined);

            const result = await service.sendIpcEvent(XTREAM_REQUEST, {
                url: 'http://xtream.com',
                params: { action: 'get_live_streams' },
            });

            expect(result).toEqual(
                expect.objectContaining({
                    type: XTREAM_RESPONSE,
                    payload: { streams: [] },
                })
            );
        });

        it('should return error result on xtream failure', async () => {
            mockElectron.xtreamRequest.mockRejectedValue(
                new Error('Connection refused')
            );

            const result = await service.sendIpcEvent(XTREAM_REQUEST, {
                url: 'http://xtream.com',
                params: { action: 'get_live_streams' },
            });

            expect(result).toEqual(
                expect.objectContaining({
                    type: ERROR,
                    message: 'Connection refused',
                })
            );
        });

        it('should silently log errors for background xtream actions', async () => {
            mockElectron.xtreamRequest.mockRejectedValue(
                new Error('Timeout')
            );

            const result = await service.sendIpcEvent(XTREAM_REQUEST, {
                url: 'http://xtream.com',
                params: { action: 'get_live_categories' },
            });

            expect(result).toEqual(
                expect.objectContaining({ type: ERROR })
            );
            // Silent actions should not show snackbar
            expect(snackBar.open).not.toHaveBeenCalled();
        });
    });

    describe('sendIpcEvent - STALKER_REQUEST', () => {
        it('should forward stalker request via IPC', async () => {
            const mockResponse = { js: { items: [] } };
            mockElectron.stalkerRequest.mockResolvedValue(mockResponse);

            const result = await service.sendIpcEvent('STALKER_REQUEST', {
                url: 'http://portal.com',
                macAddress: '00:1A:79:AA:BB:CC',
                params: { action: 'get_channels' },
            });

            expect(result).toEqual(mockResponse);
            expect(mockElectron.stalkerRequest).toHaveBeenCalledWith(
                expect.objectContaining({
                    url: 'http://portal.com',
                    macAddress: '00:1A:79:AA:BB:CC',
                })
            );
        });

        it('should show error on stalker request failure', async () => {
            mockElectron.stalkerRequest.mockRejectedValue(
                new Error('Portal unreachable')
            );

            await expect(
                service.sendIpcEvent('STALKER_REQUEST', {
                    url: 'http://portal.com',
                    macAddress: '00:1A:79:AA:BB:CC',
                    params: { action: 'get_channels' },
                })
            ).rejects.toThrow();

            expect(snackBar.open).toHaveBeenCalled();
        });
    });

    describe('sendIpcEvent - OPEN_MPV_PLAYER', () => {
        it('should open MPV player with URL and options', async () => {
            mockElectron.openInMpv.mockResolvedValue({ sessionId: '1' });

            await service.sendIpcEvent('OPEN_MPV_PLAYER', {
                url: 'http://stream.com/live',
                title: 'Live Stream',
                thumbnail: 'http://img.com/thumb.jpg',
            });

            expect(mockElectron.openInMpv).toHaveBeenCalledWith(
                'http://stream.com/live',
                'Live Stream',
                'http://img.com/thumb.jpg',
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined
            );
        });

        it('should show error snackbar on MPV launch failure', async () => {
            mockElectron.openInMpv.mockRejectedValue(
                new Error('MPV not found')
            );

            await expect(
                service.sendIpcEvent('OPEN_MPV_PLAYER', {
                    url: 'http://stream.com/live',
                })
            ).rejects.toThrow('MPV not found');

            expect(snackBar.open).toHaveBeenCalledWith(
                expect.stringContaining('Error launching MPV'),
                'Close',
                expect.any(Object)
            );
        });
    });

    describe('sendIpcEvent - OPEN_VLC_PLAYER', () => {
        it('should open VLC player with URL', async () => {
            mockElectron.openInVlc.mockResolvedValue({ sessionId: '2' });

            await service.sendIpcEvent('OPEN_VLC_PLAYER', {
                url: 'http://stream.com/live',
                title: 'VLC Stream',
                thumbnail: '',
            });

            expect(mockElectron.openInVlc).toHaveBeenCalled();
        });

        it('should show error snackbar on VLC launch failure', async () => {
            mockElectron.openInVlc.mockRejectedValue(
                new Error('VLC not installed')
            );

            await expect(
                service.sendIpcEvent('OPEN_VLC_PLAYER', {
                    url: 'http://stream.com/live',
                })
            ).rejects.toThrow('VLC not installed');

            expect(snackBar.open).toHaveBeenCalledWith(
                expect.stringContaining('Error launching VLC'),
                'Close',
                expect.any(Object)
            );
        });
    });

    describe('sendIpcEvent - AUTO_UPDATE_PLAYLISTS', () => {
        it('should auto-update playlists and dispatch', async () => {
            const playlists = [{ _id: 'p1', title: 'Updated' }] as any;
            mockElectron.autoUpdatePlaylists.mockResolvedValue(playlists);

            const result = await service.sendIpcEvent(
                AUTO_UPDATE_PLAYLISTS,
                [{ _id: 'p1' }]
            );

            expect(result).toEqual(playlists);
            expect(store.dispatch).toHaveBeenCalled();
            expect(snackBar.open).toHaveBeenCalledWith(
                'HOME.PLAYLISTS.AUTO_REFRESH_UPDATE_SUCCESS',
                null,
                expect.objectContaining({ duration: 2000 })
            );
        });
    });

    describe('sendIpcEvent - unknown type', () => {
        it('should log unknown type and return undefined', async () => {
            const result = await service.sendIpcEvent('UNKNOWN_TYPE');
            expect(result).toBeUndefined();
        });
    });

    describe('removeAllListeners', () => {
        it('should not throw when removing listeners', () => {
            expect(() => service.removeAllListeners('test')).not.toThrow();
        });

        it('should not throw when removing all listeners', () => {
            expect(() => service.removeAllListeners('all')).not.toThrow();
        });
    });

    describe('listenOn', () => {
        it('should add window message event listener', () => {
            const spy = jest.spyOn(window, 'addEventListener');
            const callback = jest.fn();
            service.listenOn('test-command', callback);
            expect(spy).toHaveBeenCalledWith('message', callback);
        });
    });
});
