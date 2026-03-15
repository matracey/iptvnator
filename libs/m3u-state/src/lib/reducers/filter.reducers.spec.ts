import { createReducer } from '@ngrx/store';
import { FilterActions } from '../actions';
import { initialState } from '../state';
import { filterReducers } from './filter.reducers';

const reducer = createReducer(initialState, ...filterReducers);

describe('filterReducers', () => {
    describe('setSelectedFilters', () => {
        it('should set selectedFilters on the playlists state', () => {
            const state = reducer(
                initialState,
                FilterActions.setSelectedFilters({
                    selectedFilters: ['m3u', 'xtream'],
                })
            );
            expect(state.playlists.selectedFilters).toEqual([
                'm3u',
                'xtream',
            ]);
        });

        it('should replace existing filters', () => {
            const first = reducer(
                initialState,
                FilterActions.setSelectedFilters({
                    selectedFilters: ['stalker'],
                })
            );
            const second = reducer(
                first,
                FilterActions.setSelectedFilters({
                    selectedFilters: ['m3u'],
                })
            );
            expect(second.playlists.selectedFilters).toEqual(['m3u']);
        });

        it('should handle empty filters array', () => {
            const state = reducer(
                initialState,
                FilterActions.setSelectedFilters({ selectedFilters: [] })
            );
            expect(state.playlists.selectedFilters).toEqual([]);
        });
    });
});
