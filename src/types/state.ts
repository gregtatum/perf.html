import { $PropertyType } from "utility-types";

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */



import { Action, DataSource, PreviewSelection, ImplementationFilter, CallTreeSummaryStrategy, RequestedLib, TrackReference, TimelineType, CheckedSharingOptions } from "./actions";
import { TabSlug } from "../app-logic/tabs-handling";
import { StartEndRange } from "./units";
import { Profile, ThreadIndex, Pid, BrowsingContextID } from "./profile";

import { CallNodePath, GlobalTrack, LocalTrack, TrackIndex, MarkerIndex, ActiveTabGlobalTrack } from "./profile-derived";
import { Attempt } from "../utils/errors";
import { TransformStacksPerThread } from "./transforms";
import JSZip from "jszip";
import { IndexIntoZipFileTable } from "../profile-logic/zip-files";
import { PathSet } from "../utils/path";

export type Reducer<T> = (arg0: T | void, arg1: Action) => T;

export type SymbolicationStatus = "DONE" | "SYMBOLICATING";
export type ThreadViewOptions = {
  readonly selectedCallNodePath: CallNodePath;
  readonly expandedCallNodePaths: PathSet;
  readonly selectedMarker: MarkerIndex | null;
};

export type RightClickedCallNode = {
  readonly threadIndex: ThreadIndex;
  readonly callNodePath: CallNodePath;
};

export type RightClickedMarker = {
  readonly threadIndex: ThreadIndex;
  readonly markerIndex: MarkerIndex;
};

/**
 * Full profile view state
 * They should not be used from the active tab view.
 * NOTE: This state is empty for now, but will be used later, do not remove.
 * globalTracks and localTracksByPid states will be here in the future.
 */
export type FullProfileViewState = {
  globalTracks: GlobalTrack[];
  localTracksByPid: Map<Pid, LocalTrack[]>;
};

/**
 * Active tab profile view state
 * They should not be used from the full view.
 */
export type ActiveTabProfileViewState = {
  globalTracks: ActiveTabGlobalTrack[];
  // TODO: Add a better refined type for resource tracks.
  resourceTracks: LocalTrack[];
  hiddenGlobalTracksGetter: () => Set<TrackIndex>;
  hiddenLocalTracksByPidGetter: () => Map<Pid, Set<TrackIndex>>;
};

/**
 * Profile view state
 */
export type ProfileViewState = {
  readonly viewOptions: {
    perThread: ThreadViewOptions[];
    symbolicationStatus: SymbolicationStatus;
    waitingForLibs: Set<RequestedLib>;
    previewSelection: PreviewSelection;
    scrollToSelectionGeneration: number;
    focusCallTreeGeneration: number;
    rootRange: StartEndRange;
    rightClickedTrack: TrackReference | null;
    rightClickedCallNode: RightClickedCallNode | null;
    rightClickedMarker: RightClickedMarker | null;
  };
  readonly profile: Profile | null;
  readonly full: FullProfileViewState;
  readonly activeTab: ActiveTabProfileViewState;
};

export type AppViewState = {readonly phase: "ROUTE_NOT_FOUND";} | {readonly phase: "TRANSITIONING_FROM_STALE_PROFILE";} | {readonly phase: "PROFILE_LOADED";} | {readonly phase: "DATA_LOADED";} | {readonly phase: "DATA_RELOAD";} | {readonly phase: "FATAL_ERROR";readonly error: Error;} | {
  readonly phase: "INITIALIZING";
  readonly additionalData?: {readonly attempt: Attempt | null;readonly message: string;};
};

export type Phase = $PropertyType<AppViewState, "phase">;

/**
 * This represents the finite state machine for loading zip files. The phase represents
 * where the state is now.
 */
export type ZipFileState = {
  readonly phase: "NO_ZIP_FILE";
  readonly zip: null;
  readonly pathInZipFile: null;
} | {
  readonly phase: "LIST_FILES_IN_ZIP_FILE";
  readonly zip: JSZip;
  readonly pathInZipFile: null;
} | {
  readonly phase: "PROCESS_PROFILE_FROM_ZIP_FILE";
  readonly zip: JSZip;
  readonly pathInZipFile: string;
} | {
  readonly phase: "FAILED_TO_PROCESS_PROFILE_FROM_ZIP_FILE";
  readonly zip: JSZip;
  readonly pathInZipFile: string;
} | {
  readonly phase: "FILE_NOT_FOUND_IN_ZIP_FILE";
  readonly zip: JSZip;
  readonly pathInZipFile: string;
} | {
  readonly phase: "VIEW_PROFILE_IN_ZIP_FILE";
  readonly zip: JSZip;
  readonly pathInZipFile: string;
};

