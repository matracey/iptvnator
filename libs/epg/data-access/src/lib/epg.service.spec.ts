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
});
