import { MomentDatePipe } from './moment-date.pipe';

jest.mock('moment', () => {
    const actualMoment = jest.requireActual('moment');
    const fn = actualMoment.default || actualMoment;
    fn.default = fn;
    return fn;
});

describe('Pipe: MomentDate', () => {
    let pipe: MomentDatePipe;

    beforeEach(() => {
        pipe = new MomentDatePipe();
    });

    it('should create an instance', () => {
        expect(pipe).toBeTruthy();
    });

    it('should format an ISO date string with default format', () => {
        const isoDate = '2024-06-15T14:30:00Z';
        const result = pipe.transform(isoDate);
        // Default format is 'MMMM Do, dddd'
        expect(result).toContain('June');
        expect(result).toContain('15th');
    });

    it('should format a date with a custom return format', () => {
        const isoDate = '2024-06-15T14:30:00Z';
        const result = pipe.transform(isoDate, 'YYYY-MM-DD');
        expect(result).toBe('2024-06-15');
    });

    it('should parse with a custom input format', () => {
        const dateStr = '15/06/2024';
        const result = pipe.transform(dateStr, 'YYYY-MM-DD', 'DD/MM/YYYY');
        expect(result).toBe('2024-06-15');
    });

    it('should handle ISO 8601 date auto-detection', () => {
        const isoDate = '2024-07-15T12:00:00.000Z';
        const result = pipe.transform(isoDate, 'YYYY');
        expect(result).toBe('2024');
    });
});
