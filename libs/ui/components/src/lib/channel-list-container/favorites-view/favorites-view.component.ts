import {
    CdkDragDrop,
    DragDropModule,
    moveItemInArray,
} from '@angular/cdk/drag-drop';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
    output,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Channel, EpgProgram } from 'shared-interfaces';
import { ChannelListItemComponent } from '../channel-list-item/channel-list-item.component';

@Component({
    selector: 'app-favorites-view',
    templateUrl: './favorites-view.component.html',
    styleUrls: ['./favorites-view.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ChannelListItemComponent, DragDropModule, TranslatePipe],
})
export class FavoritesViewComponent {
    /** Favorite channels */
    readonly favorites = input.required<Channel[]>();

    /** EPG map for channel enrichment */
    readonly channelEpgMap = input.required<Map<string, EpgProgram | null>>();

    /** Progress tick to trigger progress recalculation */
    readonly progressTick = input.required<number>();

    /** Whether to show EPG data */
    readonly shouldShowEpg = input.required<boolean>();

    /** Currently active channel URL */
    readonly activeChannelUrl = input<string | undefined>();

    /** Emits when a channel is selected */
    readonly channelSelected = output<Channel>();

    /** Emits when favorite is toggled (removed) */
    readonly favoriteToggled = output<{
        channel: Channel;
        event: MouseEvent;
    }>();

    /** Emits when favorites order changes via drag-drop */
    readonly favoritesReordered = output<string[]>();

    /**
     * Side-car EPG metadata map keyed by channel EPG ID.
     * Rebuilt every progressTick (~30 s) but only creates entries for channels with EPG data.
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
     * Calculates progress percentage for an EPG program
     */
    private calculateProgress(
        epgProgram: EpgProgram | null | undefined
    ): number {
        if (!epgProgram) {
            return 0;
        }

        const now = new Date().getTime();
        const start = new Date(epgProgram.start).getTime();
        const stop = new Date(epgProgram.stop).getTime();

        const total = stop - start;
        const elapsed = now - start;

        return Math.min(100, Math.max(0, (elapsed / total) * 100));
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

    onDrop(event: CdkDragDrop<Channel[]>): void {
        const favorites = [...this.favorites()];
        moveItemInArray(favorites, event.previousIndex, event.currentIndex);
        this.favoritesReordered.emit(favorites.map((item) => item.url));
    }
}
