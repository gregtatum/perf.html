/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow
import { createSelector } from 'reselect';
import {
  getProfile,
  getProfileRootRange,
  getCommittedRange,
  getGlobalTracks,
  getLocalTracksByPid,
} from './profile';
import { compress } from '../utils/gz';
import { serializeProfile } from '../profile-logic/process-profile';
import prettyBytes from '../utils/pretty-bytes';
import { getHiddenGlobalTracks, getHiddenLocalTracksByPid } from './url-state';
import { ensureExists } from '../utils/flow';

import type { PublishState } from '../types/state';
import type { Selector } from '../types/store';
import type { CheckedSharingOptions } from '../types/actions';
import type { RemoveProfileInformation } from '../types/profile-derived';

export const getPublishState: Selector<PublishState> = state => state.publish;

export const getCheckedSharingOptions: Selector<
  CheckedSharingOptions
> = state => getPublishState(state).checkedSharingOptions;

export const getFilenameDateString: Selector<string> = createSelector(
  getProfile,
  getProfileRootRange,
  (profile, rootRange) => {
    const date = new Date(profile.meta.startTime + rootRange.start);
    const pad = x => (x < 10 ? `0${x}` : `${x}`);
    return `${pad(date.getFullYear())}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate()
    )} ${pad(date.getHours())}.${pad(date.getMinutes())}`;
  }
);

export const getRemoveProfileInformation: Selector<RemoveProfileInformation | null> = createSelector(
  getCheckedSharingOptions,
  getProfile,
  getCommittedRange,
  getHiddenGlobalTracks,
  getHiddenLocalTracksByPid,
  getGlobalTracks,
  getLocalTracksByPid,
  (
    checkedSharingOptions,
    profile,
    committedRange,
    hiddenGlobalTracks,
    hiddenLocalTracksByPid,
    globalTracks,
    localTracksByPid
  ) => {
    if (!checkedSharingOptions.isFiltering) {
      return null;
    }

    // Find all of the thread indexes that are hidden.
    const shouldRemoveThreads = new Set();
    if (checkedSharingOptions.hiddenThreads) {
      for (const globalTrackIndex of hiddenGlobalTracks) {
        const globalTrack = globalTracks[globalTrackIndex];
        if (
          globalTrack.type === 'process' &&
          globalTrack.mainThreadIndex !== null
        ) {
          // This is a process thread that has been hidden.
          shouldRemoveThreads.add(globalTrack.mainThreadIndex);
          const localTracks = ensureExists(
            localTracksByPid.get(globalTrack.pid),
            'Expected to be able to get a local track by PID.'
          );

          // Also add all of the children threads, as they are hidden as well.
          for (const localTrack of localTracks) {
            if (localTrack.type === 'thread') {
              shouldRemoveThreads.add(localTrack.threadIndex);
            }
          }
        }
      }

      // Add all of the local tracks that have been hidden.
      for (const [pid, hiddenLocalTrackIndexes] of hiddenLocalTracksByPid) {
        const localTracks = ensureExists(
          localTracksByPid.get(pid),
          'Expected to be able to get a local track by PID'
        );
        for (const hiddenLocalTrackIndex of hiddenLocalTrackIndexes) {
          const localTrack = localTracks[hiddenLocalTrackIndex];
          if (localTrack.type === 'thread') {
            shouldRemoveThreads.add(localTrack.threadIndex);
          }
        }
      }
    }

    return {
      shouldFilterToCommittedRange: checkedSharingOptions.timeRange
        ? committedRange
        : null,
      shouldRemoveNetworkUrls: checkedSharingOptions.urls,
      shouldRemoveAllUrls: checkedSharingOptions.urls,
      shouldRemoveThreadsWithScreenshots: checkedSharingOptions.screenshots
        ? profile.threads.map((_, threadIndex) => threadIndex)
        : [],
      shouldRemoveThreads: [...shouldRemoveThreads],
      shouldRemoveExtensions: checkedSharingOptions.extension,
    };
  }
);

export const getSanitizedProfileBlob: Selector<Promise<Blob>> = createSelector(
  getRemoveProfileInformation,
  getProfile,
  async (removeProfileInformation, profile) => {
    const data = await compress(
      serializeProfile(profile, removeProfileInformation)
    );
    return new Blob([data], { type: 'application/octet-binary' });
  }
);

export const getCompressedProfileBlobUrl: Selector<
  Promise<string>
> = createSelector(getSanitizedProfileBlob, blobPromise =>
  blobPromise.then(blob => URL.createObjectURL(blob))
);

export const getDownloadSize: Selector<Promise<string>> = createSelector(
  getSanitizedProfileBlob,
  blobPromise => blobPromise.then(blob => prettyBytes(blob.size))
);
