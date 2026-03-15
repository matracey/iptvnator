import { SimpleChange, SimpleChanges } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockPipe } from 'ng-mocks';
import { MomentDatePipe } from '@iptvnator/pipes';
import { TranslatePipe } from '@ngx-translate/core';
import { Channel, EpgProgram } from 'shared-interfaces';
import { InfoOverlayComponent } from './info-overlay.component';

describe('InfoOverlayComponent', () => {
    let component: InfoOverlayComponent;
    let fixture: ComponentFixture<InfoOverlayComponent>;

    const mockChannel: Channel = {
        id: 'ch1',
        url: 'http://example.com/stream',
        name: 'Test Channel',
        group: { title: 'News' },
        tvg: {
            id: 'ch1-tvg',
            name: 'Test',
            url: '',
            logo: 'http://example.com/logo.png',
            rec: '',
        },
        http: { referrer: '', 'user-agent': '', origin: '' },
        radio: '',
    } as Channel;

    const mockEpgProgram: EpgProgram = {
        start: '2024-01-15T12:00:00.000Z',
        stop: '2024-01-15T13:00:00.000Z',
        channel: 'ch1',
        title: 'Test Program',
        desc: 'A test program',
        category: 'News',
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [
                InfoOverlayComponent,
                MockPipe(MomentDatePipe, (v) => v),
                MockPipe(TranslatePipe, (v) => v),
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(InfoOverlayComponent);
        component = fixture.componentInstance;
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should start with isVisible false', () => {
        expect(component.isVisible()).toBe(false);
    });

    describe('ngOnChanges — channel input', () => {
        it('should set isVisible to true when channel changes', () => {
            jest.useFakeTimers();

            const changes: SimpleChanges = {
                channel: new SimpleChange(undefined, mockChannel, true),
            };
            component.ngOnChanges(changes);

            expect(component.isVisible()).toBe(true);
        });

        it('should auto-hide after 10 seconds', () => {
            jest.useFakeTimers();

            const changes: SimpleChanges = {
                channel: new SimpleChange(undefined, mockChannel, true),
            };
            component.ngOnChanges(changes);
            expect(component.isVisible()).toBe(true);

            jest.advanceTimersByTime(9999);
            expect(component.isVisible()).toBe(true);

            jest.advanceTimersByTime(1);
            expect(component.isVisible()).toBe(false);
        });

        it('should reset timeout when channel changes again', () => {
            jest.useFakeTimers();

            const changes1: SimpleChanges = {
                channel: new SimpleChange(
                    undefined,
                    mockChannel,
                    true
                ),
            };
            component.ngOnChanges(changes1);

            jest.advanceTimersByTime(5000);
            expect(component.isVisible()).toBe(true);

            const changes2: SimpleChanges = {
                channel: new SimpleChange(
                    mockChannel,
                    { ...mockChannel, id: 'ch2' },
                    false
                ),
            };
            component.ngOnChanges(changes2);

            // After 5 more seconds (10s from second change) it should still be visible
            jest.advanceTimersByTime(5000);
            expect(component.isVisible()).toBe(true);

            // After 10s from second change it hides
            jest.advanceTimersByTime(5000);
            expect(component.isVisible()).toBe(false);
        });

        it('should not set isVisible when channel value is falsy', () => {
            const changes: SimpleChanges = {
                channel: new SimpleChange(mockChannel, undefined, false),
            };
            component.ngOnChanges(changes);
            expect(component.isVisible()).toBe(false);
        });
    });

    describe('ngOnChanges — epgProgram input', () => {
        it('should call setProgramDuration when epgProgram has a value', () => {
            const spy = jest.spyOn(component, 'setProgramDuration');
            const changes: SimpleChanges = {
                epgProgram: new SimpleChange(
                    undefined,
                    mockEpgProgram,
                    true
                ),
            };
            component.ngOnChanges(changes);

            expect(spy).toHaveBeenCalledWith(
                mockEpgProgram.start,
                mockEpgProgram.stop
            );
        });

        it('should reset EPG data when epgProgram becomes undefined', () => {
            // First set some data
            component.start = '2024-01-15T12:00:00.000Z';
            component.stop = '2024-01-15T13:00:00.000Z';
            component.generalDuration = 3600000;
            component.finishedDuration = 1800000;

            const changes: SimpleChanges = {
                epgProgram: new SimpleChange(
                    mockEpgProgram,
                    undefined,
                    false
                ),
            };
            component.ngOnChanges(changes);

            expect(component.start).toBeUndefined();
            expect(component.stop).toBeUndefined();
            expect(component.generalDuration).toBe(0);
            expect(component.finishedDuration).toBe(0);
        });
    });

    describe('showOverlay', () => {
        it('should show overlay when hidden', () => {
            jest.useFakeTimers();

            expect(component.isVisible()).toBe(false);
            component.showOverlay();
            expect(component.isVisible()).toBe(true);
        });

        it('should hide overlay when already visible (toggle)', () => {
            jest.useFakeTimers();

            component.showOverlay(); // show
            expect(component.isVisible()).toBe(true);

            component.showOverlay(); // hide (toggle)
            expect(component.isVisible()).toBe(false);
        });

        it('should auto-hide after 10 seconds when shown', () => {
            jest.useFakeTimers();

            component.showOverlay();
            expect(component.isVisible()).toBe(true);

            jest.advanceTimersByTime(10000);
            expect(component.isVisible()).toBe(false);
        });
    });

    describe('setProgramDuration', () => {
        it('should calculate duration with ISO date strings', () => {
            const start = '2024-01-15T12:00:00.000Z';
            const stop = '2024-01-15T13:00:00.000Z';

            component.setProgramDuration(start, stop);

            expect(component.start).toBe(
                new Date(start).toISOString()
            );
            expect(component.stop).toBe(new Date(stop).toISOString());
            // 1 hour = 3,600,000 ms
            expect(component.generalDuration).toBe(3600000);
            expect(component.finishedDuration).toEqual(
                expect.any(Number)
            );
        });

        it('should handle XMLTV format dates (yyyyMMddHHmmss +ZZZZ)', () => {
            const start = '20240115120000 +0000';
            const stop = '20240115130000 +0000';

            component.setProgramDuration(start, stop);

            expect(component.generalDuration).toBe(3600000);
            expect(component.start).toBeDefined();
            expect(component.stop).toBeDefined();
        });

        it('should handle numeric timestamps', () => {
            const start = new Date('2024-01-15T12:00:00.000Z').getTime();
            const stop = new Date('2024-01-15T13:00:00.000Z').getTime();

            component.setProgramDuration(start, stop);

            expect(component.generalDuration).toBe(3600000);
        });

        it('should calculate finishedDuration relative to current time', () => {
            jest.useFakeTimers();
            jest.setSystemTime(
                new Date('2024-01-15T12:30:00.000Z')
            );

            const start = '2024-01-15T12:00:00.000Z';
            const stop = '2024-01-15T13:00:00.000Z';

            component.setProgramDuration(start, stop);

            // finishedDuration = stop - now = 30 minutes = 1,800,000 ms
            expect(component.finishedDuration).toBe(1800000);
        });
    });
});
