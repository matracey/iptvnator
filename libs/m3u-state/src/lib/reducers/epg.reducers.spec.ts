import { Channel, EpgProgram } from 'shared-interfaces';
import { EpgActions } from '../actions';
import { initialState, PlaylistState } from '../state';

import { playlistReducer } from './index';

const reducer = playlistReducer;

function makeChannel(overrides: Partial<Channel> = {}): Channel {
    return {
        id: 'ch1',
        url: 'http://example.com/stream',
        name: 'Test Channel',
        group: { title: 'Group' },
        tvg: { id: '', name: '', url: '', logo: '', rec: '' },
        http: { referrer: '', 'user-agent': '', origin: '' },
        radio: '',
        epgParams: '',
        ...overrides,
    };
}

function makeProgram(overrides: Partial<EpgProgram> = {}): EpgProgram {
    return {
        start: '20240115120000 +0000',
        stop: '20240115130000 +0000',
        channel: 'ch1',
        title: 'Test Program',
        desc: 'A description',
        category: 'News',
        ...overrides,
    };
}

describe('epgReducers', () => {
    describe('setActiveEpgProgram', () => {
        it('should set epgParams on active channel', () => {
            const prev: PlaylistState = {
                ...initialState,
                active: makeChannel(),
            };
            const program = makeProgram();
            const state = reducer(
                prev,
                EpgActions.setActiveEpgProgram({ program })
            );

            expect(state.active).toBeDefined();
            expect(state.active!.epgParams).toMatch(/^\?utc=\d+&lutc=\d+$/);
        });

        it('should leave active undefined if no active channel', () => {
            const state = reducer(
                initialState,
                EpgActions.setActiveEpgProgram({ program: makeProgram() })
            );
            expect(state.active).toBeUndefined();
        });
    });

    describe('resetActiveEpgProgram', () => {
        it('should clear epgParams on active channel', () => {
            const prev: PlaylistState = {
                ...initialState,
                active: makeChannel({ epgParams: '?utc=123&lutc=456' }),
            };
            const state = reducer(prev, EpgActions.resetActiveEpgProgram());
            expect(state.active!.epgParams).toBe('');
        });

        it('should leave active undefined if no active channel', () => {
            const state = reducer(initialState, EpgActions.resetActiveEpgProgram());
            expect(state.active).toBeUndefined();
        });
    });

    describe('setCurrentEpgProgram', () => {
        it('should set currentEpgProgram', () => {
            const program = makeProgram({ title: 'Current' });
            const state = reducer(
                initialState,
                EpgActions.setCurrentEpgProgram({ program })
            );
            expect(state.currentEpgProgram).toBeDefined();
            expect(state.currentEpgProgram!.title).toBe('Current');
        });
    });

    describe('setEpgAvailableFlag', () => {
        it('should set epgAvailable to true', () => {
            const state = reducer(
                initialState,
                EpgActions.setEpgAvailableFlag({ value: true })
            );
            expect(state.epgAvailable).toBe(true);
        });

        it('should set epgAvailable to false', () => {
            const prev: PlaylistState = { ...initialState, epgAvailable: true };
            const state = reducer(
                prev,
                EpgActions.setEpgAvailableFlag({ value: false })
            );
            expect(state.epgAvailable).toBe(false);
        });
    });
});
