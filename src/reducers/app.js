/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow
import { combineReducers } from 'redux';
import { createSelector } from 'reselect';
import { oneLine } from 'common-tags';

import * as ZipFiles from '../profile-logic/zip-files';

import type { Action } from '../types/store';
import type {
  State,
  AppState,
  AppViewState,
  Reducer,
  ZipFileState,
} from '../types/reducers';

function view(
  state: AppViewState = { phase: 'INITIALIZING' },
  action: Action
): AppViewState {
  if (state.phase === 'DATA_LOADED') {
    // Let's not come back at another phase if we're already displaying a profile
    return state;
  }

  switch (action.type) {
    case 'TEMPORARY_ERROR_RECEIVING_PROFILE_FROM_STORE':
    case 'TEMPORARY_ERROR_RECEIVING_PROFILE_FROM_URL':
    case 'TEMPORARY_ERROR_RECEIVING_PROFILE_FROM_ADDON':
      return {
        phase: 'INITIALIZING',
        additionalData: {
          message: action.error.message,
          attempt: action.error.attempt,
        },
      };
    case 'ERROR_RECEIVING_PROFILE_FROM_FILE':
    case 'FATAL_ERROR_RECEIVING_PROFILE_FROM_ADDON':
    case 'FATAL_ERROR_RECEIVING_PROFILE_FROM_STORE':
    case 'FATAL_ERROR_RECEIVING_PROFILE_FROM_URL':
      return { phase: 'FATAL_ERROR', error: action.error };
    case 'WAITING_FOR_PROFILE_FROM_ADDON':
      return { phase: 'INITIALIZING' };
    case 'ROUTE_NOT_FOUND':
      return { phase: 'ROUTE_NOT_FOUND' };
    case 'RECEIVE_ZIP_FILE':
    case 'VIEW_PROFILE':
      return { phase: 'DATA_LOADED' };
    default:
      return state;
  }
}

function isUrlSetupDone(state: boolean = false, action: Action) {
  switch (action.type) {
    case '@@urlenhancer/urlSetupDone':
      return true;
    default:
      return state;
  }
}

function hasZoomedViaMousewheel(state: boolean = false, action: Action) {
  switch (action.type) {
    case 'HAS_ZOOMED_VIA_MOUSEWHEEL': {
      return true;
    }
    default:
      return state;
  }
}

function _validateStateTransition(
  prev: ZipFileState,
  next: ZipFileState
): ZipFileState {
  const prevPhase = prev.phase;
  let expectedNextPhases;
  switch (prevPhase) {
    case 'NO_ZIP_FILE':
      expectedNextPhases = ['LOADING_ZIP_FILE'];
      break;
    case 'LOADING_ZIP_FILE':
      expectedNextPhases = ['LIST_FILES_IN_ZIP_FILE'];
      break;
    case 'LIST_FILES_IN_ZIP_FILE':
      expectedNextPhases = ['PROCESS_PROFILE_FROM_ZIP_FILE'];
      break;
    case 'PROCESS_PROFILE_FROM_ZIP_FILE':
      expectedNextPhases = [
        'VIEW_PROFILE_IN_ZIP_FILE',
        'ERROR_PROCESSING_PROFILE',
      ];
      break;
    case 'VIEW_PROFILE_IN_ZIP_FILE':
      expectedNextPhases = ['LIST_FILES_IN_ZIP_FILE'];
      break;
    default:
      throw new Error(`Unhandled ZipFileState ${(prevPhase: empty)}`);
  }
  if (!expectedNextPhases.includes(next.phase)) {
    throw new Error(oneLine`
      Attempted to transition a finite state machine from the phase “${prev.phase}”
      to “${next.phase}”, however “${prev.phase}” can only transition to
      “${expectedNextPhases.join('”, “')}”.
    `);
  }
  return next;
}

function _getZipFile(state: ZipFileState) {
  const { zip } = state;
  if (!zip) {
    throw new Error('Expected to find a zip file in the state.');
  }
  return zip;
}

/**
 * A zip file can hold many profiles, keep it up at the app level.
 */
function zipFile(
  state: ZipFileState = { phase: 'NO_ZIP_FILE', zip: null },
  action: Action
): ZipFileState {
  switch (action.type) {
    case 'LOAD_PROFILE_IN_ZIP': {
      return _validateStateTransition(state, {
        phase: 'PROCESS_PROFILE_FROM_ZIP_FILE',
        zip: _getZipFile(state),
      });
    }
    case 'RECEIVE_ZIP_FILE': {
      return _validateStateTransition(state, {
        phase: 'LIST_FILES_IN_ZIP_FILE',
        zip: action.zip,
      });
    }
    default:
      return state;
  }
}

function selectedZipFileIndex(
  state: null | ZipFiles.IndexIntoZipFileTable = null,
  action: Action
) {
  switch (action.type) {
    case 'CHANGE_SELECTED_ZIP_FILE': {
      return action.selectedZipFileIndex;
    }
    default:
      return state;
  }
}

function expandedZipFileIndexes(
  // In practice this should never contain null, but needs to support the
  // TreeView interface.
  state: Array<ZipFiles.IndexIntoZipFileTable | null> = [],
  action: Action
) {
  switch (action.type) {
    case 'CHANGE_EXPANDED_ZIP_FILES': {
      return action.expandedZipFileIndexes;
    }
    default:
      return state;
  }
}

const appStateReducer: Reducer<AppState> = combineReducers({
  view,
  isUrlSetupDone,
  hasZoomedViaMousewheel,
  zipFile,
  selectedZipFileIndex,
  expandedZipFileIndexes,
});

export default appStateReducer;

export const getApp = (state: State): AppState => state.app;
export const getView = (state: State): AppViewState => getApp(state).view;
export const getSelectedZipFileIndex = (state: State) =>
  getApp(state).selectedZipFileIndex;
export const getExpandedZipFileIndexes = (state: State) =>
  getApp(state).expandedZipFileIndexes;
export const getIsUrlSetupDone = (state: State): boolean =>
  getApp(state).isUrlSetupDone;
export const getHasZoomedViaMousewheel = (state: Object): boolean => {
  return getApp(state).hasZoomedViaMousewheel;
};

export const getZipFileState = (state: State): ZipFileState =>
  getApp(state).zipFile;
export const getZipFileTable = createSelector(getZipFileState, zipFileState => {
  switch (zipFileState.phase) {
    case 'NONE':
    case 'LOADING':
      return null;
    case 'LOADED':
      return ZipFiles.createZipTable(zipFileState.zip);
    default:
      (zipFileState: empty); // eslint-disable-line no-unused-expressions
      throw new Error('Unknown zip file phase.');
  }
});
export const hasZipFile = (state: State): boolean =>
  getZipFileState(state).phase === 'NONE';

export const getZipFileMaxDepth = createSelector(
  getZipFileTable,
  ZipFiles.getZipFileMaxDepth
);

export const getZipFileTree = createSelector(getZipFileTable, zipFileTable => {
  if (zipFileTable) {
    return new ZipFiles.ZipFileTree(zipFileTable);
  } else {
    return null;
  }
});
