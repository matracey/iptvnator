import { TestBed } from '@angular/core/testing';
import {
    HttpTestingController,
    provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SwUpdate, VersionEvent } from '@angular/service-worker';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import {
    PLAYLIST_PARSE_BY_URL,
    PLAYLIST_UPDATE,
    XTREAM_REQUEST,
    XTREAM_RESPONSE,
    STALKER_REQUEST,
    ERROR,
} from 'shared-interfaces';
import { PwaService } from './pwa.service';
import { Subject } from 'rxjs';

describe('PwaService', () => {
    let service: PwaService;
    let httpMock: HttpTestingController;
    let snackBar: jest.Mocked<Partial<MatSnackBar>>;
    let store: jest.Mocked<Partial<Store>>;
    let translateService: jest.Mocked<Partial<TranslateService>>;
    let versionUpdates$: Subject<VersionEvent>;

    beforeEach(() => {
        jest.spyOn(console, 'log').mockImplementation(() => undefined);
        jest.spyOn(console, 'error').mockImplementation(() => undefined);

        snackBar = {
            open: jest.fn().mockReturnValue({
                onAction: jest.fn().mockReturnValue({ subscribe: jest.fn() }),
            }),
        };
        store = { dispatch: jest.fn() };
        translateService = {
            instant: jest.fn(((key: string) => key) as any),
        };
        versionUpdates$ = new Subject<VersionEvent>();

        TestBed.configureTestingModule({
            providers: [
                PwaService,
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: MatSnackBar, useValue: snackBar },
                { provide: Store, useValue: store },
                { provide: TranslateService, useValue: translateService },
                {
                    provide: SwUpdate,
                    useValue: { versionUpdates: versionUpdates$ },
                },
            ],
        });

        service = TestBed.inject(PwaService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
        jest.clearAllMocks();
        jest.restoreAllMocks();
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
        it('should return pwa', () => {
            expect(service.getAppEnvironment()).toBe('pwa');
        });
    });

    describe('sendIpcEvent - PLAYLIST_PARSE_BY_URL', () => {
        it('should fetch playlist from URL and dispatch action', () => {
            service.sendIpcEvent(PLAYLIST_PARSE_BY_URL, {
                url: 'http://example.com/playlist.m3u',
            });

            const req = httpMock.expectOne(
                (r) =>
                    r.url.includes('/parse') &&
                    r.params.get('url') ===
                        'http://example.com/playlist.m3u'
            );
            req.flush({ title: 'Test Playlist', items: [] });

            expect(store.dispatch).toHaveBeenCalled();
        });

        it('should show error on fetch failure', () => {
            service.sendIpcEvent(PLAYLIST_PARSE_BY_URL, {
                url: 'http://example.com/bad.m3u',
            });

            const req = httpMock.expectOne((r) => r.url.includes('/parse'));
            req.flush(null, { status: 404, statusText: 'Not Found' });

            expect(snackBar.open).toHaveBeenCalledWith(
                expect.any(String),
                'Close',
                expect.objectContaining({ duration: 5000 })
            );
        });

        it('should return undefined', () => {
            const result = service.sendIpcEvent(PLAYLIST_PARSE_BY_URL, {
                url: 'http://example.com/playlist.m3u',
            });
            httpMock
                .expectOne((r) => r.url.includes('/parse'))
                .flush({});
            expect(result).toBeUndefined();
        });
    });

    describe('sendIpcEvent - PLAYLIST_UPDATE', () => {
        it('should refresh playlist and dispatch update', () => {
            service.sendIpcEvent(PLAYLIST_UPDATE, {
                id: 'p1',
                url: 'http://example.com/playlist.m3u',
            });

            const req = httpMock.expectOne((r) => r.url.includes('/parse'));
            req.flush({ title: 'Updated', items: [] });

            expect(store.dispatch).toHaveBeenCalled();
            expect(snackBar.open).toHaveBeenCalledWith(
                'HOME.PLAYLISTS.PLAYLIST_UPDATE_SUCCESS',
                null,
                expect.objectContaining({ duration: 2000 })
            );
        });

        it('should return undefined', () => {
            const result = service.sendIpcEvent(PLAYLIST_UPDATE, {
                id: 'p1',
                url: 'http://example.com/playlist.m3u',
            });
            httpMock
                .expectOne((r) => r.url.includes('/parse'))
                .flush({});
            expect(result).toBeUndefined();
        });
    });

    describe('sendIpcEvent - XTREAM_REQUEST', () => {
        it('should forward xtream request via HTTP proxy', () => {
            jest.spyOn(window, 'postMessage').mockImplementation(() => undefined);

            service.sendIpcEvent(XTREAM_REQUEST, {
                url: 'http://xtream.com',
                params: { action: 'get_live_streams', username: 'u', password: 'p' },
            });

            const req = httpMock.expectOne((r) =>
                r.url.includes('/xtream')
            );
            req.flush({ payload: { streams: [] } });
        });

        it('should return undefined for unknown type', () => {
            const result = service.sendIpcEvent('UNKNOWN_TYPE', {});
            expect(result).toBeUndefined();
        });
    });

    describe('sendIpcEvent - STALKER_REQUEST', () => {
        it('should forward stalker request', () => {
            service.sendIpcEvent(STALKER_REQUEST, {
                url: 'http://portal.com',
                macAddress: '00:1A:79:AA:BB:CC',
                params: { action: 'get_channels' },
            });
            // Stalker uses fetch API, not HttpClient - so no httpMock expectation
        });
    });

    describe('refreshPlaylist', () => {
        it('should dispatch updatePlaylist on success', () => {
            service.refreshPlaylist({
                id: 'p1',
                url: 'http://example.com/playlist.m3u',
            });

            const req = httpMock.expectOne((r) => r.url.includes('/parse'));
            req.flush({ title: 'Refreshed', items: [] });

            expect(store.dispatch).toHaveBeenCalled();
        });

        it('should show error with correct message for 404', () => {
            service.refreshPlaylist({
                id: 'p1',
                url: 'http://example.com/playlist.m3u',
            });

            const req = httpMock.expectOne((r) => r.url.includes('/parse'));
            req.flush(null, { status: 404, statusText: 'Not Found' });

            expect(snackBar.open).toHaveBeenCalledWith(
                'HOME.URL_UPLOAD.ERROR_404',
                'CLOSE',
                expect.objectContaining({ duration: 5000 })
            );
        });

        it('should show error with correct message for 403', () => {
            service.refreshPlaylist({
                id: 'p1',
                url: 'http://example.com/playlist.m3u',
            });

            const req = httpMock.expectOne((r) => r.url.includes('/parse'));
            req.flush(null, { status: 403, statusText: 'Forbidden' });

            expect(snackBar.open).toHaveBeenCalledWith(
                'HOME.URL_UPLOAD.ERROR_403',
                'CLOSE',
                expect.objectContaining({ duration: 5000 })
            );
        });

        it('should show error with correct message for 401', () => {
            service.refreshPlaylist({
                id: 'p1',
                url: 'http://example.com/playlist.m3u',
            });

            const req = httpMock.expectOne((r) => r.url.includes('/parse'));
            req.flush(null, { status: 401, statusText: 'Unauthorized' });

            expect(snackBar.open).toHaveBeenCalledWith(
                'HOME.URL_UPLOAD.ERROR_401',
                'CLOSE',
                expect.objectContaining({ duration: 5000 })
            );
        });
    });

    describe('getErrorMessageByStatusCode', () => {
        it('should return 413 message directly', () => {
            const msg = service.getErrorMessageByStatusCode(413);
            expect(msg).toContain('too big');
        });

        it('should return translated key for 403', () => {
            const msg = service.getErrorMessageByStatusCode(403);
            expect(msg).toBe('HOME.URL_UPLOAD.ERROR_403');
        });

        it('should return translated key for 404', () => {
            const msg = service.getErrorMessageByStatusCode(404);
            expect(msg).toBe('HOME.URL_UPLOAD.ERROR_404');
        });

        it('should return translated key for 401', () => {
            const msg = service.getErrorMessageByStatusCode(401);
            expect(msg).toBe('HOME.URL_UPLOAD.ERROR_401');
        });

        it('should return generic error for unknown status', () => {
            const msg = service.getErrorMessageByStatusCode(500);
            expect(msg).toBe('HOME.URL_UPLOAD.ERROR_FETCH_FAILED');
        });
    });

    describe('fetchFromUrl', () => {
        it('should dispatch addPlaylistByUrl on success', () => {
            service.fetchFromUrl({
                url: 'http://example.com/test.m3u',
            });

            const req = httpMock.expectOne((r) => r.url.includes('/parse'));
            req.flush({ title: 'New Playlist', items: [] });

            expect(store.dispatch).toHaveBeenCalled();
        });

        it('should handle temporary playlist flag', () => {
            service.fetchFromUrl({
                url: 'http://example.com/temp.m3u',
                isTemporary: true,
            } as any);

            const req = httpMock.expectOne((r) => r.url.includes('/parse'));
            req.flush({ title: 'Temp', items: [] });

            expect(store.dispatch).toHaveBeenCalled();
        });
    });

    describe('removeAllListeners', () => {
        it('should not throw', () => {
            expect(() => service.removeAllListeners()).not.toThrow();
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

    describe('getPlaylistFromUrl', () => {
        it('should make HTTP GET request to parse endpoint', () => {
            service.getPlaylistFromUrl('http://example.com/test.m3u').subscribe();

            const req = httpMock.expectOne(
                (r) =>
                    r.url.includes('/parse') &&
                    r.params.get('url') === 'http://example.com/test.m3u'
            );
            expect(req.request.method).toBe('GET');
            req.flush({});
        });
    });
});
