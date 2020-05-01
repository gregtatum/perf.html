import { $Keys, $Shape } from "utility-types";

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */


import { CallTree } from "../profile-logic/call-tree";
import JSZip from "jszip";
import { Profile, Thread, ThreadIndex, IndexIntoFuncTable, Pid, BrowsingContextID } from "./profile";
import { CallNodePath, CallNodeTable, GlobalTrack, LocalTrack, TrackIndex, MarkerIndex, ActiveTabGlobalTrack } from "./profile-derived";
import { TemporaryError } from "../utils/errors";
import { Transform, TransformStacksPerThread } from "./transforms";
import { IndexIntoZipFileTable } from "../profile-logic/zip-files";
import { TabSlug } from "../app-logic/tabs-handling";
import { UrlState, UploadState, State } from "../types/state";
import { CssPixels, StartEndRange } from "../types/units";

export type DataSource = "none" | "from-file" | "from-addon" | "local" | "public" | "from-url" | "compare";
export type TimelineType = "stack" | "category";
export type PreviewSelection = {readonly hasSelection: false;readonly isModifying: false;} | {
  readonly hasSelection: true;
  readonly isModifying: boolean;
  readonly selectionStart: number;
  readonly selectionEnd: number;
};
export type FuncToFuncMap = Map<IndexIntoFuncTable, IndexIntoFuncTable>;
export type FunctionsUpdatePerThread = {
  [key: number]: {
    oldFuncToNewFuncMap: FuncToFuncMap;
    funcIndices: IndexIntoFuncTable[];
    funcNames: string[];
  };
};

/**
 * The counts for how many tracks are hidden in the timeline.
 */
export type HiddenTrackCount = {
  readonly hidden: number;
  readonly total: number;
};

/**
 * A TrackReference uniquely identifies a track.
 * Note that TrackIndexes aren't globally unique: they're unique among global
 * tracks, and they're unique among local tracks for a specific Pid.
 */
export type GlobalTrackReference = {
  readonly type: "global";
  readonly trackIndex: TrackIndex;
};
export type LocalTrackReference = {
  readonly type: "local";
  readonly trackIndex: TrackIndex;
  readonly pid: Pid;
};

export type TrackReference = GlobalTrackReference | LocalTrackReference;

export type RequestedLib = {
  readonly debugName: string;
  readonly breakpadId: string;
};
export type ImplementationFilter = "combined" | "js" | "cpp";
// Change the strategy for computing the summarizing information for the call tree.
export type CallTreeSummaryStrategy = "timing" | "js-allocations" | "native-retained-allocations" | "native-allocations" | "native-deallocations-memory" | "native-deallocations-sites";

/**
 * This type determines what kind of information gets sanitized from published profiles.
 */
export type CheckedSharingOptions = {
  // The following values are for including more information in a sanitized profile.
  includeHiddenThreads: boolean;
  includeFullTimeRange: boolean;
  includeScreenshots: boolean;
  includeUrls: boolean;
  includeExtension: boolean;
  includePreferenceValues: boolean;
};

