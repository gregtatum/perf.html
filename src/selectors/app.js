/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow
import { createSelector } from 'reselect';

import {
  getSelectedTab,
  getHiddenGlobalTracks,
  getHiddenLocalTracksByPid,
  getLocalTrackOrderByPid,
  getShowTabOnly,
  getGlobalTrackOrder,
} from './url-state';
import { getGlobalTracks, getLocalTracksByPid } from './profile';
import { assertExhaustiveCheck, ensureExists } from '../utils/flow';
import {
  TRACK_SCREENSHOT_HEIGHT,
  TRACK_NETWORK_HEIGHT,
  TRACK_MEMORY_HEIGHT,
  TRACK_IPC_HEIGHT,
  TRACK_PROCESS_BLANK_HEIGHT,
  TIMELINE_RULER_HEIGHT,
  TIMELINE_SETTINGS_HEIGHT,
  TRACK_VISUAL_PROGRESS_HEIGHT,
} from '../app-logic/constants';
import { getThreadSelectors } from './per-thread';

import type { TabSlug } from '../app-logic/tabs-handling';
import type { AppState, AppViewState, UrlSetupPhase } from '../types/state';
import type { Selector } from '../types/store';
import type { CssPixels } from '../types/units';
import type { ThreadIndex, Pid } from '../types/profile';
import type { TrackIndex } from '../types/profile-derived';

/**
 * Simple selectors into the app state.
 */
export const getApp: Selector<AppState> = state => state.app;
export const getView: Selector<AppViewState> = state => getApp(state).view;
export const getUrlSetupPhase: Selector<UrlSetupPhase> = state =>
  getApp(state).urlSetupPhase;
export const getHasZoomedViaMousewheel: Selector<boolean> = state => {
  return getApp(state).hasZoomedViaMousewheel;
};
export const getIsSidebarOpen: Selector<boolean> = state =>
  getApp(state).isSidebarOpenPerPanel[getSelectedTab(state)];
export const getPanelLayoutGeneration: Selector<number> = state =>
  getApp(state).panelLayoutGeneration;
export const getLastVisibleThreadTabSlug: Selector<TabSlug> = state =>
  getApp(state).lastVisibleThreadTabSlug;
export const getTrackThreadHeights: Selector<
  Array<ThreadIndex | void>
> = state => getApp(state).trackThreadHeights;
export const getIsNewlyPublished: Selector<boolean> = state =>
  getApp(state).isNewlyPublished;

export const getComputedHiddenGlobalTracks: Selector<
  Set<TrackIndex>
> = createSelector(
  // This is not ideal and we should avoid this. We had to do this because we
  // couldn't get the thread selectors here and had to pass the state there.
  // But there wasn't a better way with the current architecture. And since
  // other selectors are memoized, we are still good with this. And couldn't
  // find a dramatic performance impact.
  state => state,
  getGlobalTracks,
  getGlobalTrackOrder,
  getHiddenGlobalTracks,
  getShowTabOnly,
  (
    state,
    globalTracks,
    globalTrackIndexes,
    hiddenGlobalTracks,
    showTabOnly
  ) => {
    if (!showTabOnly) {
      // Return the usual hidden thread if we are not in the "single tab view" mode.
      return hiddenGlobalTracks;
    }

    const computedHiddenTracks = new Set(hiddenGlobalTracks);

    for (const trackIndex of globalTrackIndexes) {
      if (hiddenGlobalTracks.has(trackIndex)) {
        continue;
      }
      const globalTrack = globalTracks[trackIndex];
      const trackType = globalTrack.type;
      switch (trackType) {
        case 'screenshots':
        case 'visual-progress':
        case 'perceptual-visual-progress':
        case 'contentful-visual-progress':
          // Hide those global track types because we want to hide as much as
          // possible from web developers for now.
          computedHiddenTracks.add(trackIndex);
          break;
        case 'process': {
          // We don't want to display empty tracks if the tab filtered version is empty.
          if (
            globalTrack.mainThreadIndex !== undefined &&
            globalTrack.mainThreadIndex !== null
          ) {
            const threadSelectors = getThreadSelectors(
              globalTrack.mainThreadIndex
            );
            const tabFilteredThread = threadSelectors.getTabFilteredThread(
              state
            );

            let isStackEmpty = true;
            for (const stackIndex of tabFilteredThread.samples.stack) {
              if (stackIndex !== null) {
                // Samples are not empty, do not hide that thread.
                isStackEmpty = false;
                break;
              }
            }
            if (isStackEmpty === false) {
              continue;
            }

            const tabFilteredMarkers = threadSelectors.getTabFilteredMarkerIndexesWithoutGlobals(
              state
            );
            if (tabFilteredMarkers.length > 0) {
              continue;
            }
          }

          // Thread is empty and we should hide it.
          computedHiddenTracks.add(trackIndex);
          break;
        }
        default:
          throw assertExhaustiveCheck(trackType, `Unhandled GlobalTrack type.`);
      }
    }

    return computedHiddenTracks;
  }
);

