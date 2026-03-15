import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockComponent, MockPipe, MockModule } from 'ng-mocks';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { TranslatePipe } from '@ngx-translate/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Channel, EpgProgram } from 'shared-interfaces';
import { AllChannelsViewComponent } from './all-channels-view.component';
import { ChannelListItemComponent } from '../channel-list-item/channel-list-item.component';
import { ComponentRef } from '@angular/core';

describe('AllChannelsViewComponent', () => {
    let component: AllChannelsViewComponent;
    let componentRef: ComponentRef<AllChannelsViewComponent>;
    let fixture: ComponentFixture<AllChannelsViewComponent>;

    const makeChannel = (
        id: string,
        name: string,
        tvgId?: string
    ): Channel =>
        ({
            id,
            url: `http://example.com/${id}`,
            name,
            group: { title: 'Group' },
            tvg: {
                id: tvgId ?? id,
                name,
                url: '',
                logo: '',
                rec: '',
            },
            http: { referrer: '', 'user-agent': '', origin: '' },
            radio: '',
        }) as Channel;

    const makeEpgProgram = (
        start: string,
        stop: string,
        title = 'Program'
    ): EpgProgram => ({
        start,
        stop,
        channel: 'ch1',
        title,
        desc: null,
        category: null,
    });

    const channels: Channel[] = [
        makeChannel('ch1', 'News Channel', 'news-tvg'),
        makeChannel('ch2', 'Sports Channel', 'sports-tvg'),
        makeChannel('ch3', 'Music Channel', 'music-tvg'),
    ];

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [
                AllChannelsViewComponent,
                MockComponent(ChannelListItemComponent),
                MockPipe(TranslatePipe, (v) => v),
                MockModule(ScrollingModule),
                MockModule(MatFormFieldModule),
                MockModule(MatIconModule),
                MockModule(MatInputModule),
                NoopAnimationsModule,
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(AllChannelsViewComponent);
        component = fixture.componentInstance;
        componentRef = fixture.componentRef;

        // Set required inputs
        componentRef.setInput('channels', channels);
        componentRef.setInput(
            'channelEpgMap',
            new Map<string, EpgProgram | null>()
        );
        componentRef.setInput('progressTick', 0);
        componentRef.setInput('shouldShowEpg', true);
        componentRef.setInput('itemSize', 48);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should create', () => {
        fixture.detectChanges();
        expect(component).toBeTruthy();
    });

    describe('getChannelEpgKey', () => {
        it('should return tvg.id trimmed when available', () => {
            const ch = makeChannel('ch1', 'Test', '  news-id  ');
            expect(component.getChannelEpgKey(ch)).toBe('news-id');
        });

        it('should fall back to name trimmed when tvg.id is empty', () => {
            const ch = makeChannel('ch1', '  Test Channel  ', '');
            expect(component.getChannelEpgKey(ch)).toBe('Test Channel');
        });

        it('should return empty string when both tvg.id and name are empty', () => {
            const ch = makeChannel('ch1', '', '');
            expect(component.getChannelEpgKey(ch)).toBe('');
        });

        it('should return empty string for null-ish channel', () => {
            expect(
                component.getChannelEpgKey(null as unknown as Channel)
            ).toBe('');
        });
    });

    describe('filteredChannels computed', () => {
        it('should return all channels when search term is empty', () => {
            fixture.detectChanges();
            expect(component.filteredChannels()).toEqual(channels);
        });

        it('should filter channels by name (case-insensitive)', () => {
            fixture.detectChanges();
            component.searchTerm.set('news');
            expect(component.filteredChannels().length).toBe(1);
            expect(component.filteredChannels()[0].name).toBe(
                'News Channel'
            );
        });

        it('should return empty array when no channels match', () => {
            fixture.detectChanges();
            component.searchTerm.set('xyz-nonexistent');
            expect(component.filteredChannels().length).toBe(0);
        });

        it('should be case insensitive', () => {
            fixture.detectChanges();
            component.searchTerm.set('SPORTS');
            expect(component.filteredChannels().length).toBe(1);
            expect(component.filteredChannels()[0].name).toBe(
                'Sports Channel'
            );
        });
    });

    describe('epgMetadataMap computed', () => {
        it('should return empty map when channelEpgMap is empty', () => {
            fixture.detectChanges();
            expect(component.epgMetadataMap().size).toBe(0);
        });

        it('should build metadata map with progress for each entry', () => {
            jest.useFakeTimers();
            jest.setSystemTime(
                new Date('2024-01-15T12:30:00.000Z')
            );

            const epgMap = new Map<string, EpgProgram | null>();
            epgMap.set(
                'news-tvg',
                makeEpgProgram(
                    '2024-01-15T12:00:00.000Z',
                    '2024-01-15T13:00:00.000Z',
                    'News Show'
                )
            );
            epgMap.set('sports-tvg', null);

            componentRef.setInput('channelEpgMap', epgMap);
            fixture.detectChanges();

            const meta = component.epgMetadataMap();
            expect(meta.size).toBe(2);

            const newsMeta = meta.get('news-tvg')!;
            expect(newsMeta.epgProgram?.title).toBe('News Show');
            // 30 min / 60 min = 50%
            expect(newsMeta.progressPercentage).toBe(50);

            const sportsMeta = meta.get('sports-tvg')!;
            expect(sportsMeta.epgProgram).toBeNull();
            expect(sportsMeta.progressPercentage).toBe(0);
        });

        it('should refresh when progressTick changes', () => {
            jest.useFakeTimers();
            jest.setSystemTime(
                new Date('2024-01-15T12:15:00.000Z')
            );

            const epgMap = new Map<string, EpgProgram | null>();
            epgMap.set(
                'ch1',
                makeEpgProgram(
                    '2024-01-15T12:00:00.000Z',
                    '2024-01-15T13:00:00.000Z'
                )
            );
            componentRef.setInput('channelEpgMap', epgMap);
            fixture.detectChanges();

            const progress1 =
                component.epgMetadataMap().get('ch1')!
                    .progressPercentage;
            expect(progress1).toBe(25); // 15min / 60min

            // Advance time and tick
            jest.setSystemTime(
                new Date('2024-01-15T12:45:00.000Z')
            );
            componentRef.setInput('progressTick', 1);
            fixture.detectChanges();

            const progress2 =
                component.epgMetadataMap().get('ch1')!
                    .progressPercentage;
            expect(progress2).toBe(75); // 45min / 60min
        });
    });

    describe('onSearchInput (debounced)', () => {
        it('should not update searchTerm immediately', () => {
            jest.useFakeTimers();
            fixture.detectChanges();

            component.onSearchInput('test');
            expect(component.searchTerm()).toBe('');
        });

        it('should update searchTerm after debounce delay', () => {
            jest.useFakeTimers();
            fixture.detectChanges();

            component.onSearchInput('test');
            jest.advanceTimersByTime(300);
            expect(component.searchTerm()).toBe('test');
        });

        it('should debounce rapid inputs', () => {
            jest.useFakeTimers();
            fixture.detectChanges();

            component.onSearchInput('t');
            jest.advanceTimersByTime(100);
            component.onSearchInput('te');
            jest.advanceTimersByTime(100);
            component.onSearchInput('tes');
            jest.advanceTimersByTime(100);
            component.onSearchInput('test');
            jest.advanceTimersByTime(300);

            expect(component.searchTerm()).toBe('test');
        });
    });

    describe('calculateProgress (via epgMetadataMap)', () => {
        it('should return 0 for null program', () => {
            const epgMap = new Map<string, EpgProgram | null>();
            epgMap.set('ch1', null);
            componentRef.setInput('channelEpgMap', epgMap);
            fixture.detectChanges();

            const meta = component.epgMetadataMap().get('ch1')!;
            expect(meta.progressPercentage).toBe(0);
        });

        it('should return 0 for invalid dates', () => {
            const epgMap = new Map<string, EpgProgram | null>();
            epgMap.set(
                'ch1',
                makeEpgProgram('invalid', 'also-invalid')
            );
            componentRef.setInput('channelEpgMap', epgMap);
            fixture.detectChanges();

            const meta = component.epgMetadataMap().get('ch1')!;
            expect(meta.progressPercentage).toBe(0);
        });

        it('should return 0 when stop is before start', () => {
            const epgMap = new Map<string, EpgProgram | null>();
            epgMap.set(
                'ch1',
                makeEpgProgram(
                    '2024-01-15T13:00:00.000Z',
                    '2024-01-15T12:00:00.000Z'
                )
            );
            componentRef.setInput('channelEpgMap', epgMap);
            fixture.detectChanges();

            const meta = component.epgMetadataMap().get('ch1')!;
            expect(meta.progressPercentage).toBe(0);
        });

        it('should clamp progress to 100 for completed programs', () => {
            jest.useFakeTimers();
            jest.setSystemTime(
                new Date('2024-01-15T14:00:00.000Z')
            );

            const epgMap = new Map<string, EpgProgram | null>();
            epgMap.set(
                'ch1',
                makeEpgProgram(
                    '2024-01-15T12:00:00.000Z',
                    '2024-01-15T13:00:00.000Z'
                )
            );
            componentRef.setInput('channelEpgMap', epgMap);
            fixture.detectChanges();

            const meta = component.epgMetadataMap().get('ch1')!;
            expect(meta.progressPercentage).toBe(100);
        });

        it('should return 0 for programs not yet started', () => {
            jest.useFakeTimers();
            jest.setSystemTime(
                new Date('2024-01-15T11:00:00.000Z')
            );

            const epgMap = new Map<string, EpgProgram | null>();
            epgMap.set(
                'ch1',
                makeEpgProgram(
                    '2024-01-15T12:00:00.000Z',
                    '2024-01-15T13:00:00.000Z'
                )
            );
            componentRef.setInput('channelEpgMap', epgMap);
            fixture.detectChanges();

            const meta = component.epgMetadataMap().get('ch1')!;
            expect(meta.progressPercentage).toBe(0);
        });
    });

    describe('trackByFn', () => {
        it('should return channel id', () => {
            expect(component.trackByFn(0, channels[0])).toBe('ch1');
        });
    });

    describe('output emitters', () => {
        it('should emit channelSelected on onChannelClick', () => {
            fixture.detectChanges();
            const spy = jest.fn();
            component.channelSelected.subscribe(spy);

            component.onChannelClick(channels[0]);
            expect(spy).toHaveBeenCalledWith(channels[0]);
        });

        it('should emit favoriteToggled on onFavoriteToggle', () => {
            fixture.detectChanges();
            const spy = jest.fn();
            component.favoriteToggled.subscribe(spy);
            const mockEvent = new MouseEvent('click');

            component.onFavoriteToggle(channels[1], mockEvent);
            expect(spy).toHaveBeenCalledWith({
                channel: channels[1],
                event: mockEvent,
            });
        });
    });

    describe('ngOnDestroy', () => {
        it('should clear search debounce timeout', () => {
            jest.useFakeTimers();
            fixture.detectChanges();

            component.onSearchInput('test');
            component.ngOnDestroy();

            // After destroy + timeout, searchTerm should not have updated
            jest.advanceTimersByTime(500);
            expect(component.searchTerm()).toBe('');
        });
    });
});
