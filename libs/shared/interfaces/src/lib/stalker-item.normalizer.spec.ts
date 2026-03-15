import {
    extractStalkerItemId,
    extractStalkerItemTitle,
    extractStalkerItemPoster,
    extractStalkerItemType,
    normalizeStalkerDate,
    stalkerItemMatchesId,
} from './stalker-item.normalizer';

describe('extractStalkerItemId', () => {
    it('should return id field when present', () => {
        expect(extractStalkerItemId({ id: '42' })).toBe('42');
    });

    it('should return stream_id when id is absent', () => {
        expect(extractStalkerItemId({ stream_id: 100 })).toBe('100');
    });

    it('should return series_id when id and stream_id are absent', () => {
        expect(extractStalkerItemId({ series_id: 'S1' })).toBe('S1');
    });

    it('should return movie_id as last resort', () => {
        expect(extractStalkerItemId({ movie_id: 999 })).toBe('999');
    });

    it('should return fallback when no id fields are present', () => {
        expect(extractStalkerItemId({}, 'prefix', 3)).toBe('prefix-3');
    });

    it('should return fallback for empty string id', () => {
        expect(extractStalkerItemId({ id: '  ' }, 'fb', 0)).toBe('fb-0');
    });

    it('should prefer id=0 as a falsy but valid value (0 → string "0")', () => {
        expect(extractStalkerItemId({ id: 0 })).toBe('0');
    });
});

describe('extractStalkerItemTitle', () => {
    it('should return title if present', () => {
        expect(extractStalkerItemTitle({ title: 'My Channel' })).toBe(
            'My Channel'
        );
    });

    it('should fall back to o_name', () => {
        expect(extractStalkerItemTitle({ o_name: 'Original' })).toBe(
            'Original'
        );
    });

    it('should fall back to name', () => {
        expect(extractStalkerItemTitle({ name: 'Name' })).toBe('Name');
    });

    it('should return Unknown when no title fields exist', () => {
        expect(extractStalkerItemTitle({})).toBe('Unknown');
    });
});

describe('extractStalkerItemPoster', () => {
    it('should return cover if present', () => {
        expect(extractStalkerItemPoster({ cover: 'http://img/c.jpg' })).toBe(
            'http://img/c.jpg'
        );
    });

    it('should fall back to logo', () => {
        expect(extractStalkerItemPoster({ logo: 'http://img/l.jpg' })).toBe(
            'http://img/l.jpg'
        );
    });

    it('should fall back to poster_url', () => {
        expect(
            extractStalkerItemPoster({ poster_url: 'http://img/p.jpg' })
        ).toBe('http://img/p.jpg');
    });

    it('should return empty string when no poster fields exist', () => {
        expect(extractStalkerItemPoster({})).toBe('');
    });
});

describe('extractStalkerItemType', () => {
    it('should return live when category_id is itv', () => {
        expect(extractStalkerItemType({ category_id: 'itv' })).toBe('live');
    });

    it('should return live when stream_type is live', () => {
        expect(extractStalkerItemType({ stream_type: 'live' })).toBe('live');
    });

    it('should return series when category_id is series', () => {
        expect(extractStalkerItemType({ category_id: 'series' })).toBe(
            'series'
        );
    });

    it('should return series when is_series is true', () => {
        expect(extractStalkerItemType({ is_series: true })).toBe('series');
    });

    it('should return series when is_series is 1 (number)', () => {
        expect(extractStalkerItemType({ is_series: 1 })).toBe('series');
    });

    it('should return series when is_series is "1" (string)', () => {
        expect(extractStalkerItemType({ is_series: '1' })).toBe('series');
    });

    it('should return movie by default', () => {
        expect(extractStalkerItemType({})).toBe('movie');
    });

    it('should return movie for unknown category_id', () => {
        expect(extractStalkerItemType({ category_id: 'vod' })).toBe('movie');
    });
});

describe('normalizeStalkerDate', () => {
    it('should convert epoch seconds to ISO string', () => {
        const result = normalizeStalkerDate(1700000000);
        expect(result).toBe(new Date(1700000000 * 1000).toISOString());
    });

    it('should handle epoch milliseconds', () => {
        const ms = 1700000000000;
        const result = normalizeStalkerDate(ms);
        expect(result).toBe(new Date(ms).toISOString());
    });

    it('should convert numeric string (seconds) to ISO string', () => {
        const result = normalizeStalkerDate('1700000000');
        expect(result).toBe(new Date(1700000000 * 1000).toISOString());
    });

    it('should convert numeric string (milliseconds) to ISO string', () => {
        const result = normalizeStalkerDate('1700000000000');
        expect(result).toBe(new Date(1700000000000).toISOString());
    });

    it('should parse ISO date strings', () => {
        const result = normalizeStalkerDate('2023-11-14T22:13:20.000Z');
        expect(result).toBe('2023-11-14T22:13:20.000Z');
    });

    it('should return empty string for non-finite number', () => {
        expect(normalizeStalkerDate(NaN)).toBe('');
        expect(normalizeStalkerDate(Infinity)).toBe('');
    });

    it('should return empty string for null/undefined', () => {
        expect(normalizeStalkerDate(null)).toBe('');
        expect(normalizeStalkerDate(undefined)).toBe('');
    });

    it('should return empty string for unparseable string', () => {
        expect(normalizeStalkerDate('not-a-date')).toBe('');
    });
});

describe('stalkerItemMatchesId', () => {
    it('should return true when item id matches target', () => {
        expect(stalkerItemMatchesId({ id: '42' }, '42')).toBe(true);
    });

    it('should return false when item id does not match', () => {
        expect(stalkerItemMatchesId({ id: '42' }, '99')).toBe(false);
    });

    it('should match using fallback when no id fields exist', () => {
        expect(stalkerItemMatchesId({}, 'pfx-0', 'pfx', 0)).toBe(true);
    });

    it('should handle null item', () => {
        expect(stalkerItemMatchesId(null, '-0', '', 0)).toBe(true);
    });
});
