import { ScrollingModule } from '@angular/cdk/scrolling';

import {
    ChangeDetectionStrategy,
    Component,
    computed,
    ElementRef,
    HostListener,
    input,
    OnDestroy,
    output,
    signal,
    viewChild,
} from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { TranslatePipe } from '@ngx-translate/core';
import { Channel, EpgProgram } from 'shared-interfaces';
import { ChannelListItemComponent } from '../channel-list-item/channel-list-item.component';

/** Enriched channel with pre-computed EPG and progress data */
export interface EnrichedChannel extends Channel {
    epgProgram: EpgProgram | null | undefined;
    progressPercentage: number;
}

@Component({
    selector: 'app-all-channels-view',
    templateUrl: './all-channels-view.component.html',
    styleUrls: ['./all-channels-view.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ChannelListItemComponent,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        ScrollingModule,
        TranslatePipe,
    ],
})
export class AllChannelsViewComponent implements OnDestroy {
    /** All channels (will be filtered by search) */
    readonly channels = input.required<Channel[]>();

    /** EPG map for channel enrichment */
    readonly channelEpgMap = input.required<Map<string, EpgProgram | null>>();

    /** Progress tick to trigger progress recalculation */
    readonly progressTick = input.required<number>();

    /** Whether to show EPG data */
    readonly shouldShowEpg = input.required<boolean>();

    /** Item size for virtual scroll */
    readonly itemSize = input.required<number>();

    /** Currently active channel URL */
    readonly activeChannelUrl = input<string | undefined>();

    /** Set of favorite channel URLs */
    readonly favoriteIds = input<Set<string>>(new Set());

    /** Emits when a channel is selected */
    readonly channelSelected = output<Channel>();

    /** Emits when favorite is toggled */
    readonly favoriteToggled = output<{
        channel: Channel;
        event: MouseEvent;
    }>();

    /** Search term signal for debounced filtering */
    readonly searchTerm = signal('');

    /** Debounce timeout for search */
    private searchDebounceTimeout?: number;

    /** Search field element */
    readonly searchElement = viewChild<ElementRef<HTMLInputElement>>('search');

    /** Register ctrl+f as keyboard hotkey to focus the search input field */
    @HostListener('document:keypress', ['$event'])
    handleKeyboardEvent(event: KeyboardEvent): void {
        if (event.key === 'f' && event.ctrlKey) {
            this.searchElement()?.nativeElement.focus();
        }
    }

    /**
     * Filtered channels (no cloning — just a subset reference).
     */
    readonly filteredChannels = computed(() => {
        const term = this.searchTerm().toLowerCase();
        const channels = this.channels();
        if (!term) return channels;
        return channels.filter((ch) => ch.name?.toLowerCase().includes(term));
    });

    /**
     * Side-car EPG metadata map keyed by channel EPG ID.
     * Rebuilt every progressTick (~30 s) but only touches channels that have EPG data.
     */
    readonly epgMetadataMap = computed(() => {
        const epgMap = this.channelEpgMap();
        this.progressTick(); // dependency for refresh
        const result = new Map<
            string,
            {
                epgProgram: EpgProgram | null | undefined;
                progressPercentage: number;
            }
        >();
        epgMap.forEach((program, channelId) => {
            result.set(channelId, {
                epgProgram: program,
                progressPercentage: this.calculateProgress(program),
            });
        });
        return result;
    });

    getChannelEpgKey(channel: Channel): string {
        return channel?.tvg?.id?.trim() || channel?.name?.trim() || '';
    }

    /**
     * Handles debounced search input
     */
    onSearchInput(value: string): void {
        clearTimeout(this.searchDebounceTimeout);
        this.searchDebounceTimeout = window.setTimeout(() => {
            this.searchTerm.set(value);
        }, 300);
    }

    /**
     * Calculates progress percentage for an EPG program
     */
    private calculateProgress(
        epgProgram: EpgProgram | null | undefined
    ): number {
        if (!epgProgram) {
            return 0;
        }

        const now = Date.now();
        const start = new Date(epgProgram.start).getTime();
        const stop = new Date(epgProgram.stop).getTime();

        // Validate start/stop are finite numbers
        if (!Number.isFinite(start) || !Number.isFinite(stop)) {
            return 0;
        }

        const total = stop - start;

        // Bail out if duration is zero or negative
        if (total <= 0) {
            return 0;
        }

        // Clamp elapsed to [0, total]
        const elapsed = Math.min(total, Math.max(0, now - start));

        return Math.round((elapsed / total) * 100);
    }

    trackByFn(_: number, channel: Channel): string {
        return channel?.id;
    }

    onChannelClick(channel: Channel): void {
        this.channelSelected.emit(channel);
    }

    onFavoriteToggle(channel: Channel, event: MouseEvent): void {
        this.favoriteToggled.emit({ channel, event });
    }

    ngOnDestroy(): void {
        if (this.searchDebounceTimeout) {
            clearTimeout(this.searchDebounceTimeout);
        }
    }
}
