import { createReducer } from '@ngrx/store';
import { Channel } from 'shared-interfaces';
import { ChannelActions } from '../actions';
import { initialState, PlaylistState } from '../state';
import { channelReducers } from './channel.reducers';

const reducer = createReducer(initialState, ...channelReducers);

function makeChannel(overrides: Partial<Channel> = {}): Channel {
    return {
        id: 'ch1',
        url: 'http://example.com/stream',
        name: 'Test Channel',
        group: { title: 'Group' },
        tvg: { id: '', name: '', url: '', logo: '', rec: '' },
        http: { referrer: '', 'user-agent': '', origin: '' },
        radio: '',
        ...overrides,
    };
}

describe('channelReducers', () => {
    describe('setActiveChannelSuccess', () => {
        it('should set active channel with empty epgParams', () => {
            const channel = makeChannel({ name: 'Active Ch' });
            const action = ChannelActions.setActiveChannelSuccess({ channel });
            const state = reducer(initialState, action);

            expect(state.active).toBeDefined();
            expect(state.active!.name).toBe('Active Ch');
            expect(state.active!.epgParams).toBe('');
        });

        it('should override previous active channel', () => {
            const prev: PlaylistState = {
                ...initialState,
                active: makeChannel({ name: 'Old' }),
            };
            const channel = makeChannel({ name: 'New' });
            const state = reducer(
                prev,
                ChannelActions.setActiveChannelSuccess({ channel })
            );

            expect(state.active!.name).toBe('New');
        });
    });

    describe('resetActiveChannel', () => {
        it('should reset active to undefined', () => {
            const prev: PlaylistState = {
                ...initialState,
                active: makeChannel(),
            };
            const state = reducer(prev, ChannelActions.resetActiveChannel());
            expect(state.active).toBeUndefined();
        });
    });

    describe('setChannels', () => {
        it('should set channels array', () => {
            const channels = [makeChannel({ id: 'c1' }), makeChannel({ id: 'c2' })];
            const state = reducer(
                initialState,
                ChannelActions.setChannels({ channels })
            );

            expect(state.channels).toHaveLength(2);
            expect(state.channels[0].id).toBe('c1');
        });

        it('should replace existing channels', () => {
            const prev: PlaylistState = {
                ...initialState,
                channels: [makeChannel({ id: 'old' })],
            };
            const channels = [makeChannel({ id: 'new' })];
            const state = reducer(prev, ChannelActions.setChannels({ channels }));

            expect(state.channels).toHaveLength(1);
            expect(state.channels[0].id).toBe('new');
        });
    });
});
