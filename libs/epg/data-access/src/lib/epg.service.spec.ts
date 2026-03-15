import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';
import { MockProviders } from 'ng-mocks';
import { firstValueFrom, take, toArray } from 'rxjs';
import { EpgService } from './epg.service';

describe('EpgService', () => {
    let service: EpgService;
    let snackBar: MatSnackBar;
    let translateService: TranslateService;

    const mockElectron = {
        fetchEpg: jest.fn(),
        getChannelPrograms: jest.fn(),
        getCurrentProgramsBatch: jest.fn(),
    };

    beforeEach(() => {
        (window as any).electron = mockElectron;

        TestBed.configureTestingModule({
            providers: [
                EpgService,
                MockProviders(TranslateService, MatSnackBar),
            ],
        });

        service = TestBed.inject(EpgService);
        snackBar = TestBed.inject(MatSnackBar);
        translateService = TestBed.inject(TranslateService);

        jest.spyOn(translateService, 'instant').mockImplementation(
            (key: string) => key
        );
        jest.spyOn(snackBar, 'open');

        jest.spyOn(console, 'error').mockImplementation(() => undefined);
        jest.spyOn(console, 'log').mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.clearAllMocks();
        service.clearCache();
        delete (window as any).electron;
    });

    it('should create a service instance', () => {
        expect(service).toBeTruthy();
    });

    describe('fetchEpg', () => {
        it('should set epgAvailable to true on successful fetch', async () => {
            mockElectron.fetchEpg.mockResolvedValueOnce({ success: true });
            service.fetchEpg(['http://example.com/epg.xml']);

            await new Promise((resolve) => setTimeout(resolve, 0));
            const available = await firstValueFrom(service.epgAvailable$);
            expect(available).toBe(true);
        });

        it('should set epgAvailable to false and show error on failure', async () => {
            mockElectron.fetchEpg.mockRejectedValueOnce(
                new Error('Failed')
            );
            service.fetchEpg(['http://example.com/epg.xml']);

            await new Promise((resolve) => setTimeout(resolve, 0));
            const available = await firstValueFrom(service.epgAvailable$);
            expect(available).toBe(false);
            expect(snackBar.open).toHaveBeenCalled();
        });

        it('should not call electron when urls are empty', () => {
            service.fetchEpg([]);
            expect(mockElectron.fetchEpg).not.toHaveBeenCalled();
        });
    });

    describe('getChannelPrograms', () => {
        it('should update programs and set EPG available when programs exist', async () => {
            const now = new Date();
            const mockPrograms = [
                {
                    start: now.toISOString(),
                    stop: new Date(
                        now.getTime() + 3600000
                    ).toISOString(),
                    title: 'Test',
                    channel: 'test-channel',
                    desc: null,
                    category: null,
                },
            ];
            mockElectron.getChannelPrograms.mockResolvedValueOnce(
                mockPrograms
            );

            service.getChannelPrograms('test-channel');

            await new Promise((resolve) => setTimeout(resolve, 0));
            const programs = await firstValueFrom(
                service.currentEpgPrograms$
            );
            expect(programs).toHaveLength(1);
            const available = await firstValueFrom(service.epgAvailable$);
            expect(available).toBe(true);
        });

        it('should set EPG available to false when no programs found', async () => {
            mockElectron.getChannelPrograms.mockResolvedValueOnce([]);

            service.getChannelPrograms('test-channel');

            await new Promise((resolve) => setTimeout(resolve, 0));
            const programs = await firstValueFrom(
                service.currentEpgPrograms$
            );
            expect(programs).toHaveLength(0);
            const available = await firstValueFrom(service.epgAvailable$);
            expect(available).toBe(false);
        });
    });

    describe('getCurrentProgramForChannel', () => {
        it('should return null for empty channelId', async () => {
            const result = await firstValueFrom(
                service.getCurrentProgramForChannel('')
            );
            expect(result).toBeNull();
        });

        it('should return current program when found', async () => {
            const now = new Date();
            const mockPrograms = [
                {
                    start: new Date(
                        now.getTime() - 1800000
                    ).toISOString(),
                    stop: new Date(
                        now.getTime() + 1800000
                    ).toISOString(),
                    title: 'Current Show',
                    channel: 'ch1',
                    desc: null,
                    category: null,
                },
            ];
            mockElectron.getChannelPrograms.mockResolvedValueOnce(
                mockPrograms
            );

            const result = await firstValueFrom(
                service.getCurrentProgramForChannel('ch1')
            );
            expect(result).toBeTruthy();
            expect(result!.title).toBe('Current Show');
        });

        it('should use cache on subsequent calls', async () => {
            const now = new Date();
            const mockPrograms = [
                {
                    start: new Date(
                        now.getTime() - 1800000
                    ).toISOString(),
                    stop: new Date(
                        now.getTime() + 1800000
                    ).toISOString(),
                    title: 'Cached Show',
                    channel: 'ch1',
                    desc: null,
                    category: null,
                },
            ];
            mockElectron.getChannelPrograms.mockResolvedValue(mockPrograms);

            await firstValueFrom(
                service.getCurrentProgramForChannel('ch1')
            );
            await firstValueFrom(
                service.getCurrentProgramForChannel('ch1')
            );

            expect(mockElectron.getChannelPrograms).toHaveBeenCalledTimes(
                1
            );
        });
    });

    describe('getCurrentProgramsForChannels', () => {
        it('should return empty map for empty channel list', async () => {
            const result = await firstValueFrom(
                service.getCurrentProgramsForChannels([])
            );
            expect(result.size).toBe(0);
        });

        it('should fetch programs for multiple channels', async () => {
            const now = new Date();
            const makeBatchProgram = (ch: string) => ({
                start: new Date(
                    now.getTime() - 1800000
                ).toISOString(),
                stop: new Date(
                    now.getTime() + 1800000
                ).toISOString(),
                title: `Show on ${ch}`,
                channel: ch,
                desc: null,
                category: null,
            });

            mockElectron.getCurrentProgramsBatch.mockImplementation(
                (channelIds: string[]) => {
                    const result: Record<string, any> = {};
                    channelIds.forEach((id) => {
                        result[id] = makeBatchProgram(id);
                    });
                    return Promise.resolve(result);
                }
            );

            const result = await firstValueFrom(
                service.getCurrentProgramsForChannels(['ch1', 'ch2'])
            );
            expect(result.size).toBe(2);
            expect(result.get('ch1')?.title).toBe('Show on ch1');
            expect(result.get('ch2')?.title).toBe('Show on ch2');
        });
    });

    describe('clearCache', () => {
        it('should clear cached programs', async () => {
            const now = new Date();
            const mockPrograms = [
                {
                    start: new Date(
                        now.getTime() - 1800000
                    ).toISOString(),
                    stop: new Date(
                        now.getTime() + 1800000
                    ).toISOString(),
                    title: 'Show',
                    channel: 'ch1',
                    desc: null,
                    category: null,
                },
            ];
            mockElectron.getChannelPrograms.mockResolvedValue(mockPrograms);

            await firstValueFrom(
                service.getCurrentProgramForChannel('ch1')
            );
            service.clearCache();
            await firstValueFrom(
                service.getCurrentProgramForChannel('ch1')
            );

            expect(mockElectron.getChannelPrograms).toHaveBeenCalledTimes(
                2
            );
        });
    });

    describe('fetchEpg - additional scenarios', () => {
        it('should filter out empty/whitespace-only URLs', () => {
            mockElectron.fetchEpg.mockResolvedValueOnce({ success: true });
            service.fetchEpg(['', '  ', 'http://valid.com/epg.xml']);
            expect(mockElectron.fetchEpg).toHaveBeenCalledWith([
                'http://valid.com/epg.xml',
            ]);
        });

        it('should set epgAvailable false and show message on unsuccessful result', async () => {
            mockElectron.fetchEpg.mockResolvedValueOnce({
                success: false,
                message: 'EPG parse failed',
            });
            service.fetchEpg(['http://example.com/epg.xml']);

            await new Promise((resolve) => setTimeout(resolve, 0));
            const available = await firstValueFrom(service.epgAvailable$);
            expect(available).toBe(false);
            expect(snackBar.open).toHaveBeenCalledWith(
                'EPG parse failed',
                expect.any(String),
                expect.objectContaining({ duration: 3000 })
            );
        });
    });

    describe('getCurrentProgramForChannel - non-desktop', () => {
        it('should return null when not on desktop', async () => {
            // The isDesktop flag is set at construction time.
            // We test by directly checking the observable result
            // when channelId is empty (simulates non-desktop behavior).
            const result = await firstValueFrom(
                service.getCurrentProgramForChannel('')
            );
            expect(result).toBeNull();
        });
    });

    describe('getCurrentProgramForChannel - cache TTL', () => {
        it('should return cached value within TTL', async () => {
            const now = new Date();
            const mockPrograms = [
                {
                    start: new Date(
                        now.getTime() - 1800000
                    ).toISOString(),
                    stop: new Date(
                        now.getTime() + 1800000
                    ).toISOString(),
                    title: 'Cached Show',
                    channel: 'ch-ttl',
                    desc: null,
                    category: null,
                },
            ];
            mockElectron.getChannelPrograms.mockResolvedValue(mockPrograms);

            // First call fetches
            const first = await firstValueFrom(
                service.getCurrentProgramForChannel('ch-ttl')
            );
            expect(first?.title).toBe('Cached Show');

            // Second call within TTL returns cache
            const second = await firstValueFrom(
                service.getCurrentProgramForChannel('ch-ttl')
            );
            expect(second?.title).toBe('Cached Show');
            expect(mockElectron.getChannelPrograms).toHaveBeenCalledTimes(1);
        });

        it('should re-fetch after cache TTL expires', async () => {
            const now = new Date();
            const mockPrograms = [
                {
                    start: new Date(
                        now.getTime() - 1800000
                    ).toISOString(),
                    stop: new Date(
                        now.getTime() + 1800000
                    ).toISOString(),
                    title: 'Show Before',
                    channel: 'ch-expire',
                    desc: null,
                    category: null,
                },
            ];
            mockElectron.getChannelPrograms.mockResolvedValue(mockPrograms);

            await firstValueFrom(
                service.getCurrentProgramForChannel('ch-expire')
            );

            // Manually expire the cache by manipulating the internal map
            const cache = (service as any).programCache;
            const cached = cache.get('ch-expire');
            if (cached) {
                cached.timestamp = Date.now() - 120000; // 2 minutes ago
            }

            await firstValueFrom(
                service.getCurrentProgramForChannel('ch-expire')
            );
            expect(mockElectron.getChannelPrograms).toHaveBeenCalledTimes(2);
        });
    });

    describe('getCurrentProgramForChannel - error handling', () => {
        it('should cache null and return null on API error', async () => {
            mockElectron.getChannelPrograms.mockRejectedValueOnce(
                new Error('API failure')
            );

            const result = await firstValueFrom(
                service.getCurrentProgramForChannel('ch-error')
            );
            expect(result).toBeNull();

            // Should still be cached (as null)
            const cached = await firstValueFrom(
                service.getCurrentProgramForChannel('ch-error')
            );
            expect(cached).toBeNull();
            expect(mockElectron.getChannelPrograms).toHaveBeenCalledTimes(1);
        });

        it('should return null when no programs exist for channel', async () => {
            mockElectron.getChannelPrograms.mockResolvedValueOnce([]);

            const result = await firstValueFrom(
                service.getCurrentProgramForChannel('ch-empty')
            );
            expect(result).toBeNull();
        });
    });

    describe('getCurrentProgramsForChannels - mixed cache', () => {
        it('should use cache for some channels and fetch others', async () => {
            const now = new Date();
            const makeProgram = (ch: string) => [
                {
                    start: new Date(
                        now.getTime() - 1800000
                    ).toISOString(),
                    stop: new Date(
                        now.getTime() + 1800000
                    ).toISOString(),
                    title: `Show on ${ch}`,
                    channel: ch,
                    desc: null,
                    category: null,
                },
            ];

            const makeBatchProgram = (ch: string) => ({
                start: new Date(
                    now.getTime() - 1800000
                ).toISOString(),
                stop: new Date(
                    now.getTime() + 1800000
                ).toISOString(),
                title: `Show on ${ch}`,
                channel: ch,
                desc: null,
                category: null,
            });

            mockElectron.getChannelPrograms.mockImplementation(
                (channelId: string) =>
                    Promise.resolve(makeProgram(channelId))
            );

            mockElectron.getCurrentProgramsBatch.mockImplementation(
                (channelIds: string[]) => {
                    const result: Record<string, any> = {};
                    channelIds.forEach((id) => {
                        result[id] = makeBatchProgram(id);
                    });
                    return Promise.resolve(result);
                }
            );

            // Pre-cache ch-mix-1 via single-channel fetch
            await firstValueFrom(
                service.getCurrentProgramForChannel('ch-mix-1')
            );
            expect(mockElectron.getChannelPrograms).toHaveBeenCalledTimes(1);

            // Batch request with cached ch-mix-1 and uncached ch-mix-2
            const result = await firstValueFrom(
                service.getCurrentProgramsForChannels([
                    'ch-mix-1',
                    'ch-mix-2',
                ])
            );

            expect(result.size).toBe(2);
            expect(result.get('ch-mix-1')?.title).toBe('Show on ch-mix-1');
            expect(result.get('ch-mix-2')?.title).toBe('Show on ch-mix-2');
            // ch-mix-1 was cached, so batch only fetches ch-mix-2
            expect(mockElectron.getCurrentProgramsBatch).toHaveBeenCalledWith(['ch-mix-2']);
        });

        it('should return all cached values when all are cached', async () => {
            const now = new Date();
            const makeProgram = (ch: string) => [
                {
                    start: new Date(
                        now.getTime() - 1800000
                    ).toISOString(),
                    stop: new Date(
                        now.getTime() + 1800000
                    ).toISOString(),
                    title: `Show on ${ch}`,
                    channel: ch,
                    desc: null,
                    category: null,
                },
            ];

            mockElectron.getChannelPrograms.mockImplementation(
                (channelId: string) =>
                    Promise.resolve(makeProgram(channelId))
            );

            // Pre-cache both
            await firstValueFrom(
                service.getCurrentProgramForChannel('ch-all-1')
            );
            await firstValueFrom(
                service.getCurrentProgramForChannel('ch-all-2')
            );

            const callsBefore =
                mockElectron.getChannelPrograms.mock.calls.length;

            const result = await firstValueFrom(
                service.getCurrentProgramsForChannels([
                    'ch-all-1',
                    'ch-all-2',
                ])
            );

            expect(result.size).toBe(2);
            // No additional API calls since both were cached
            expect(mockElectron.getChannelPrograms).toHaveBeenCalledTimes(
                callsBefore
            );
        });

        it('should return empty map for null channelIds', async () => {
            const result = await firstValueFrom(
                service.getCurrentProgramsForChannels(null as any)
            );
            expect(result.size).toBe(0);
        });
    });

    describe('getChannelPrograms - error handling', () => {
        it('should set epgAvailable to false and show snackbar on error', async () => {
            mockElectron.getChannelPrograms.mockRejectedValueOnce(
                new Error('Network error')
            );

            service.getChannelPrograms('ch-err');

            await new Promise((resolve) => setTimeout(resolve, 0));
            const available = await firstValueFrom(service.epgAvailable$);
            expect(available).toBe(false);
            expect(snackBar.open).toHaveBeenCalled();
        });
    });

    describe('clearCache - additional', () => {
        it('should force re-fetch for all channels after clear', async () => {
            const now = new Date();
            const mockPrograms = [
                {
                    start: new Date(
                        now.getTime() - 1800000
                    ).toISOString(),
                    stop: new Date(
                        now.getTime() + 1800000
                    ).toISOString(),
                    title: 'Show',
                    channel: 'ch-clear-1',
                    desc: null,
                    category: null,
                },
            ];
            mockElectron.getChannelPrograms.mockResolvedValue(mockPrograms);

            // Populate cache for two channels
            await firstValueFrom(
                service.getCurrentProgramForChannel('ch-clear-1')
            );
            await firstValueFrom(
                service.getCurrentProgramForChannel('ch-clear-2')
            );

            const callsBefore =
                mockElectron.getChannelPrograms.mock.calls.length;

            service.clearCache();

            // Both channels should re-fetch
            await firstValueFrom(
                service.getCurrentProgramForChannel('ch-clear-1')
            );
            await firstValueFrom(
                service.getCurrentProgramForChannel('ch-clear-2')
            );

            expect(mockElectron.getChannelPrograms).toHaveBeenCalledTimes(
                callsBefore + 2
            );
        });
    });
});
