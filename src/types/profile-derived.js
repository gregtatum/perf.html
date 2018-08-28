/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow
import type { Milliseconds } from './units';
import type {
  IndexIntoFuncTable,
  ThreadIndex,
  Pid,
  IndexIntoMarkersTable,
} from './profile';
import type { MarkerPayload } from './markers';

export type IndexIntoCallNodeTable = number;

/**
 * Contains a table of function call information that represents the stacks of what
 * functions were called, as opposed to stacks based on frames. There can be multiple
 * frames for a single function call. Using stacks as opposed to a computed tree of
 * CallNodes can cause duplicated functions in the call tree.
 *
 * For example:
 *
 *            stack1 (funcA)                             callNode1 (funcA)
 *                 |                                            |
 *                 v                                            v
 *            stack2 (funcB)         StackTable to       callNode2 (funcB)
 *                 |                 CallNodeTable              |
 *                 v                      ->                    v
 *            stack3 (funcC)                             callNode3 (funcC)
 *            /            \                                    |
 *           V              V                                   v
 *    stack4 (funcD)     stack5 (funcD)                  callNode4 (funcD)
 *         |                  |                          /               \
 *         v                  V                         V                 V
 *    stack6 (funcE)     stack7 (funcF)       callNode5 (funcE)     callNode6 (funcF)
 *
 * For a detailed explanation of callNodes see `docs-developer/call-tree.md` and
 * `docs-developer/call-nodes-in-cpp.md`.
 */
export type CallNodeTable = {
  prefix: Int32Array, // IndexIntoCallNodeTable -> IndexIntoCallNodeTable | -1
  func: Int32Array, // IndexIntoCallNodeTable -> IndexIntoFuncTable
  category: Int32Array, // IndexIntoCallNodeTable -> IndexIntoCategoryList
  depth: number[],
  length: number,
};

/**
 * Both the callNodeTable and a map that converts an IndexIntoStackTable
 * into an IndexIntoCallNodeTable.
 */
export type CallNodeInfo = {
  callNodeTable: CallNodeTable,
  // IndexIntoStackTable -> IndexIntoCallNodeTable
  stackIndexToCallNodeIndex: Uint32Array,
};

/**
 * When working with call trees, individual nodes in the tree are not stable across
 * different types of transformations and filtering operations. In order to refer
 * to some place in the call tree we use a list of functions that either go from
 * root to tip for normal call trees, or from tip to root for inverted call trees.
 * These paths are then stored along with the implementation filter, and the whether
 * or not the tree is inverted for a stable reference into a call tree.
 *
 * In some parts of the code the term prefix path is used to refer to a CallNodePath that
 * goes from root to tip, and the term postfix path is used to refer to a CallNodePath
 * that goes from tip to root.
 */
export type CallNodePath = IndexIntoFuncTable[];

export type CallNodeData = {
  funcName: string,
  totalTime: number,
  totalTimeRelative: number,
  selfTime: number,
  selfTimeRelative: number,
};

export type CallNodeDisplayData = $Exact<
  $ReadOnly<{
    totalTime: string,
    totalTimePercent: string,
    selfTime: string,
    name: string,
    lib: string,
    dim: boolean,
    categoryName: string,
    categoryColor: string,
    icon: string | null,
  }>
>;

export type IndexIntoMarkerTiming = number;

export type MarkerTiming = {
  // Start time in milliseconds.
  start: Milliseconds[],
  // End time in milliseconds.
  end: Milliseconds[],
  index: IndexIntoMarkersTable[],
  label: string[],
  name: string,
  length: number,
};
export type MarkerTimingRows = Array<MarkerTiming>;

export type StackType = 'js' | 'native' | 'unsymbolicated';

export type GlobalTrack =
  | {| +type: 'process', +pid: Pid, +mainThreadIndex: ThreadIndex | null |}
  | {| +type: 'screenshots' |};

export type LocalTrack =
  | {| +type: 'thread', +threadIndex: ThreadIndex |}
  | {| +type: 'network', +threadIndex: ThreadIndex |}
  | {| +type: 'memory', +threadIndex: ThreadIndex |};

export type Track = GlobalTrack | LocalTrack;
export type TrackIndex = number;

/**
 * Markers represent arbitrary events that happen within the browser. They have a
 * name, timing information, and potentially a JSON data payload. These can come from all
 * over the system. For instance Paint markers instrument the rendering and layout
 * process. Engineers can easily add arbitrary markers to their code without coordinating
 * with perf.html to instrument their code.
 *
 * The MarkersTable and MarkersTableByType represent the fully processed table of markers
 * where the start and end time markers have been joined together to correctly show
 * the duration and timing information for the event. Use this one, and not the
 * UnmatchedMarkerTable.
 */
export type MarkersTableByType<Payload> = {|
  // All markers have a start time, however if the value is 0 then the true start
  // time is unknown. This could happen with tracing markers that had an end marker
  // and no starting marker.
  startTime: Milliseconds[],
  // If a marker has a null endTime, then it does not have a duration. Additionally,
  // tracing markers that have a start marker, but no end marker will have their time
  // set to the end of the profile.
  endTime: Array<Milliseconds | null>,
  // There are three cases for markers with durations:
  // 1. Milliseconds - Markers have a duration because there is a start and end time.
  // 2. null - The marker represents a point in time, and has no duration.
  // 3. null - A tracing marker did not have a start or end marker, so the start and end
  //           time were artificially set, but we don't actually know the true duration.
  duration: Array<Milliseconds | null>,
  type: string[],
  name: string[],
  title: Array<string | null>,
  data: Payload[],
  length: number,
|};

export type MarkersTable = MarkersTableByType<MarkerPayload>;