export const getComputedHiddenLocalTracksByPid: Selector<
  Map<Pid, Set<TrackIndex>>
> = createSelector(
  // This is not ideal and we should avoid this. We had to do this because we
  // couldn't get the thread selectors here and had to pass the state there.
  // But there wasn't a better way with the current architecture. And since
  // other selectors are memoized, we are still good with this. And couldn't
  // find a dramatic performance impact.
  state => state,
  getLocalTracksByPid,
  getLocalTrackOrderByPid,
  getHiddenLocalTracksByPid,
  getShowTabOnly,
  (
    state,
    localTracksByPid,
    localTrackIndexesByPid,
    hiddenLocalTracksByPid,
    showTabOnly
  ) => {
    if (!showTabOnly) {
      // Return the usual hidden thread if we are not in the "single tab view" mode.
      return hiddenLocalTracksByPid;
    }

    // Deep copying the map and set.
    const computedHiddenTracks = new Map();
    for (const [pid, set] of hiddenLocalTracksByPid) {
      computedHiddenTracks.set(pid, new Set(set));
    }

    for (const [pid, trackSet] of localTrackIndexesByPid) {
      for (const trackIndex of trackSet) {
        if (
          ensureExists(
            hiddenLocalTracksByPid.get(pid),
            'Expected to find local tracks for the given pid'
          ).has(trackIndex)
        ) {
          continue;
        }

        const localTracksOfPid = ensureExists(
          localTracksByPid.get(pid),
          'Expected to find local tracks for the given pid'
        );
        const localTrack = localTracksOfPid[trackIndex];
        const trackType = localTrack.type;
        switch (trackType) {
          case 'network':
          case 'memory':
          case 'ipc': {
            // Hide those global track types because we want to hide as much as
            // possible from web developers for now.
            let set = computedHiddenTracks.get(pid);
            if (!set) {
              set = new Set();
              computedHiddenTracks.set(pid, set);
            }
            set.add(trackIndex);
            break;
          }
          case 'thread': {
            // We don't want to display empty tracks if the tab filtered version is empty.
            if (
              localTrack.threadIndex === undefined &&
              localTrack.threadIndex === null
            ) {
              const threadIndex = localTrack.threadIndex;
              const threadSelectors = getThreadSelectors(threadIndex);
              const tabFilteredThread = threadSelectors.getTabFilteredThread(
                state
              );

              let isStackEmpty = true;
              for (const stackIndex of tabFilteredThread.samples.stack) {
                if (stackIndex !== null) {
                  // Samples are not empty, do not hide that thread.
                  isStackEmpty = false;
                  break;
                }
              }
              if (isStackEmpty === false) {
                continue;
              }

              const tabFilteredMarkers = threadSelectors.getTabFilteredMarkerIndexesWithoutGlobals(
                state
              );
              if (tabFilteredMarkers.length > 0) {
                continue;
              }
            }

            // Thread is empty and we should hide it.
            let set = computedHiddenTracks.get(pid);
            if (!set) {
              set = new Set();
              computedHiddenTracks.set(pid, set);
            }
            set.add(trackIndex);
            break;
          }
          default:
            throw assertExhaustiveCheck(
              trackType,
              `Unhandled LocalTrack type.`
            );
        }
      }
    }

    return computedHiddenTracks;
  }
);

