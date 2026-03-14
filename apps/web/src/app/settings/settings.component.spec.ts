import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import {
    FormsModule,
    ReactiveFormsModule,
    UntypedFormBuilder,
} from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { EpgService } from '@iptvnator/epg/data-access';
import {
    MockModule,
    MockProvider,
    MockProviders,
} from 'ng-mocks';
import { DialogService } from 'components';
import { DataService, PlaylistsService } from 'services';
import { Language, StreamFormat, Theme, VideoPlayer } from 'shared-interfaces';
import { SettingsComponent } from './settings.component';

import { signal } from '@angular/core';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { of, EMPTY } from 'rxjs';
import { SETTINGS_UPDATE } from 'shared-interfaces';
import { ElectronServiceStub } from '../services/electron.service.stub';
import { SettingsStore } from '../services/settings-store.service';
import { SettingsService } from '../services/settings.service';
import { SettingsContextService } from '@iptvnator/workspace/shell/util';

class MatSnackBarStub {
    open() {
        return undefined;
    }
}

export class MockRouter {
    navigateByUrl(url: string): string {
        return url;
    }
}

const DEFAULT_SETTINGS = {
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

class MockSettingsStore {
    private settingsSignal = signal(DEFAULT_SETTINGS);

    getSettings = () => this.settingsSignal();

    loadSettings = jest.fn().mockResolvedValue(undefined);

    updateSettings = jest.fn().mockResolvedValue(undefined);

    // Expose individual setting signals matching the real signal store shape
    player = () => this.settingsSignal().player;
    streamFormat = () => this.settingsSignal().streamFormat;
    language = () => this.settingsSignal().language;
    showCaptions = () => this.settingsSignal().showCaptions;
    showExternalPlaybackBar = () =>
        this.settingsSignal().showExternalPlaybackBar;
    theme = () => this.settingsSignal().theme;
    mpvPlayerPath = () => this.settingsSignal().mpvPlayerPath;
    vlcPlayerPath = () => this.settingsSignal().vlcPlayerPath;
    remoteControl = () => this.settingsSignal().remoteControl;
    remoteControlPort = () => this.settingsSignal().remoteControlPort;

    mpvReuseInstance = () => this.settingsSignal().mpvReuseInstance;
    epgUrl = () => this.settingsSignal().epgUrl;
    downloadFolder = () => this.settingsSignal().downloadFolder;

    // Helper method for tests to modify settings
    setMockSettings(newSettings: Partial<typeof DEFAULT_SETTINGS>) {
        this.settingsSignal.set({
            ...this.settingsSignal(),
            ...newSettings,
        });
    }
}

class MockSettingsService {
    getAppVersion = jest.fn().mockReturnValue(EMPTY);
    changeTheme = jest.fn();
    isVersionOutdated = jest.fn().mockReturnValue(false);
}

describe('SettingsComponent', () => {
    let component: SettingsComponent;
    let fixture: ComponentFixture<SettingsComponent>;
    let electronService: DataService;
    let router: Router;
    let settingsStore: MockSettingsStore;
    let translate: TranslateService;
    let epgService: EpgService;

    beforeEach(waitForAsync(() => {
        // Polyfill Element.animate for jsdom
        if (!Element.prototype.animate) {
            Element.prototype.animate = jest.fn().mockReturnValue({
                finished: Promise.resolve(),
                cancel: jest.fn(),
                onfinish: null,
            });
        }

        TestBed.configureTestingModule({
            providers: [
                UntypedFormBuilder,
                { provide: SettingsStore, useClass: MockSettingsStore },
                MockProvider(EpgService),
                MockProvider(DialogService),
                SettingsContextService,
                { provide: SettingsService, useClass: MockSettingsService },
                { provide: MatSnackBar, useClass: MatSnackBarStub },
                { provide: DataService, useClass: ElectronServiceStub },
                {
                    provide: Router,
                    useClass: MockRouter,
                },
                provideMockStore(),
                { provide: NgxIndexedDBService, useValue: {} },
                MockProviders(PlaylistsService),
            ],
            imports: [
                SettingsComponent,
                HttpClientTestingModule,
                FormsModule,
                MockModule(MatSelectModule),
                MockModule(MatIconModule),
                MockModule(MatTooltipModule),
                ReactiveFormsModule,
                MockModule(RouterTestingModule),
                MockModule(MatCardModule),
                MockModule(MatListModule),
                MockModule(MatFormFieldModule),
                MockModule(MatCheckboxModule),
                MockModule(MatDividerModule),
                TranslateModule.forRoot(),
            ],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(SettingsComponent);
        electronService = TestBed.inject(DataService);
        settingsStore = TestBed.inject(SettingsStore) as unknown as MockSettingsStore;
        router = TestBed.inject(Router);
        translate = TestBed.inject(TranslateService);
        epgService = TestBed.inject(EpgService);

        component = fixture.componentInstance;
        component.setSettings = jest.fn();
        fixture.detectChanges();
    });

    it('should create and init component', () => {
        expect(component).toBeTruthy();
    });

    it('should render a compact page header outside dialog mode', () => {
        const nativeElement = fixture.nativeElement as HTMLElement;

        expect(
            nativeElement.querySelector('[data-test-id="settings-page-header"]')
        ).not.toBeNull();
        expect(nativeElement.querySelector('.settings-intro')).toBeNull();
    });

    it('should not render the page header in dialog mode', () => {
        const dialogFixture = TestBed.createComponent(SettingsComponent);
        const dialogComponent = dialogFixture.componentInstance;
        dialogComponent.isDialog = true;
        dialogComponent.setSettings = jest.fn();
        dialogFixture.detectChanges();

        const nativeElement = dialogFixture.nativeElement as HTMLElement;
        expect(
            nativeElement.querySelector('[data-test-id="settings-page-header"]')
        ).toBeNull();
        expect(
            nativeElement.querySelector('h2[mat-dialog-title]')
        ).not.toBeNull();
    });

    it('should scroll the general navigation target to the general section', async () => {
        const settingsContext = TestBed.inject(SettingsContextService);
        const scrollIntoView = jest.fn();
        const originalGetElementById = document.getElementById.bind(document);

        const getElementByIdSpy = jest
            .spyOn(document, 'getElementById')
            .mockImplementation((id: string) => {
                if (id === 'general') {
                    return {
                        scrollIntoView,
                    } as unknown as HTMLElement;
                }

                return originalGetElementById(id);
            });

        settingsContext.navigateToSection('general');
        fixture.detectChanges();
        await fixture.whenStable();

        expect(getElementByIdSpy).toHaveBeenCalledWith('general');
        expect(getElementByIdSpy).not.toHaveBeenCalledWith('settings-intro');
        expect(scrollIntoView).toHaveBeenCalledWith({
            behavior: 'smooth',
            block: 'start',
        });
        expect(settingsContext.pendingScrollTarget()).toBeNull();
    });

    describe('Get and set settings on component init', () => {
        const settings = {
            player: VideoPlayer.VideoJs,
        };

        // Form defaults (no epgUrl/downloadFolder since window.electron is not set)
        const EXPECTED_FORM_DEFAULTS = {
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
        };

        it('should init default settings if previous config was not saved', async () => {
            await component.ngOnInit();
            expect(component.settingsForm.value).toEqual(
                EXPECTED_FORM_DEFAULTS
            );
        });

        it('should get and apply custom settings', async () => {
            const mockStore = settingsStore as unknown as MockSettingsStore;
            mockStore.setMockSettings({
                ...DEFAULT_SETTINGS,
                ...settings,
            });

            await component.ngOnInit();
            fixture.detectChanges();
            await fixture.whenStable();

            expect(component.settingsForm.value).toEqual({
                ...EXPECTED_FORM_DEFAULTS,
                ...settings,
            });
        });
    });

    describe('Version check', () => {
        const latestVersion = '1.0.0';
        const currentVersion = '0.1.0';

        beforeEach(() => {
            const settingsService = TestBed.inject(SettingsService);
            (settingsService.getAppVersion as jest.Mock).mockReturnValue(
                of(latestVersion)
            );

            // Add translation mock
            jest.spyOn(translate, 'instant').mockImplementation((key) => {
                if (key === 'SETTINGS.NEW_VERSION_AVAILABLE') {
                    return 'New version available';
                }
                if (key === 'SETTINGS.LATEST_VERSION') {
                    return 'Latest version installed';
                }
                return key;
            });
        });

        it('should return true if version is outdated', () => {
            const settingsService = TestBed.inject(SettingsService);
            (settingsService.isVersionOutdated as jest.Mock).mockReturnValue(
                true
            );
            jest.spyOn(electronService, 'getAppVersion').mockReturnValue(
                currentVersion
            );
            const isOutdated =
                component.isCurrentVersionOutdated(latestVersion);
            expect(isOutdated).toBeTruthy();
        });

        it('should update notification message if version is outdated', () => {
            const settingsService = TestBed.inject(SettingsService);
            (settingsService.isVersionOutdated as jest.Mock).mockReturnValue(
                true
            );
            jest.spyOn(translate, 'instant');
            jest.spyOn(electronService, 'getAppVersion').mockReturnValue(
                currentVersion
            );
            component.showVersionInformation(latestVersion);
            expect(translate.instant).toHaveBeenCalledWith(
                'SETTINGS.NEW_VERSION_AVAILABLE'
            );
            expect(component.updateMessage).toBe(
                'New version available: 1.0.0'
            );
        });
    });

    it('should send epg refresh command', () => {
        jest.spyOn(epgService, 'fetchEpg');
        const url = 'http://epg-url-here/data.xml';
        component.refreshEpg(url);
        expect(epgService.fetchEpg).toHaveBeenCalledWith([url]);
    });

    it('should navigate back to home page', () => {
        jest.spyOn(router, 'navigateByUrl');
        component.backToHome();
        expect(router.navigateByUrl).toHaveBeenCalledWith('/');
    });

    it('should update the selected theme and mark the form dirty', () => {
        component.selectTheme(Theme.DarkTheme);

        expect(component.settingsForm.value.theme).toBe(Theme.DarkTheme);
        expect(component.settingsForm.dirty).toBeTruthy();
    });

    it('should save settings on submit', async () => {
        const mockStore = settingsStore as unknown as MockSettingsStore;
        mockStore.updateSettings.mockResolvedValue(undefined);

        await component.onSubmit();

        expect(mockStore.updateSettings).toHaveBeenCalledWith(
            component.settingsForm.value
        );
    });
});
