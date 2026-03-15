import {
    ComponentFixture,
    TestBed,
    waitForAsync,
} from '@angular/core/testing';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MomentDatePipe } from '@iptvnator/pipes';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { TranslateModule } from '@ngx-translate/core';
import { MockComponent, MockModule, MockPipe } from 'ng-mocks';
import { BehaviorSubject } from 'rxjs';
import { EpgService } from '@iptvnator/epg/data-access';
import { Channel, EpgProgram } from 'shared-interfaces';
import { EpgListItemComponent } from './epg-list-item/epg-list-item.component';
import { EpgListComponent } from './epg-list.component';

describe('EpgListComponent', () => {
    let component: EpgListComponent;
    let fixture: ComponentFixture<EpgListComponent>;
    let mockStore: MockStore;
    let epgService: EpgService;

    beforeEach(waitForAsync(() => {
        const mockEpgService = {
            currentEpgPrograms$: new BehaviorSubject<EpgProgram[]>([]),
        };

        TestBed.configureTestingModule({
            imports: [
                EpgListComponent,
                MockPipe(MomentDatePipe),
                TranslateModule.forRoot(),
                MockComponent(EpgListItemComponent),
                MockModule(MatIconModule),
                MockModule(MatTooltipModule),
            ],
            providers: [
                { provide: EpgService, useValue: mockEpgService },
                provideMockStore({
                    initialState: {
                        playlistState: {
                            active: {
                                id: '',
                                url: '',
                                name: '',
                                group: { title: '' },
                                tvg: { rec: '3' },
                            } as unknown as Channel,
                        },
                    },
                }),
            ],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(EpgListComponent);
        component = fixture.componentInstance;
        epgService = TestBed.inject(EpgService);
        mockStore = TestBed.inject(MockStore);
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should handle an empty epg programs list', () => {
        const emptyPrograms: EpgProgram[] = [];
        (epgService.currentEpgPrograms$ as BehaviorSubject<EpgProgram[]>).next(
            emptyPrograms
        );
        component.handleEpgData(emptyPrograms);
        fixture.detectChanges();
        expect(component.timeNow).toBeTruthy();
        expect(component.dateToday).toBeTruthy();
    });

    it('should set epg program as active', () => {
        jest.spyOn(mockStore, 'dispatch');
        const program = {
            start: '2023-01-01T10:00:00Z',
            stop: '2023-01-01T11:00:00Z',
            channel: '12345',
            title: 'Test Program',
            desc: null,
            category: null,
        } as EpgProgram;

        component.setEpgProgram(program, false, true);
        expect(mockStore.dispatch).toHaveBeenCalledTimes(1);
        expect(mockStore.dispatch).toHaveBeenCalledWith(
            expect.objectContaining({ program })
        );
    });

    it('should reset active epg program when isLive is true', () => {
        jest.spyOn(mockStore, 'dispatch');
        const program = {
            start: '2023-01-01T10:00:00Z',
            stop: '2023-01-01T11:00:00Z',
            channel: '12345',
            title: 'Test Program',
            desc: null,
            category: null,
        } as EpgProgram;

        component.setEpgProgram(program, true);
        expect(mockStore.dispatch).toHaveBeenCalledTimes(1);

        component.setEpgProgram(program, true, true);
        expect(mockStore.dispatch).toHaveBeenCalledTimes(2);
    });

    it('should calculate progress correctly', () => {
        const now = Date.now();
        const program = {
            start: new Date(now - 1800000).toISOString(),
            stop: new Date(now + 1800000).toISOString(),
            channel: 'ch1',
            title: 'Test',
            desc: null,
            category: null,
        } as EpgProgram;

        const progress = component.calculateProgress(program);
        expect(progress).toBeGreaterThan(40);
        expect(progress).toBeLessThan(60);
    });

    it('should detect if program is currently playing', () => {
        const now = new Date();
        component.timeNow = now.toISOString();

        const playingProgram = {
            start: new Date(now.getTime() - 1800000).toISOString(),
            stop: new Date(now.getTime() + 1800000).toISOString(),
        } as EpgProgram;

        expect(component.isProgramPlaying(playingProgram)).toBe(true);

        const pastProgram = {
            start: new Date(now.getTime() - 7200000).toISOString(),
            stop: new Date(now.getTime() - 3600000).toISOString(),
        } as EpgProgram;

        expect(component.isProgramPlaying(pastProgram)).toBe(false);
    });
});