type ProfileAction = {
  readonly type: "ROUTE_NOT_FOUND";
  readonly url: string;
} | {
  readonly type: "ASSIGN_TASK_TRACER_NAMES";
  readonly addressIndices: number[];
  readonly symbolNames: string[];
} | {
  readonly type: "CHANGE_SELECTED_CALL_NODE";
  readonly threadIndex: ThreadIndex;
  readonly selectedCallNodePath: CallNodePath;
  readonly optionalExpandedToCallNodePath: CallNodePath | null | undefined;
} | {
  readonly type: "UPDATE_TRACK_THREAD_HEIGHT";
  readonly height: CssPixels;
  readonly threadIndex: ThreadIndex;
} | {
  readonly type: "CHANGE_RIGHT_CLICKED_CALL_NODE";
  readonly threadIndex: ThreadIndex;
  readonly callNodePath: CallNodePath | null;
} | {
  readonly type: "FOCUS_CALL_TREE";
} | {
  readonly type: "CHANGE_EXPANDED_CALL_NODES";
  readonly threadIndex: ThreadIndex;
  readonly expandedCallNodePaths: Array<CallNodePath>;
} | {
  readonly type: "CHANGE_SELECTED_MARKER";
  readonly threadIndex: ThreadIndex;
  readonly selectedMarker: MarkerIndex | null;
} | {
  readonly type: "CHANGE_RIGHT_CLICKED_MARKER";
  readonly threadIndex: ThreadIndex;
  readonly markerIndex: MarkerIndex | null;
} | {
  readonly type: "UPDATE_PREVIEW_SELECTION";
  readonly previewSelection: PreviewSelection;
} | {
  readonly type: "CHANGE_SELECTED_ZIP_FILE";
  readonly selectedZipFileIndex: IndexIntoZipFileTable | null;
} | {
  readonly type: "CHANGE_EXPANDED_ZIP_FILES";
  readonly expandedZipFileIndexes: Array<IndexIntoZipFileTable | null>;
} | {
  readonly type: "CHANGE_GLOBAL_TRACK_ORDER";
  readonly globalTrackOrder: TrackIndex[];
} | {
  readonly type: "HIDE_GLOBAL_TRACK";
  readonly trackIndex: TrackIndex;
  readonly selectedThreadIndex: ThreadIndex;
} | {
  readonly type: "SHOW_GLOBAL_TRACK";
  readonly trackIndex: TrackIndex;
} | {
  // Isolate only the process track, and not the local tracks.
  readonly type: "ISOLATE_PROCESS";
  readonly hiddenGlobalTracks: Set<TrackIndex>;
  readonly isolatedTrackIndex: TrackIndex;
  readonly selectedThreadIndex: ThreadIndex;
} | {
  // Isolate the process track, and hide the local tracks.
  type: "ISOLATE_PROCESS_MAIN_THREAD";
  pid: Pid;
  hiddenGlobalTracks: Set<TrackIndex>;
  isolatedTrackIndex: TrackIndex;
  selectedThreadIndex: ThreadIndex;
  hiddenLocalTracks: Set<TrackIndex>;
} | {
  // Isolate only the screenshot track
  readonly type: "ISOLATE_SCREENSHOT_TRACK";
  readonly hiddenGlobalTracks: Set<TrackIndex>;
} | {
  readonly type: "CHANGE_LOCAL_TRACK_ORDER";
  readonly localTrackOrder: TrackIndex[];
  readonly pid: Pid;
} | {
  readonly type: "HIDE_LOCAL_TRACK";
  readonly pid: Pid;
  readonly trackIndex: TrackIndex;
  readonly selectedThreadIndex: ThreadIndex;
} | {
  readonly type: "SHOW_LOCAL_TRACK";
  readonly pid: Pid;
  readonly trackIndex: TrackIndex;
} | {
  readonly type: "ISOLATE_LOCAL_TRACK";
  readonly pid: Pid;
  readonly hiddenGlobalTracks: Set<TrackIndex>;
  readonly hiddenLocalTracks: Set<TrackIndex>;
  readonly selectedThreadIndex: ThreadIndex;
} | {
  readonly type: "SET_CONTEXT_MENU_VISIBILITY";
  readonly isVisible: boolean;
} | {
  readonly type: "INCREMENT_PANEL_LAYOUT_GENERATION";
} | {readonly type: "HAS_ZOOMED_VIA_MOUSEWHEEL";} | {readonly type: "DISMISS_NEWLY_PUBLISHED";};

