import { HttpClientTestingModule } from '@angular/common/http/testing';
import {
    ComponentFixture,
    inject,
    TestBed,
    waitForAsync,
} from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterModule } from '@angular/router';
import { Actions } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { EpgService } from '@iptvnator/epg/data-access';
import { MockComponent, MockProviders } from 'ng-mocks';
import { EpgProgressPanelComponent } from '@iptvnator/ui/epg';
import { of, EMPTY } from 'rxjs';
import { DataService } from 'services';
import { Language, STORE_KEY, Theme } from 'shared-interfaces';
import { AppComponent } from './app.component';
import { ElectronServiceStub } from './services/electron.service.stub';
import { SettingsService } from './services/settings.service';

jest.spyOn(global.console, 'error').mockImplementation(() => {
    // suppress console.error output during tests
});

describe('AppComponent', () => {
    let component: AppComponent;
    let electronService: DataService;
    let fixture: ComponentFixture<AppComponent>;
    let settingsService: SettingsService;
    let translateService: TranslateService;
    const defaultLanguage = Language.ENGLISH;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            imports: [
                AppComponent,
                MockComponent(EpgProgressPanelComponent),
                RouterModule.forRoot([]),
                HttpClientTestingModule,
            ],
            providers: [
                MockProviders(
                    TranslateService,
                    MatSnackBar,
                    MatDialog,
                    EpgService,
                ),
                { provide: Actions, useValue: EMPTY },
                { provide: Store, useValue: { dispatch: jest.fn(), select: jest.fn(() => EMPTY) } },
                SettingsService,
                {
                    provide: DataService,
                    useClass: ElectronServiceStub,
                },
            ],
        })
            .overrideComponent(AppComponent, {
                set: { imports: [RouterModule, MockComponent(EpgProgressPanelComponent)] },
            })
            .compileComponents();
    }));

    beforeEach(() => {
        electronService = TestBed.inject(DataService);
        settingsService = TestBed.inject(SettingsService);
        translateService = TestBed.inject(TranslateService);

        jest.spyOn(settingsService, 'getValueFromLocalStorage').mockReturnValue(
            EMPTY
        );

        fixture = TestBed.createComponent(AppComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should call initSettings on init', () => {
        jest.spyOn(translateService, 'setDefaultLang');
        jest.spyOn(component, 'initSettings');
        component.ngOnInit();
        expect(translateService.setDefaultLang).toHaveBeenCalledWith(
            defaultLanguage
        );
        expect(component.initSettings).toHaveBeenCalledTimes(1);
    });

    it('should navigate to the provided route', inject(
        [Router],
        (router: Router) => {
            const route = '/add-playlists';
            jest.spyOn(router, 'navigateByUrl');
            component.navigateToRoute(route);
            expect(router.navigateByUrl).toHaveBeenCalledTimes(1);
            expect(router.navigateByUrl).toHaveBeenCalledWith(route);
        }
    ));

    it('should call detectDarkMode when theme is not set', () => {
        jest.spyOn(component, 'detectDarkMode');
        jest.spyOn(settingsService, 'changeTheme');
        jest.spyOn(settingsService, 'getValueFromLocalStorage').mockReturnValue(
            of({})
        );

        component.initSettings();
        expect(component.detectDarkMode).toHaveBeenCalled();
    });

    describe('Set initial settings', () => {
        const theme = Theme.DarkTheme;
        const language = 'es';

        beforeEach(() => {
            jest.spyOn(settingsService, 'changeTheme');
            jest.spyOn(translateService, 'use');
        });

        it('should apply settings when all settings are defined', () => {
            jest.spyOn(
                settingsService,
                'getValueFromLocalStorage'
            ).mockReturnValue(of({ theme, language }));

            component.initSettings();

            expect(settingsService.changeTheme).toHaveBeenCalledWith(theme);
            expect(translateService.use).toHaveBeenCalledWith(language);
        });

        it('should not apply settings when observable completes empty', () => {
            jest.spyOn(
                settingsService,
                'getValueFromLocalStorage'
            ).mockReturnValue(EMPTY);

            component.initSettings();

            expect(settingsService.changeTheme).not.toHaveBeenCalled();
            expect(translateService.use).not.toHaveBeenCalled();
        });

        it('should use default language when language is not set', () => {
            jest.spyOn(
                settingsService,
                'getValueFromLocalStorage'
            ).mockReturnValue(of({ theme }));

            component.initSettings();

            expect(settingsService.changeTheme).toHaveBeenCalledWith(theme);
            expect(translateService.use).toHaveBeenCalledWith(defaultLanguage);
        });
    });
});
