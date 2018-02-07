/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow
import { combineReducers } from 'redux';

import type { Action } from '../types/store';
import type { State, AppState, AppViewState, Reducer } from '../types/reducers';
import type { ZipEntries, FileFromZip } from 'jszip';

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
function zipFile(state = null, action: Action): ZipEntries | null {
  switch (action.type) {
    case 'RECEIVE_ZIP_FILE': {
      return action.zip;
    }
    default:
      return state;
  }
}

function selectedZipFileIndex(
  state: null | IndexIntoZipFileTable = null,
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
  state: Array<IndexIntoZipFileTable | null> = [],
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
export const getZipEntries = (state: State): ZipEntries | null =>
  getApp(state).zipFile;
export const getSelectedZipFileIndex = (
  state: State
): IndexIntoZipFileTable | null => getApp(state).selectedZipFileIndex;
export const getExpandedZipFileIndexes = (
  state: State
): Array<IndexIntoZipFileTable | null> => getApp(state).expandedZipFileIndexes;
export const getIsUrlSetupDone = (state: State): boolean =>
  getApp(state).isUrlSetupDone;
export const getHasZoomedViaMousewheel = (state: Object): boolean => {
  return getApp(state).hasZoomedViaMousewheel;
};

import { createSelector } from 'reselect';

export type IndexIntoZipFileTable = number;
/**
 * The zip file table takes the files data structure of {[filePath]: fileContents} and
 * maps it into a hierarchical table that can be used by the TreeView component to
 * generate a file tree.
 */
export type ZipFileTable = {|
  prefix: Array<IndexIntoZipFileTable | null>,
  path: string[], // e.g. "profile_tresize/tresize/cycle_0.profile"
  partName: string[], // e.g. "cycle_0.profile" or "tresize"
  file: Array<FileFromZip | null>,
  depth: number[],
  length: number,
|};

export const getZipFileTable = createSelector(getZipEntries, zipEntries => {
  if (!zipEntries) {
    return null;
  }

  const fullPaths = Object.keys(zipEntries.files);
  const pathToFilesTableIndex: Map<string, IndexIntoZipFileTable> = new Map();
  const filesTable: ZipFileTable = {
    prefix: [],
    path: [],
    partName: [],
    file: [],
    depth: [],
    length: 0,
  };

  for (let i = 0; i < fullPaths.length; i++) {
    // e.g.: 'profile_tresize/tresize/cycle_0.profile'
    const fullPath = fullPaths[i];
    // e.g.: ['profile_tresize', 'tresize', 'cycle_0.profile']
    const pathParts = fullPath.split('/');

    let path = '';
    let prefixIndex = null;
    for (let j = 1; j < pathParts.length; j++) {
      // Go through each path part to assemble the table
      const pathPart = pathParts[i];

      // Add the path part to the path.
      if (path) {
        path += '/' + pathPart;
      } else {
        path = pathPart;
      }

      // This part of the path may already exist.
      const existingIndex = pathToFilesTableIndex.get(path);
      if (existingIndex !== undefined) {
        // This folder was already added, so skip it, but remember the prefix.
        prefixIndex = existingIndex;
        continue;
      }

      const index = filesTable.length++;
      filesTable.prefix[index] = prefixIndex;
      filesTable.path[index] = path;
      filesTable.partName[index] = pathPart;
      filesTable.depth[index] = j;
      filesTable.file[index] = zipEntries.files[fullPath];

      // Remember this index as the prefix.
      prefixIndex = index;
    }
  }
  return filesTable;
});

export const getZipFileMaxDepth = createSelector(
  getZipFileTable,
  zipFileTable => {
    if (!zipFileTable) {
      return 0;
    }
    let maxDepth = 0;
    for (let i = 0; i < zipFileTable.length; i++) {
      maxDepth = Math.max(maxDepth, zipFileTable.depth[i]);
    }
    return maxDepth;
  }
);
