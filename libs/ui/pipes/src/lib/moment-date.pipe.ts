import { Pipe, PipeTransform } from '@angular/core';
import { format, parse } from 'date-fns';

/**
 * Date formatting pipe using date-fns.
 * Auto-detects ISO 8601 format and converts to user's local timezone.
 * Optionally accepts a format string for non-ISO date strings.
 */
@Pipe({
    name: 'momentDate',
    standalone: true,
})
export class MomentDatePipe implements PipeTransform {
    transform(
        value: string,
        formatToReturn = 'MMMM do, EEEE',
        formatToParse?: string
    ): string {
        const parsed = formatToParse
            ? parse(value, formatToParse, new Date())
            : new Date(value);
        if (isNaN(parsed.getTime())) {
            return 'Invalid date';
        }
        return format(parsed, formatToReturn);
    }
}