/**
 * This selector takes all of the tracks, and deduces the height in CssPixels
 * of the timeline. This is here to calculate the max-height of the timeline
 * for the splitter component.
 *
 * The height of the component is determined by the sizing of each track in the list.
 * Most sizes are pretty static, and are set through values in the component. The only
 * tricky value to determine is the thread track. These values get reported to the store
 * and get added in here.
 */
export const getTimelineHeight: Selector<null | CssPixels> = createSelector(
  getGlobalTracks,
  getLocalTracksByPid,
  getComputedHiddenGlobalTracks,
  getComputedHiddenLocalTracksByPid,
  getTrackThreadHeights,
  getShowTabOnly,
  (
    globalTracks,
    localTracksByPid,
    hiddenGlobalTracks,
    hiddenLocalTracksByPid,
    trackThreadHeights,
    showTabOnly
  ) => {
    let height = TIMELINE_RULER_HEIGHT + TIMELINE_SETTINGS_HEIGHT;
    const border = 1;

    for (const [trackIndex, globalTrack] of globalTracks.entries()) {
      if (!hiddenGlobalTracks.has(trackIndex)) {
        switch (globalTrack.type) {
          case 'screenshots':
            height += TRACK_SCREENSHOT_HEIGHT + border;
            break;
          case 'visual-progress':
          case 'perceptual-visual-progress':
          case 'contentful-visual-progress':
            height += TRACK_VISUAL_PROGRESS_HEIGHT;
            break;
          case 'process':
            {
              // The thread tracks have enough complexity that it warrants measuring
              // them rather than statically using a value like the other tracks.
              const { mainThreadIndex } = globalTrack;
              if (mainThreadIndex === null) {
                height += TRACK_PROCESS_BLANK_HEIGHT + border;
              } else {
                const trackThreadHeight = trackThreadHeights[mainThreadIndex];
                if (trackThreadHeight === undefined) {
                  // The height isn't computed yet, return.
                  return null;
                }
                height += trackThreadHeight + border;
              }
            }
            break;
          default:
            throw assertExhaustiveCheck(globalTrack);
        }
      }
    }

    // Figure out which PIDs are hidden.
    const hiddenPids = new Set();
    for (const trackIndex of hiddenGlobalTracks) {
      const globalTrack = globalTracks[trackIndex];
      if (globalTrack.type === 'process') {
        hiddenPids.add(globalTrack.pid);
      }
    }

    for (const [pid, localTracks] of localTracksByPid) {
      if (hiddenPids.has(pid)) {
        // This track is hidden already.
        continue;
      }
      for (const [trackIndex, localTrack] of localTracks.entries()) {
        const hiddenLocalTracks = ensureExists(
          hiddenLocalTracksByPid.get(pid),
          'Could not look up the hidden local tracks from the given PID'
        );
        if (!hiddenLocalTracks.has(trackIndex)) {
          switch (localTrack.type) {
            case 'thread':
              {
                // The thread tracks have enough complexity that it warrants measuring
                // them rather than statically using a value like the other tracks.
                const trackThreadHeight =
                  trackThreadHeights[localTrack.threadIndex];
                if (trackThreadHeight === undefined) {
                  // The height isn't computed yet, return.
                  return null;
                }
                height += trackThreadHeight + border;
              }

              break;
            case 'network':
              if (!showTabOnly) {
                height += TRACK_NETWORK_HEIGHT + border;
              }
              break;
            case 'memory':
              if (!showTabOnly) {
                height += TRACK_MEMORY_HEIGHT + border;
              }
              break;
            case 'ipc':
              if (!showTabOnly) {
                height += TRACK_IPC_HEIGHT + border;
              }
              break;
            default:
              throw assertExhaustiveCheck(localTrack);
          }
        }
      }
    }
    return height;
  }
);
