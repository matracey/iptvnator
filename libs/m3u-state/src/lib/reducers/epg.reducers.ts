import { on } from '@ngrx/store';
import { parse, getUnixTime } from 'date-fns';
import { Channel } from 'shared-interfaces';
import { EpgActions } from '../actions';
import { PlaylistState } from '../state';

export const epgReducers = [
    on(EpgActions.setActiveEpgProgram, (state, action): PlaylistState => {
        const { program } = action;
        const from = getUnixTime(parse(program.start, 'yyyyMMddHHmmss XX', new Date()));
        const now = Math.floor(Date.now() / 1000);
        const epgParams = `?utc=${from}&lutc=${now}`;
        return {
            ...state,
            active: state.active
                ? ({ ...state.active, epgParams } as Channel)
                : undefined,
        };
    }),
    on(
        EpgActions.resetActiveEpgProgram,
        (state): PlaylistState => ({
            ...state,
            active: state.active
                ? ({ ...state.active, epgParams: '' } as Channel)
                : undefined,
        })
    ),
    on(
        EpgActions.setCurrentEpgProgram,
        (state, action): PlaylistState => ({
            ...state,
            currentEpgProgram: action.program,
        })
    ),
    on(
        EpgActions.setEpgAvailableFlag,
        (state, action): PlaylistState => ({
            ...state,
            epgAvailable: action.value,
        })
    ),
];
