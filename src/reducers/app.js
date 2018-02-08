/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow
import { combineReducers } from 'redux';
import { createSelector } from 'reselect';
import * as ZipFiles from '../profile-logic/zip-files';

import type { Action } from '../types/store';
import type { State, AppState, AppViewState, Reducer } from '../types/reducers';
import JSZip from 'jszip';

function view(
  state: AppViewState = { phase: 'INITIALIZING' },
  action: Action
): AppViewState {
  if (state.phase === 'PROFILE') {
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
    case 'RECEIVE_PROFILE_FROM_ADDON':
    case 'RECEIVE_PROFILE_FROM_STORE':
    case 'RECEIVE_PROFILE_FROM_URL':
    case 'RECEIVE_PROFILE_FROM_FILE':
      return { phase: 'PROFILE' };
    case 'RECEIVE_ZIP_FILE':
      return { phase: 'ZIP' };
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

/**
 * A zip file can hold many profiles, keep it up at the app level.
 */
function zipFile(state = null, action: Action): JSZip | null {
  switch (action.type) {
    case 'RECEIVE_ZIP_FILE': {
      return action.zip;
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

export const getJSZip = (state: State): JSZip | null => getApp(state).zipFile;
export const getZipFileTable = createSelector(
  getJSZip,
  ZipFiles.createZipTable
);

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
