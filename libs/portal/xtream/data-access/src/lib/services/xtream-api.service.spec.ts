import { TestBed } from '@angular/core/testing';
import { DataService } from 'services';
import {
    XTREAM_REQUEST,
    XtreamCodeActions,
} from 'shared-interfaces';
import { XtreamApiService, XtreamCredentials } from './xtream-api.service';

class MockDataService {
    sendIpcEvent = jest.fn();
    getAppVersion = jest.fn(() => '1.0.0');
    removeAllListeners = jest.fn();
    listenOn = jest.fn();
    getAppEnvironment = jest.fn(() => 'electron');
}

describe('XtreamApiService', () => {
    let service: XtreamApiService;
    let dataService: MockDataService;

    const mockCredentials: XtreamCredentials = {
        serverUrl: 'http://xtream.example.com',
        username: 'testuser',
        password: 'testpass',
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                XtreamApiService,
                { provide: DataService, useClass: MockDataService },
            ],
        });

        service = TestBed.inject(XtreamApiService);
        dataService = TestBed.inject(DataService) as unknown as MockDataService;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('getAccountInfo', () => {
        it('should send request with GetAccountInfo action', async () => {
            const mockAccount = { user_info: { username: 'testuser' } };
            (dataService.sendIpcEvent as jest.Mock).mockResolvedValue({
                payload: mockAccount,
            });

            const result = await service.getAccountInfo(mockCredentials);
            expect(dataService.sendIpcEvent).toHaveBeenCalledWith(
                XTREAM_REQUEST,
                expect.objectContaining({
                    url: mockCredentials.serverUrl,
                    params: expect.objectContaining({
                        action: XtreamCodeActions.GetAccountInfo,
                        username: mockCredentials.username,
                        password: mockCredentials.password,
                    }),
                })
            );
            expect(result).toEqual(mockAccount);
        });

        it('should throw on error response', async () => {
            (dataService.sendIpcEvent as jest.Mock).mockResolvedValue({
                type: 'ERROR',
                message: 'Auth failed',
            });

            await expect(
                service.getAccountInfo(mockCredentials)
            ).rejects.toThrow('Auth failed');
        });
    });

    describe('getCategories', () => {
        it('should fetch live categories', async () => {
            const mockCategories = [
                { category_id: '1', category_name: 'Sports' },
            ];
            (dataService.sendIpcEvent as jest.Mock).mockResolvedValue({
                payload: mockCategories,
            });

            const result = await service.getCategories(
                mockCredentials,
                'live'
            );
            expect(result).toEqual(mockCategories);
            expect(dataService.sendIpcEvent).toHaveBeenCalledWith(
                XTREAM_REQUEST,
                expect.objectContaining({
                    params: expect.objectContaining({
                        action: XtreamCodeActions.GetLiveCategories,
                    }),
                })
            );
        });

        it('should fetch VOD categories', async () => {
            (dataService.sendIpcEvent as jest.Mock).mockResolvedValue({
                payload: [{ category_id: '2', category_name: 'Movies' }],
            });

            const result = await service.getCategories(
                mockCredentials,
                'vod'
            );
            expect(result).toHaveLength(1);
            expect(dataService.sendIpcEvent).toHaveBeenCalledWith(
                XTREAM_REQUEST,
                expect.objectContaining({
                    params: expect.objectContaining({
                        action: XtreamCodeActions.GetVodCategories,
                    }),
                })
            );
        });

        it('should fetch series categories', async () => {
            (dataService.sendIpcEvent as jest.Mock).mockResolvedValue({
                payload: [],
            });

            const result = await service.getCategories(
                mockCredentials,
                'series'
            );
            expect(result).toEqual([]);
            expect(dataService.sendIpcEvent).toHaveBeenCalledWith(
                XTREAM_REQUEST,
                expect.objectContaining({
                    params: expect.objectContaining({
                        action: XtreamCodeActions.GetSeriesCategories,
                    }),
                })
            );
        });

        it('should return empty array for non-array response', async () => {
            (dataService.sendIpcEvent as jest.Mock).mockResolvedValue({
                payload: 'not an array',
            });

            const result = await service.getCategories(
                mockCredentials,
                'live'
            );
            expect(result).toEqual([]);
        });
    });

    describe('getLiveStreams', () => {
        it('should fetch live streams', async () => {
            const mockStreams = [{ stream_id: 1, name: 'Stream 1' }];
            (dataService.sendIpcEvent as jest.Mock).mockResolvedValue({
                payload: mockStreams,
            });

            const result = await service.getLiveStreams(mockCredentials);
            expect(result).toEqual(mockStreams);
            expect(dataService.sendIpcEvent).toHaveBeenCalledWith(
                XTREAM_REQUEST,
                expect.objectContaining({
                    params: expect.objectContaining({
                        action: XtreamCodeActions.GetLiveStreams,
                    }),
                })
            );
        });

        it('should return empty array for non-array response', async () => {
            (dataService.sendIpcEvent as jest.Mock).mockResolvedValue({
                payload: null,
            });

            const result = await service.getLiveStreams(mockCredentials);
            expect(result).toEqual([]);
        });
    });

    describe('getVodStreams', () => {
        it('should fetch VOD streams', async () => {
            const mockStreams = [{ stream_id: 2, name: 'Movie 1' }];
            (dataService.sendIpcEvent as jest.Mock).mockResolvedValue({
                payload: mockStreams,
            });

            const result = await service.getVodStreams(mockCredentials);
            expect(result).toEqual(mockStreams);
        });
    });

    describe('getSeriesStreams', () => {
        it('should fetch series streams', async () => {
            const mockSeries = [{ series_id: 3, name: 'Series 1' }];
            (dataService.sendIpcEvent as jest.Mock).mockResolvedValue({
                payload: mockSeries,
            });

            const result = await service.getSeriesStreams(mockCredentials);
            expect(result).toEqual(mockSeries);
        });
    });

    describe('getStreams', () => {
        it('should delegate to getLiveStreams for live type', async () => {
            (dataService.sendIpcEvent as jest.Mock).mockResolvedValue({
                payload: [{ stream_id: 1 }],
            });

            const result = await service.getStreams(mockCredentials, 'live');
            expect(result).toHaveLength(1);
            expect(dataService.sendIpcEvent).toHaveBeenCalledWith(
                XTREAM_REQUEST,
                expect.objectContaining({
                    params: expect.objectContaining({
                        action: XtreamCodeActions.GetLiveStreams,
                    }),
                })
            );
        });

        it('should delegate to getVodStreams for movie type', async () => {
            (dataService.sendIpcEvent as jest.Mock).mockResolvedValue({
                payload: [{ stream_id: 2 }],
            });

            const result = await service.getStreams(mockCredentials, 'movie');
            expect(result).toHaveLength(1);
            expect(dataService.sendIpcEvent).toHaveBeenCalledWith(
                XTREAM_REQUEST,
                expect.objectContaining({
                    params: expect.objectContaining({
                        action: XtreamCodeActions.GetVodStreams,
                    }),
                })
            );
        });

        it('should delegate to getSeriesStreams for series type', async () => {
            (dataService.sendIpcEvent as jest.Mock).mockResolvedValue({
                payload: [{ series_id: 3 }],
            });

            const result = await service.getStreams(mockCredentials, 'series');
            expect(result).toHaveLength(1);
        });
    });

    describe('getVodInfo', () => {
        it('should fetch VOD details with vod_id', async () => {
            const mockVodInfo = { info: { name: 'Movie Details' } };
            (dataService.sendIpcEvent as jest.Mock).mockResolvedValue({
                payload: mockVodInfo,
            });

            const result = await service.getVodInfo(mockCredentials, 123);
            expect(result).toEqual(mockVodInfo);
            expect(dataService.sendIpcEvent).toHaveBeenCalledWith(
                XTREAM_REQUEST,
                expect.objectContaining({
                    params: expect.objectContaining({
                        action: XtreamCodeActions.GetVodInfo,
                        vod_id: '123',
                    }),
                })
            );
        });
    });

    describe('getSeriesInfo', () => {
        it('should fetch series details with series_id', async () => {
            const mockSeriesInfo = { info: { name: 'Series Details' } };
            (dataService.sendIpcEvent as jest.Mock).mockResolvedValue({
                payload: mockSeriesInfo,
            });

            const result = await service.getSeriesInfo(mockCredentials, 456);
            expect(result).toEqual(mockSeriesInfo);
            expect(dataService.sendIpcEvent).toHaveBeenCalledWith(
                XTREAM_REQUEST,
                expect.objectContaining({
                    params: expect.objectContaining({
                        action: XtreamCodeActions.GetSeriesInfo,
                        series_id: '456',
                    }),
                })
            );
        });
    });

    describe('getShortEpg', () => {
        it('should fetch and decode EPG listings', async () => {
            const mockEpg = {
                epg_listings: [
                    {
                        title: btoa('Test Show'),
                        description: btoa('A description'),
                        start: '2024-01-01 20:00:00',
                        end: '2024-01-01 21:00:00',
                        start_timestamp: '1704135600',
                        stop_timestamp: '1704139200',
                    },
                ],
            };
            (dataService.sendIpcEvent as jest.Mock).mockResolvedValue({
                payload: mockEpg,
            });

            const result = await service.getShortEpg(
                mockCredentials,
                100,
                5
            );
            expect(result).toHaveLength(1);
            expect(result[0].title).toBe('Test Show');
            expect(result[0].description).toBe('A description');
        });

        it('should return empty array when no epg_listings', async () => {
            (dataService.sendIpcEvent as jest.Mock).mockResolvedValue({
                payload: {},
            });

            const result = await service.getShortEpg(mockCredentials, 100);
            expect(result).toEqual([]);
        });

        it('should handle invalid base64 gracefully', async () => {
            const mockEpg = {
                epg_listings: [
                    {
                        title: '%%%invalid-base64%%%',
                        description: '%%%invalid%%%',
                        start: '2024-01-01 20:00:00',
                        end: '2024-01-01 21:00:00',
                        start_timestamp: '1704135600',
                        stop_timestamp: '1704139200',
                    },
                ],
            };
            (dataService.sendIpcEvent as jest.Mock).mockResolvedValue({
                payload: mockEpg,
            });

            const result = await service.getShortEpg(mockCredentials, 100);
            expect(result).toHaveLength(1);
            // Falls back to original string on decode failure
            expect(result[0].title).toBe('%%%invalid-base64%%%');
        });
    });

    describe('sendRequest - error handling', () => {
        it('should serialize numeric params to strings', async () => {
            (dataService.sendIpcEvent as jest.Mock).mockResolvedValue({
                payload: [],
            });

            await service.getShortEpg(mockCredentials, 100, 10);

            expect(dataService.sendIpcEvent).toHaveBeenCalledWith(
                XTREAM_REQUEST,
                expect.objectContaining({
                    params: expect.objectContaining({
                        stream_id: '100',
                        limit: '10',
                    }),
                })
            );
        });

        it('should throw when response has no payload but has message', async () => {
            (dataService.sendIpcEvent as jest.Mock).mockResolvedValue({
                message: 'Connection refused',
            });

            await expect(
                service.getLiveStreams(mockCredentials)
            ).rejects.toThrow('Connection refused');
        });

        it('should throw with default message when no message provided', async () => {
            (dataService.sendIpcEvent as jest.Mock).mockResolvedValue({
                type: 'ERROR',
            });

            await expect(
                service.getLiveStreams(mockCredentials)
            ).rejects.toThrow('Request failed');
        });
    });
});