export type IsSidebarOpenPerPanelState = {
  [key: string]: boolean;
};

export type UrlSetupPhase = "initial-load" | "loading-profile" | "done";

export type AppState = {
  readonly view: AppViewState;
  readonly urlSetupPhase: UrlSetupPhase;
  readonly hasZoomedViaMousewheel: boolean;
  readonly isSidebarOpenPerPanel: IsSidebarOpenPerPanelState;
  readonly panelLayoutGeneration: number;
  readonly lastVisibleThreadTabSlug: TabSlug;
  readonly trackThreadHeights: Array<ThreadIndex | void>;
  readonly isNewlyPublished: boolean;
  readonly isDragAndDropDragging: boolean;
  readonly isDragAndDropOverlayRegistered: boolean;
};

export type UploadPhase = "local" | "compressing" | "uploading" | "uploaded" | "error";

export type UploadState = {
  phase: UploadPhase;
  uploadProgress: number;
  error: Error | unknown;
  abortFunction: () => void;
  generation: number;
};

export type PublishState = {
  readonly checkedSharingOptions: CheckedSharingOptions;
  readonly upload: UploadState;
  readonly isHidingStaleProfile: boolean;
  readonly hasSanitizedProfile: boolean;
  readonly prePublishedState: State | null;
};

export type ZippedProfilesState = {
  zipFile: ZipFileState;
  error: Error | null;
  selectedZipFileIndex: IndexIntoZipFileTable | null;
  // In practice this should never contain null, but needs to support the
  // TreeView interface.
  expandedZipFileIndexes: Array<IndexIntoZipFileTable | null>;
};

/**
 * Full profile specific url state
 * They should not be used from the active tab view.
 */
export type FullProfileSpecificUrlState = {
  globalTrackOrder: TrackIndex[];
  hiddenGlobalTracks: Set<TrackIndex>;
  hiddenLocalTracksByPid: Map<Pid, Set<TrackIndex>>;
  localTrackOrderByPid: Map<Pid, TrackIndex[]>;
  showJsTracerSummary: boolean;
  timelineType: TimelineType;
  legacyThreadOrder: ThreadIndex[] | null;
  legacyHiddenThreads: ThreadIndex[] | null;
};

/**
 * Active tab profile specific url state
 * They should not be used from the full view.
 * NOTE: This state is empty for now, but will be used later, do not remove.
 */
export type ActiveTabSpecificProfileUrlState = {};

export type ProfileSpecificUrlState = {
  selectedThread: ThreadIndex | null;
  implementation: ImplementationFilter;
  lastSelectedCallTreeSummaryStrategy: CallTreeSummaryStrategy;
  invertCallstack: boolean;
  showUserTimings: boolean;
  committedRanges: StartEndRange[];
  callTreeSearchString: string;
  markersSearchString: string;
  networkSearchString: string;
  transforms: TransformStacksPerThread;
  full: FullProfileSpecificUrlState;
  // NOTE: Currently commented out to fix the flow warnings, but will be used soon.
  // Do not remove.
  // activeTab: ActiveTabSpecificProfileUrlState,
};

export type UrlState = {
  readonly dataSource: DataSource;
  // This is used for the "public" dataSource".
  readonly hash: string;
  // This is used for the "from-url" dataSource.
  readonly profileUrl: string;
  // This is used for the "compare" dataSource, to compare 2 profiles.
  readonly profilesToCompare: string[] | null;
  readonly selectedTab: TabSlug;
  readonly pathInZipFile: string | null;
  readonly profileName: string;
  readonly showTabOnly: BrowsingContextID | null;
  readonly profileSpecific: ProfileSpecificUrlState;
};

export type IconState = Set<string>;

export type State = {
  readonly app: AppState;
  readonly profileView: ProfileViewState;
  readonly urlState: UrlState;
  readonly icons: IconState;
  readonly zippedProfiles: ZippedProfilesState;
  readonly publish: PublishState;
};

export type IconWithClassName = {
  readonly icon: string;
  readonly className: string;
};