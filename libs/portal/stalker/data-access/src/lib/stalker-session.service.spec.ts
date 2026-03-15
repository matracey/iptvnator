import { TestBed } from '@angular/core/testing';
import { DataService } from 'services';
import { Playlist, STALKER_REQUEST } from 'shared-interfaces';
import {
    StalkerSessionService,
    STALKER_SERIAL_NUMBER,
} from './stalker-session.service';

class MockDataService {
    sendIpcEvent = jest.fn();
    getAppVersion = jest.fn(() => '1.0.0');
    removeAllListeners = jest.fn();
    listenOn = jest.fn();
    getAppEnvironment = jest.fn(() => 'electron');
}

describe('StalkerSessionService', () => {
    let service: StalkerSessionService;
    let dataService: MockDataService;

    const mockPlaylist: Playlist = {
        _id: 'portal-1',
        title: 'Test Portal',
        portalUrl: 'http://portal.example.com/stalker_portal/c/',
        macAddress: '00:1A:79:AA:BB:CC',
        isFullStalkerPortal: true,
        stalkerSerialNumber: STALKER_SERIAL_NUMBER,
    } as Playlist;

    beforeAll(() => {
        // Polyfill crypto.subtle for Node.js/jsdom test environment
        if (!globalThis.crypto?.subtle) {
            Object.defineProperty(globalThis, 'crypto', {
                value: {
                    subtle: {
                        digest: jest.fn().mockResolvedValue(
                            new Uint8Array(20).buffer
                        ),
                    },
                    getRandomValues: (arr: Uint8Array) => arr,
                },
                writable: true,
                configurable: true,
            });
        }
    });

    beforeEach(() => {
        jest.spyOn(console, 'error').mockImplementation(() => undefined);
        jest.spyOn(console, 'log').mockImplementation(() => undefined);
        jest.spyOn(console, 'warn').mockImplementation(() => undefined);

        TestBed.configureTestingModule({
            providers: [
                StalkerSessionService,
                { provide: DataService, useClass: MockDataService },
            ],
        });

        service = TestBed.inject(StalkerSessionService);
        dataService = TestBed.inject(
            DataService
        ) as unknown as MockDataService;
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
        service.clearCachedToken('portal-1');
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('isFullStalkerPortal', () => {
        it('should return true for stalker_portal URLs', () => {
            expect(
                service.isFullStalkerPortal(
                    'http://example.com/stalker_portal/c/'
                )
            ).toBe(true);
        });

        it('should return true for server/load.php URLs', () => {
            expect(
                service.isFullStalkerPortal(
                    'http://example.com/server/load.php'
                )
            ).toBe(true);
        });

        it('should return false for simple API URLs', () => {
            expect(
                service.isFullStalkerPortal('http://example.com/api/channels')
            ).toBe(false);
        });
    });

    describe('token cache management', () => {
        it('should return null for uncached token', () => {
            expect(service.getCachedToken('unknown-id')).toBeNull();
        });

        it('should store and retrieve cached token', () => {
            service.setCachedToken('portal-1', 'test-token-123');
            expect(service.getCachedToken('portal-1')).toBe('test-token-123');
        });

        it('should clear cached token', () => {
            service.setCachedToken('portal-1', 'test-token-123');
            service.clearCachedToken('portal-1');
            expect(service.getCachedToken('portal-1')).toBeNull();
        });

        it('should manage tokens independently per playlist', () => {
            service.setCachedToken('portal-1', 'token-1');
            service.setCachedToken('portal-2', 'token-2');
            expect(service.getCachedToken('portal-1')).toBe('token-1');
            expect(service.getCachedToken('portal-2')).toBe('token-2');
            service.clearCachedToken('portal-1');
            expect(service.getCachedToken('portal-1')).toBeNull();
            expect(service.getCachedToken('portal-2')).toBe('token-2');
        });
    });

    describe('performHandshake', () => {
        it('should send handshake request and return token', async () => {
            dataService.sendIpcEvent.mockResolvedValue({
                js: { token: 'handshake-token-abc', random: 'random-val' },
            });

            const result = await service.performHandshake(
                mockPlaylist.portalUrl,
                mockPlaylist.macAddress
            );

            expect(result.token).toBe('handshake-token-abc');
            expect(result.random).toBe('random-val');
            expect(dataService.sendIpcEvent).toHaveBeenCalledWith(
                STALKER_REQUEST,
                expect.objectContaining({
                    url: mockPlaylist.portalUrl,
                    macAddress: mockPlaylist.macAddress,
                    params: expect.objectContaining({
                        type: 'stb',
                        action: 'handshake',
                    }),
                })
            );
        });

        it('should generate random when not in response', async () => {
            dataService.sendIpcEvent.mockResolvedValue({
                js: { token: 'token-no-random' },
            });

            const result = await service.performHandshake(
                mockPlaylist.portalUrl,
                mockPlaylist.macAddress
            );

            expect(result.token).toBe('token-no-random');
            expect(result.random).toBeDefined();
            expect(result.random.length).toBe(40);
        });

        it('should throw when no token in handshake response', async () => {
            dataService.sendIpcEvent.mockResolvedValue({
                js: { not_valid: 1 },
            });

            await expect(
                service.performHandshake(
                    mockPlaylist.portalUrl,
                    mockPlaylist.macAddress
                )
            ).rejects.toThrow('Handshake failed: No token received');
        });

        it('should propagate errors from IPC', async () => {
            dataService.sendIpcEvent.mockRejectedValue(
                new Error('IPC failure')
            );

            await expect(
                service.performHandshake(
                    mockPlaylist.portalUrl,
                    mockPlaylist.macAddress
                )
            ).rejects.toThrow('IPC failure');
        });
    });

    describe('doAuth', () => {
        it('should return true on successful auth', async () => {
            dataService.sendIpcEvent.mockResolvedValue({ js: true });

            const result = await service.doAuth(
                mockPlaylist.portalUrl,
                mockPlaylist.macAddress,
                'test-token'
            );

            expect(result).toBe(true);
            expect(dataService.sendIpcEvent).toHaveBeenCalledWith(
                STALKER_REQUEST,
                expect.objectContaining({
                    params: expect.objectContaining({
                        action: 'do_auth',
                    }),
                    token: 'test-token',
                })
            );
        });

        it('should return false when js is not true', async () => {
            dataService.sendIpcEvent.mockResolvedValue({ js: false });

            const result = await service.doAuth(
                mockPlaylist.portalUrl,
                mockPlaylist.macAddress,
                'test-token'
            );

            expect(result).toBe(false);
        });

        it('should propagate errors', async () => {
            dataService.sendIpcEvent.mockRejectedValue(
                new Error('Auth failed')
            );

            await expect(
                service.doAuth(
                    mockPlaylist.portalUrl,
                    mockPlaylist.macAddress,
                    'test-token'
                )
            ).rejects.toThrow('Auth failed');
        });
    });

    describe('ensureToken', () => {
        it('should return null token for non-full stalker portals', async () => {
            const simplePlaylist = {
                ...mockPlaylist,
                isFullStalkerPortal: false,
            } as Playlist;

            const result = await service.ensureToken(simplePlaylist);
            expect(result.token).toBeNull();
        });

        it('should return cached token if available', async () => {
            service.setCachedToken('portal-1', 'cached-token');

            const result = await service.ensureToken(mockPlaylist);
            expect(result.token).toBe('cached-token');
            expect(dataService.sendIpcEvent).not.toHaveBeenCalled();
        });

        it('should perform authentication when no cached token', async () => {
            // Mock handshake response
            dataService.sendIpcEvent
                .mockResolvedValueOnce({
                    js: { token: 'fresh-token', random: 'random-1' },
                })
                // Mock get_profile response
                .mockResolvedValueOnce({
                    js: { id: '1', name: 'Test' },
                });

            const result = await service.ensureToken(mockPlaylist);
            expect(result.token).toBe('fresh-token');
            expect(result.serialNumber).toBe(STALKER_SERIAL_NUMBER);
        });

        it('should throw when portalUrl is missing', async () => {
            const noUrlPlaylist = {
                ...mockPlaylist,
                portalUrl: '',
            } as Playlist;

            await expect(service.ensureToken(noUrlPlaylist)).rejects.toThrow(
                'Portal URL and MAC address are required'
            );
        });

        it('should use default serial number when not set', async () => {
            const noSerialPlaylist = {
                ...mockPlaylist,
                stalkerSerialNumber: undefined,
            } as Playlist;

            dataService.sendIpcEvent
                .mockResolvedValueOnce({
                    js: { token: 'new-token', random: 'r1' },
                })
                .mockResolvedValueOnce({ js: { id: '1' } });

            const result = await service.ensureToken(noSerialPlaylist);
            expect(result.serialNumber).toBe(STALKER_SERIAL_NUMBER);
        });
    });

    describe('makeAuthenticatedRequest', () => {
        it('should make request with token from ensureToken', async () => {
            service.setCachedToken('portal-1', 'my-token');

            const mockResponse = { js: { items: [] } };
            dataService.sendIpcEvent.mockResolvedValue(mockResponse);

            const result = await service.makeAuthenticatedRequest(
                mockPlaylist,
                { type: 'itv', action: 'get_all_channels' }
            );

            expect(result).toEqual(mockResponse);
            expect(dataService.sendIpcEvent).toHaveBeenCalledWith(
                STALKER_REQUEST,
                expect.objectContaining({
                    token: 'my-token',
                })
            );
        });

        it('should retry on authorization error when retryOnAuthFailure is true', async () => {
            service.setCachedToken('portal-1', 'expired-token');

            // First call returns auth failure, then handshake, profile, and final request
            dataService.sendIpcEvent
                .mockResolvedValueOnce({
                    message: 'Authorization failed. 75',
                })
                // Handshake for re-auth
                .mockResolvedValueOnce({
                    js: { token: 'new-token', random: 'r1' },
                })
                // Profile for re-auth
                .mockResolvedValueOnce({ js: { id: '1' } })
                // Retried request
                .mockResolvedValueOnce({ js: { items: ['data'] } });

            const result = await service.makeAuthenticatedRequest(
                mockPlaylist,
                { type: 'itv', action: 'get_all_channels' }
            );

            expect(result).toEqual({ js: { items: ['data'] } });
        });
    });

    describe('setActiveWatchdogPlaylist', () => {
        it('should not start watchdog for non-full stalker portal', () => {
            const simplePlaylist = {
                ...mockPlaylist,
                isFullStalkerPortal: false,
            } as Playlist;

            service.setActiveWatchdogPlaylist(simplePlaylist);
            // No error should occur
            expect(dataService.sendIpcEvent).not.toHaveBeenCalled();
        });

        it('should accept null to stop watchdog', () => {
            service.setActiveWatchdogPlaylist(null);
            // Should not throw
            expect(true).toBe(true);
        });
    });

    describe('STALKER_SERIAL_NUMBER', () => {
        it('should be a 13-character hex string', () => {
            expect(STALKER_SERIAL_NUMBER).toMatch(/^[0-9A-F]{13}$/);
        });
    });
});
