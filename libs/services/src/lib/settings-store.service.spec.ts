import { TestBed } from '@angular/core/testing';
import { StorageMap } from '@ngx-pwa/local-storage';
import { of, throwError } from 'rxjs';
import {
    Language,
    Settings,
    STORE_KEY,
    StreamFormat,
    Theme,
    VideoPlayer,
} from 'shared-interfaces';
import { SettingsStore } from './settings-store.service';

describe('SettingsStore', () => {
    let store: InstanceType<typeof SettingsStore>;
    let storage: { get: jest.Mock; set: jest.Mock };

    const defaultSettings: Settings = {
        player: VideoPlayer.VideoJs,
        streamFormat: StreamFormat.M3u8StreamFormat,
        language: Language.ENGLISH,
        showCaptions: false,
        showExternalPlaybackBar: true,
        theme: Theme.SystemTheme,
        mpvPlayerPath: '',
        mpvReuseInstance: false,
        vlcPlayerPath: '',
        remoteControl: false,
        remoteControlPort: 8765,
        epgUrl: [],
        downloadFolder: '',
    };

    beforeEach(() => {
        storage = {
            get: jest.fn().mockReturnValue(of(undefined)),
            set: jest.fn().mockReturnValue(of(undefined)),
        };

        jest.spyOn(console, 'error').mockImplementation(() => undefined);

        TestBed.configureTestingModule({
            providers: [
                SettingsStore,
                { provide: StorageMap, useValue: storage },
            ],
        });

        store = TestBed.inject(SettingsStore);
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });

    it('should be created', () => {
        expect(store).toBeTruthy();
    });

    describe('default state', () => {
        it('should have default player as VideoJs', () => {
            expect(store.player()).toBe(VideoPlayer.VideoJs);
        });

        it('should have default stream format as M3u8', () => {
            expect(store.streamFormat()).toBe(StreamFormat.M3u8StreamFormat);
        });

        it('should have default language as English', () => {
            expect(store.language()).toBe(Language.ENGLISH);
        });

        it('should have showCaptions as false', () => {
            expect(store.showCaptions()).toBe(false);
        });

        it('should have showExternalPlaybackBar as true', () => {
            expect(store.showExternalPlaybackBar!()).toBe(true);
        });

        it('should have default theme as SystemTheme', () => {
            expect(store.theme()).toBe(Theme.SystemTheme);
        });

        it('should have empty mpvPlayerPath', () => {
            expect(store.mpvPlayerPath()).toBe('');
        });

        it('should have remoteControl as false', () => {
            expect(store.remoteControl()).toBe(false);
        });

        it('should have default remoteControlPort as 8765', () => {
            expect(store.remoteControlPort()).toBe(8765);
        });

        it('should have empty epgUrl array', () => {
            expect(store.epgUrl()).toEqual([]);
        });

        it('should have empty downloadFolder', () => {
            expect(store.downloadFolder!()).toBe('');
        });
    });

    describe('loadSettings', () => {
        it('should load settings from storage on init', () => {
            expect(storage.get).toHaveBeenCalledWith(STORE_KEY.Settings);
        });

        it('should apply stored settings', async () => {
            const storedSettings: Partial<Settings> = {
                player: VideoPlayer.MPV,
                language: Language.GERMAN,
                theme: Theme.DarkTheme,
            };
            storage.get.mockReturnValue(of(storedSettings));

            await store.loadSettings();

            expect(store.player()).toBe(VideoPlayer.MPV);
            expect(store.language()).toBe(Language.GERMAN);
            expect(store.theme()).toBe(Theme.DarkTheme);
        });

        it('should keep defaults when storage is empty', async () => {
            storage.get.mockReturnValue(of(undefined));

            await store.loadSettings();

            expect(store.player()).toBe(VideoPlayer.VideoJs);
            expect(store.language()).toBe(Language.ENGLISH);
        });

        it('should keep defaults on storage error', async () => {
            storage.get.mockReturnValue(
                throwError(() => new Error('Storage error'))
            );

            await store.loadSettings();

            expect(store.player()).toBe(VideoPlayer.VideoJs);
        });

        it('should merge stored settings with defaults', async () => {
            const partialSettings = { player: VideoPlayer.VLC };
            storage.get.mockReturnValue(of(partialSettings));

            await store.loadSettings();

            expect(store.player()).toBe(VideoPlayer.VLC);
            // Other settings should retain defaults
            expect(store.language()).toBe(Language.ENGLISH);
            expect(store.theme()).toBe(Theme.SystemTheme);
        });
    });

    describe('updateSettings', () => {
        it('should update partial settings and persist', async () => {
            await store.updateSettings({ player: VideoPlayer.Html5Player });

            expect(store.player()).toBe(VideoPlayer.Html5Player);
            expect(storage.set).toHaveBeenCalledWith(
                STORE_KEY.Settings,
                expect.objectContaining({
                    player: VideoPlayer.Html5Player,
                    language: Language.ENGLISH,
                })
            );
        });

        it('should update multiple settings at once', async () => {
            await store.updateSettings({
                language: Language.FRENCH,
                theme: Theme.LightTheme,
                showCaptions: true,
            });

            expect(store.language()).toBe(Language.FRENCH);
            expect(store.theme()).toBe(Theme.LightTheme);
            expect(store.showCaptions()).toBe(true);
        });

        it('should throw on storage save error', async () => {
            storage.set.mockReturnValue(
                throwError(() => new Error('Save failed'))
            );

            await expect(
                store.updateSettings({ player: VideoPlayer.MPV })
            ).rejects.toThrow('Save failed');
        });
    });

    describe('getSettings', () => {
        it('should return complete settings object', () => {
            const settings = store.getSettings();
            expect(settings).toEqual(defaultSettings);
        });

        it('should reflect updated state', async () => {
            await store.updateSettings({ player: VideoPlayer.ArtPlayer });
            const settings = store.getSettings();
            expect(settings.player).toBe(VideoPlayer.ArtPlayer);
        });
    });

    describe('getDownloadFolder', () => {
        it('should return the current download folder', () => {
            expect(store.getDownloadFolder()).toBe('');
        });

        it('should return updated download folder', async () => {
            await store.updateSettings({
                downloadFolder: '/home/user/downloads',
            });
            expect(store.getDownloadFolder()).toBe('/home/user/downloads');
        });
    });

    describe('getPlayer', () => {
        it('should return the current player', () => {
            expect(store.getPlayer()).toBe(VideoPlayer.VideoJs);
        });
    });

    describe('isEmbeddedPlayer', () => {
        it('should return true for VideoJs', () => {
            expect(store.isEmbeddedPlayer()).toBe(true);
        });

        it('should return true for Html5Player', async () => {
            await store.updateSettings({ player: VideoPlayer.Html5Player });
            expect(store.isEmbeddedPlayer()).toBe(true);
        });

        it('should return false for MPV', async () => {
            await store.updateSettings({ player: VideoPlayer.MPV });
            expect(store.isEmbeddedPlayer()).toBe(false);
        });

        it('should return false for VLC', async () => {
            await store.updateSettings({ player: VideoPlayer.VLC });
            expect(store.isEmbeddedPlayer()).toBe(false);
        });
    });
});