type ReceiveProfileAction = {
  readonly type: "COALESCED_FUNCTIONS_UPDATE";
  readonly functionsUpdatePerThread: FunctionsUpdatePerThread;
} | {
  readonly type: "DONE_SYMBOLICATING";
} | {
  readonly type: "TEMPORARY_ERROR";
  readonly error: TemporaryError;
} | {
  readonly type: "FATAL_ERROR";
  readonly error: Error;
} | {
  readonly type: "PROFILE_LOADED";
  readonly profile: Profile;
  readonly pathInZipFile: string | null | undefined;
  readonly implementationFilter: ImplementationFilter | null | undefined;
  readonly transformStacks: TransformStacksPerThread | null | undefined;
} | {
  readonly type: "VIEW_FULL_PROFILE";
  readonly selectedThreadIndex: ThreadIndex;
  readonly globalTracks: GlobalTrack[];
  readonly globalTrackOrder: TrackIndex[];
  readonly hiddenGlobalTracks: Set<TrackIndex>;
  readonly localTracksByPid: Map<Pid, LocalTrack[]>;
  readonly hiddenLocalTracksByPid: Map<Pid, Set<TrackIndex>>;
  readonly localTrackOrderByPid: Map<Pid, TrackIndex[]>;
  readonly showTabOnly?: BrowsingContextID | null;
} | {
  readonly type: "VIEW_ACTIVE_TAB_PROFILE";
  readonly selectedThreadIndex: ThreadIndex;
  readonly globalTracks: ActiveTabGlobalTrack[];
  readonly resourceTracks: LocalTrack[];
  readonly showTabOnly?: BrowsingContextID | null;
} | {
  readonly type: "DATA_RELOAD";
} | {readonly type: "RECEIVE_ZIP_FILE";readonly zip: JSZip;} | {readonly type: "PROCESS_PROFILE_FROM_ZIP_FILE";readonly pathInZipFile: string;} | {readonly type: "FAILED_TO_PROCESS_PROFILE_FROM_ZIP_FILE";readonly error: any;} | {readonly type: "DISMISS_PROCESS_PROFILE_FROM_ZIP_ERROR";} | {readonly type: "RETURN_TO_ZIP_FILE_LIST";} | {readonly type: "FILE_NOT_FOUND_IN_ZIP_FILE";readonly pathInZipFile: string;} | {readonly type: "REQUESTING_SYMBOL_TABLE";readonly requestedLib: RequestedLib;} | {readonly type: "RECEIVED_SYMBOL_TABLE_REPLY";readonly requestedLib: RequestedLib;} | {readonly type: "START_SYMBOLICATING";} | {readonly type: "WAITING_FOR_PROFILE_FROM_ADDON";} | {readonly type: "WAITING_FOR_PROFILE_FROM_STORE";} | {readonly type: "WAITING_FOR_PROFILE_FROM_URL";readonly profileUrl: string | null | undefined;} | {readonly type: "TRIGGER_LOADING_FROM_URL";readonly profileUrl: string;};

type UrlEnhancerAction = {readonly type: "START_FETCHING_PROFILES";} | {readonly type: "URL_SETUP_DONE";} | {readonly type: "UPDATE_URL_STATE";readonly newUrlState: UrlState | null;};

