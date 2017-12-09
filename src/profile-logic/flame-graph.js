/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow
import { getSampleCallNodes } from './profile-data';
import type { UnitIntervalOfProfileRange } from '../types/units';
import type { Thread } from '../types/profile';
import type {
  IndexIntoCallNodeTable,
  CallNodeInfo,
} from '../types/profile-derived';

import * as CallTree from './call-tree';

export type FlameGraphDepth = number;
export type IndexIntoFlameGraphTiming = number;

export type FlameGraphTiming = Array<{
  start: UnitIntervalOfProfileRange[],
  end: UnitIntervalOfProfileRange[],
  callNode: IndexIntoCallNodeTable[],
  length: number,
}>;

type Stack = Array<{
  depth: number,
  nodeIndex: IndexIntoCallNodeTable,
}>;

/**
 * Build a FlameGraphTiming table from a call tree.
 *
 * @param {CallTree} callTree - The call tree.
 * @return {array} flameGraphTiming
 */
export function getFlameGraphTiming(
  callTree: CallTree.CallTree
): FlameGraphTiming {
  const timing = [];
  // Array of call nodes to recursively process in the loop below.
  // Start with the roots of the call tree.
  const stack: Stack = callTree
    .getRoots()
    .map(nodeIndex => ({ nodeIndex, depth: 0 }));

  // Keep track of time offset by depth level.
  const timeOffset = [0.0];

  while (stack.length) {
    const { depth, nodeIndex } = stack.pop();
    const totalTime = callTree.getNodeData(nodeIndex).totalTimeRelative;

    // Select an existing row, or create a new one.
    let row = timing[depth];
    if (row === undefined) {
      row = {
        start: [],
        end: [],
        callNode: [],
        length: 0,
      };
      timing[depth] = row;
    }

    // Compute the timing information.
    row.start.push(timeOffset[depth]);
    row.end.push(timeOffset[depth] + totalTime);
    row.callNode.push(nodeIndex);
    row.length++;

    // Before we add the total time of this node to the time offset,
    // we'll make sure that the first child (if any) begins with the
    // same time offset.
    timeOffset[depth + 1] = timeOffset[depth];
    timeOffset[depth] += totalTime;

    let children = callTree.getChildren(nodeIndex);
    children.sort(
      (a, b) =>
        callTree.getNodeData(a).funcName < callTree.getNodeData(b).funcName
          ? 1
          : -1
    );
    children = children.map(nodeIndex => ({ nodeIndex, depth: depth + 1 }));

    stack.push(...children);
  }
  return timing;
}

/**
 * Compute maximum depth of call stack for a given thread.
 *
 * Returns the depth of the deepest call node, but with a one-based
 * depth instead of a zero-based.
 *
 * If no samples are found, 0 is returned.
 *
 * @param {object} thread
 * @param {object} callNodeInfo
 * @return {number} maxDepth
 */
export function computeCallNodeMaxDepth(
  thread: Thread,
  callNodeInfo: CallNodeInfo
): number {
  const { samples } = thread;
  const { callNodeTable, stackIndexToCallNodeIndex } = callNodeInfo;

  const sampleCallNodes = getSampleCallNodes(
    samples,
    stackIndexToCallNodeIndex
  );

  const depths = sampleCallNodes.map(
    i => (i === null ? 0 : callNodeTable.depth[i] + 1)
  );
  return Math.max(0, ...depths);
}
