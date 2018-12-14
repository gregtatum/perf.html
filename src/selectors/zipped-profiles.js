/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow
import { createSelector } from 'reselect';
import { getProfileUrl } from './url-state';
import { ensureExists } from '../utils/flow';
import * as ZipFiles from '../profile-logic/zip-files';

import type { ZipFileState, ZippedProfilesState } from '../types/state';
import type { Selector } from '../types/store';
import type { IndexIntoZipFileTable } from '../profile-logic/zip-files';
import type JSZip from 'jszip';

/**
 * Simple selectors into the ZippedProfilesState.
 */
export const getZippedProfilesState: Selector<ZippedProfilesState> = state =>
  state.zippedProfiles;
export const getSelectedZipFileIndex: Selector<IndexIntoZipFileTable | null> = state =>
  getZippedProfilesState(state).selectedZipFileIndex;
export const getExpandedZipFileIndexes: Selector<
  Array<IndexIntoZipFileTable | null>
> = state => getZippedProfilesState(state).expandedZipFileIndexes;
export const getZipFileState: Selector<*> = (state): ZipFileState =>
  getZippedProfilesState(state).zipFile;
export const getZipFile: Selector<*> = (state): JSZip | null => {
  return getZipFileState(state).zip;
};
export const getHasZipFile: Selector<*> = (state): boolean =>
  getZipFileState(state).phase !== 'NO_ZIP_FILE';

/**
 * Look up the message in the zip file error.
 */
export const getZipFileErrorMessage: Selector<string | null> = state => {
  const { error } = getZippedProfilesState(state);
  return error === null ? null : error.message;
};

/**
 * Creates a zip file table, if a zip file exists.
 */
export const getZipFileTableOrNull: Selector<null | ZipFiles.ZipFileTable> = createSelector(
  getZipFile,
  zip => (zip === null ? null : ZipFiles.createZipTable(zip))
);

/**
 * Avoid a null check, by throwing an error if trying to use a zip file when it
 * doesn't exist.
 */
export const getZipFileTable: Selector<ZipFiles.ZipFileTable> = state =>
  ensureExists(
    getZipFileTableOrNull(state),
    'Attempted to view a profile from a zip, when there is no zip file loaded.'
  );

/**
 * Compute the max depth of the zip file directory structure.
 */
export const getZipFileMaxDepth: Selector<number> = createSelector(
  getZipFileTable,
  ZipFiles.getZipFileMaxDepth
);

/**
 * Create a ZipFileTree class if a zip file exists. This is used to render a file
 * picker to load profiles from the zip file.
 */
export const getZipFileTreeOrNull: Selector<ZipFiles.ZipFileTree | null> = createSelector(
  getZipFileTable,
  getProfileUrl,
  (zipFileTable, zipFileUrl) =>
    zipFileTable === null
      ? null
      : new ZipFiles.ZipFileTree(zipFileTable, zipFileUrl)
);

/**
 * Avoid a null check, by throwing an error if trying to use zip a file when it doesn't
 * exist.
 */
export const getZipFileTree: Selector<*> = state =>
  ensureExists(
    getZipFileTreeOrNull(state),
    'Attempted to view a profile from a zip, when there is no zip file loaded.'
  );