type UrlStateAction = {readonly type: "WAITING_FOR_PROFILE_FROM_FILE";} | {
  readonly type: "PROFILE_PUBLISHED";
  readonly hash: string;
  readonly prePublishedState: State | null;
} | {readonly type: "CHANGE_SELECTED_TAB";readonly selectedTab: TabSlug;} | {readonly type: "COMMIT_RANGE";readonly start: number;readonly end: number;} | {readonly type: "POP_COMMITTED_RANGES";readonly firstPoppedFilterIndex: number;} | {readonly type: "CHANGE_SELECTED_THREAD";readonly selectedThreadIndex: ThreadIndex;} | {
  readonly type: "SELECT_TRACK";
  readonly selectedThreadIndex: ThreadIndex;
  readonly selectedTab: TabSlug;
} | {
  readonly type: "CHANGE_RIGHT_CLICKED_TRACK";
  readonly trackReference: TrackReference | null;
} | {readonly type: "CHANGE_CALL_TREE_SEARCH_STRING";readonly searchString: string;} | {
  readonly type: "ADD_TRANSFORM_TO_STACK";
  readonly threadIndex: ThreadIndex;
  readonly transform: Transform;
  readonly transformedThread: Thread;
} | {
  readonly type: "POP_TRANSFORMS_FROM_STACK";
  readonly threadIndex: ThreadIndex;
  readonly firstPoppedFilterIndex: number;
} | {
  readonly type: "CHANGE_TIMELINE_TYPE";
  readonly timelineType: TimelineType;
} | {
  readonly type: "CHANGE_IMPLEMENTATION_FILTER";
  readonly implementation: ImplementationFilter;
  readonly threadIndex: ThreadIndex;
  readonly transformedThread: Thread;
  readonly previousImplementation: ImplementationFilter;
  readonly implementation: ImplementationFilter;
} | {
  type: "CHANGE_CALL_TREE_SUMMARY_STRATEGY";
  callTreeSummaryStrategy: CallTreeSummaryStrategy;
} | {
  readonly type: "CHANGE_INVERT_CALLSTACK";
  readonly invertCallstack: boolean;
  readonly callTree: CallTree;
  readonly callNodeTable: CallNodeTable;
  readonly selectedThreadIndex: ThreadIndex;
} | {
  readonly type: "CHANGE_SHOW_USER_TIMINGS";
  readonly showUserTimings: boolean;
} | {
  readonly type: "CHANGE_SHOW_JS_TRACER_SUMMARY";
  readonly showSummary: boolean;
} | {readonly type: "CHANGE_MARKER_SEARCH_STRING";readonly searchString: string;} | {readonly type: "CHANGE_NETWORK_SEARCH_STRING";readonly searchString: string;} | {readonly type: "CHANGE_PROFILES_TO_COMPARE";readonly profiles: string[];} | {readonly type: "CHANGE_PROFILE_NAME";readonly profileName: string;} | {
  readonly type: "SANITIZED_PROFILE_PUBLISHED";
  readonly hash: string;
  readonly committedRanges: StartEndRange[] | null;
  readonly oldThreadIndexToNew: Map<ThreadIndex, ThreadIndex> | null;
  readonly prePublishedState: State;
} | {
  readonly type: "SET_DATA_SOURCE";
  readonly dataSource: DataSource;
};

type IconsAction = {readonly type: "ICON_HAS_LOADED";readonly icon: string;} | {readonly type: "ICON_IN_ERROR";readonly icon: string;};

type SidebarAction = {
  readonly type: "CHANGE_SIDEBAR_OPEN_STATE";
  readonly tab: TabSlug;
  readonly isOpen: boolean;
};

type PublishAction = {
  readonly type: "TOGGLE_CHECKED_SHARING_OPTION";
  readonly slug: $Keys<CheckedSharingOptions>;
} | {
  readonly type: "UPLOAD_STARTED";
  readonly abortFunction: () => void;
} | {
  readonly type: "UPDATE_UPLOAD_PROGRESS";
  readonly uploadProgress: number;
} | {
  readonly type: "UPLOAD_FAILED";
  readonly error: unknown;
} | {
  readonly type: "UPLOAD_ABORTED";
} | {
  readonly type: "UPLOAD_RESET";
} | {
  readonly type: "UPLOAD_COMPRESSION_STARTED";
} | {
  readonly type: "CHANGE_UPLOAD_STATE";
  readonly changes: $Shape<UploadState>;
} | {
  readonly type: "REVERT_TO_PRE_PUBLISHED_STATE";
  readonly prePublishedState: State;
} | {readonly type: "HIDE_STALE_PROFILE";};

type DragAndDropAction = {
  readonly type: "START_DRAGGING";
} | {
  readonly type: "STOP_DRAGGING";
} | {
  readonly type: "REGISTER_DRAG_AND_DROP_OVERLAY";
} | {
  readonly type: "UNREGISTER_DRAG_AND_DROP_OVERLAY";
};

export type Action = ProfileAction | ReceiveProfileAction | SidebarAction | UrlEnhancerAction | UrlStateAction | IconsAction | PublishAction | DragAndDropAction;