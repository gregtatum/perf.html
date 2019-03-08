/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow
import { combineReducers } from 'redux';
import type { CheckedSharingOptions } from '../types/actions';
import type { PublishState, Reducer } from '../types/state';

function _getDefaultSharingOptions(): CheckedSharingOptions {
  return {
    isFiltering: true,
    hiddenThreads: true,
    timeRange: true,
    screenshots: true,
    urls: true,
    extension: true,
  };
}

const checkedSharingOptions: Reducer<CheckedSharingOptions> = (
  state = _getDefaultSharingOptions(),
  action
) => {
  switch (action.type) {
    case 'TOGGLE_CHECKED_SHARING_OPTION':
      return {
        ...state,
        [action.slug]: !state[action.slug],
      };
    default:
      return state;
  }
};

const publishReducer: Reducer<PublishState> = combineReducers({
  checkedSharingOptions,
});

export default publishReducer;
