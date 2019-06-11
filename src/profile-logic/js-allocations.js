/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow
import type {
  CategoryList,
  Thread,
  FuncTable,
  ResourceTable,
  IndexIntoFuncTable,
} from '../types/profile';
import type { JsAllocationPayload } from '../types/markers';
import type { MarkerIndex, Marker } from '../types/profile-derived';
import type {
  CallNodeTable,
  IndexIntoCallNodeTable,
  CallNodeInfo,
  CallNodeData,
  CallNodeDisplayData,
} from '../types/profile-derived';
import type { Milliseconds } from '../types/units';

/**
 * Compute the self times and leaf byte size of the JS allocations.
 */
function _getAllocationSelfSize(
  thread: Thread,
  callNodeTable: CallNodeTable,
  allocationCallNodes: Array<IndexIntoCallNodeTable | null>,
  allocations: JsAllocationPayload[]
) {
  const callNodeSelfSize = new Float32Array(callNodeTable.length);
  for (
    let markerIndex = 0;
    markerIndex < allocationCallNodes.length;
    markerIndex++
  ) {
    const callNodeIndex = allocationCallNodes[markerIndex];
    if (callNodeIndex !== null) {
      callNodeSelfSize[callNodeIndex] += allocations[markerIndex].size;
    }
  }

  return { callNodeSelfSize, callNodeLeafSize: callNodeSelfSize };
}

function _getInvertedAllocationSelfSize(
  thread: Thread,
  callNodeTable: CallNodeTable,
  allocationCallNodes: Array<IndexIntoCallNodeTable | null>,
  allocations: JsAllocationPayload[]
): {
  // In an inverted profile, all the self size is accounted to the root nodes.
  // So `callNodeSelfSize` will be 0 for all non-root nodes.
  callNodeSelfSize: Float32Array,
  // This property stores the time spent in the stacks' leaf nodes.
  // Later these values will make it possible to compute the running times for
  // all nodes by summing up the values up the tree.
  callNodeLeafSize: Float32Array,
} {
  // Compute an array that maps the callNodeIndex to its root.
  const callNodeToRoot = new Int32Array(callNodeTable.length);
  for (
    let callNodeIndex = 0;
    callNodeIndex < callNodeTable.length;
    callNodeIndex++
  ) {
    const prefixCallNode = callNodeTable.prefix[callNodeIndex];
    if (prefixCallNode === -1) {
      // callNodeIndex is a root node
      callNodeToRoot[callNodeIndex] = callNodeIndex;
    } else {
      // The callNodeTable guarantees that a callNode's prefix always comes
      // before the callNode; prefix references are always to lower callNode
      // indexes and never to higher indexes.
      // We are iterating the callNodeTable in forwards direction (starting at
      // index 0) so we know that we have already visited the current call
      // node's prefix call node and can reuse its stored root node, which
      // recursively is the value we're looking for.
      callNodeToRoot[callNodeIndex] = callNodeToRoot[prefixCallNode];
    }
  }

  // Calculate the timing information by going through each sample.
  const callNodeSelfSize = new Float32Array(callNodeTable.length);
  const callNodeLeafSize = new Float32Array(callNodeTable.length);
  for (
    let markerIndex = 0;
    markerIndex < allocationCallNodes.length;
    markerIndex++
  ) {
    const callNodeIndex = allocationCallNodes[markerIndex];
    if (callNodeIndex !== null) {
      const rootIndex = callNodeToRoot[callNodeIndex];
      const size = allocations[markerIndex].size;
      callNodeSelfSize[rootIndex] += size;
      callNodeLeafSize[callNodeIndex] += size;
    }
  }

  return { callNodeSelfSize, callNodeLeafSize };
}

export function computeJsAllocationCallTreeCountsAndTimings(
  getMarker: MarkerIndex => Marker,
  thread: Thread,
  { callNodeTable, stackIndexToCallNodeIndex }: CallNodeInfo,
  invertCallstack: boolean,
  markerIndexes: MarkerIndex[]
) {
  const allocations: JsAllocationPayload[] = (markerIndexes.map(index =>
    getMarker(index)
  ): any[]);
  const allocationCallNodes = allocations.map(marker =>
    typeof marker.cause === 'number'
      ? stackIndexToCallNodeIndex[marker.cause]
      : null
  );

  // Inverted trees need a different method for computing the timing.
  const { callNodeSelfSize, callNodeLeafSize } = invertCallstack
    ? _getInvertedAllocationSelfSize(
        thread,
        callNodeTable,
        allocationCallNodes,
        allocations
      )
    : _getAllocationSelfSize(
        thread,
        callNodeTable,
        allocationCallNodes,
        allocations
      );
  // Compute the following variables:
  const callNodeTotalSize = new Float32Array(callNodeTable.length);
  const callNodeChildCount = new Uint32Array(callNodeTable.length);
  let rootTotalTime = 0;
  let rootCount = 0;

  // We loop the call node table in reverse, so that we find the children
  // before their parents.
  for (
    let callNodeIndex = callNodeTable.length - 1;
    callNodeIndex >= 0;
    callNodeIndex--
  ) {
    callNodeTotalSize[callNodeIndex] += callNodeLeafSize[callNodeIndex];
    if (callNodeTotalSize[callNodeIndex] === 0) {
      continue;
    }
    const prefixCallNode = callNodeTable.prefix[callNodeIndex];
    if (prefixCallNode === -1) {
      rootTotalTime += callNodeTotalSize[callNodeIndex];
      rootCount++;
    } else {
      callNodeTotalSize[prefixCallNode] += callNodeTotalSize[callNodeIndex];
      callNodeChildCount[prefixCallNode]++;
    }
  }

  return {
    callNodeSizes: {
      selfSize: callNodeSelfSize,
      totalSize: callNodeTotalSize,
    },
    callNodeChildCount,
    rootTotalTime,
    rootCount,
  };
}

export class JsAllocationTree {
  _categories: CategoryList;
  _callNodeTable: CallNodeTable;
  _callNodeTimes: CallNodeTimes;
  _callNodeChildCount: Uint32Array; // A table column matching the callNodeTable
  _funcTable: FuncTable;
  _resourceTable: ResourceTable;
  _stringTable: UniqueStringArray;
  _rootTotalTime: number;
  _rootCount: number;
  _displayDataByIndex: Map<IndexIntoCallNodeTable, CallNodeDisplayData>;
  // _children is indexed by IndexIntoCallNodeTable. Since they are
  // integers, using an array directly is faster than going through a Map.
  _children: Array<CallNodeChildren>;
  _jsOnly: boolean;
  _isIntegerInterval: boolean;

  constructor(
    { funcTable, resourceTable, stringTable }: Thread,
    categories: CategoryList,
    callNodeTable: CallNodeTable,
    callNodeTimes: CallNodeTimes,
    callNodeChildCount: Uint32Array,
    rootTotalTime: number,
    rootCount: number,
    jsOnly: boolean,
    isIntegerInterval: boolean
  ) {
    this._categories = categories;
    this._callNodeTable = callNodeTable;
    this._callNodeTimes = callNodeTimes;
    this._callNodeChildCount = callNodeChildCount;
    this._funcTable = funcTable;
    this._resourceTable = resourceTable;
    this._stringTable = stringTable;
    this._rootTotalTime = rootTotalTime;
    this._rootCount = rootCount;
    this._displayDataByIndex = new Map();
    this._children = [];
    this._jsOnly = jsOnly;
    this._isIntegerInterval = isIntegerInterval;
  }

  getRoots() {
    return this.getChildren(-1);
  }

  getChildren(callNodeIndex: IndexIntoCallNodeTable): CallNodeChildren {
    let children = this._children[callNodeIndex];
    if (children === undefined) {
      const childCount =
        callNodeIndex === -1
          ? this._rootCount
          : this._callNodeChildCount[callNodeIndex];
      children = [];
      for (
        let childCallNodeIndex = callNodeIndex + 1;
        childCallNodeIndex < this._callNodeTable.length &&
        children.length < childCount;
        childCallNodeIndex++
      ) {
        if (
          this._callNodeTable.prefix[childCallNodeIndex] === callNodeIndex &&
          this._callNodeTimes.totalTime[childCallNodeIndex] !== 0
        ) {
          children.push(childCallNodeIndex);
        }
      }
      children.sort(
        (a, b) =>
          this._callNodeTimes.totalTime[b] - this._callNodeTimes.totalTime[a]
      );
      this._children[callNodeIndex] = children;
    }
    return children;
  }

  hasChildren(callNodeIndex: IndexIntoCallNodeTable): boolean {
    return this.getChildren(callNodeIndex).length !== 0;
  }

  _addDescendantsToSet(
    callNodeIndex: IndexIntoCallNodeTable,
    set: Set<IndexIntoCallNodeTable>
  ): void {
    for (const child of this.getChildren(callNodeIndex)) {
      set.add(child);
      this._addDescendantsToSet(child, set);
    }
  }

  getAllDescendants(
    callNodeIndex: IndexIntoCallNodeTable
  ): Set<IndexIntoCallNodeTable> {
    const result = new Set();
    this._addDescendantsToSet(callNodeIndex, result);
    return result;
  }

  getParent(
    callNodeIndex: IndexIntoCallNodeTable
  ): IndexIntoCallNodeTable | -1 {
    return this._callNodeTable.prefix[callNodeIndex];
  }

  getDepth(callNodeIndex: IndexIntoCallNodeTable): number {
    return this._callNodeTable.depth[callNodeIndex];
  }

  hasSameNodeIds(tree: CallTree): boolean {
    return this._callNodeTable === tree._callNodeTable;
  }

  getNodeData(callNodeIndex: IndexIntoCallNodeTable): CallNodeData {
    const funcIndex = this._callNodeTable.func[callNodeIndex];
    const funcName = this._stringTable.getString(
      this._funcTable.name[funcIndex]
    );
    const totalTime = this._callNodeTimes.totalTime[callNodeIndex];
    const totalTimeRelative = totalTime / this._rootTotalTime;
    const selfTime = this._callNodeTimes.selfTime[callNodeIndex];
    const selfTimeRelative = selfTime / this._rootTotalTime;

    return {
      funcName,
      totalTime,
      totalTimeRelative,
      selfTime,
      selfTimeRelative,
    };
  }

  getDisplayData(callNodeIndex: IndexIntoCallNodeTable): CallNodeDisplayData {
    let displayData = this._displayDataByIndex.get(callNodeIndex);
    if (displayData === undefined) {
      const {
        funcName,
        totalTime,
        totalTimeRelative,
        selfTime,
      } = this.getNodeData(callNodeIndex);
      const funcIndex = this._callNodeTable.func[callNodeIndex];
      const categoryIndex = this._callNodeTable.category[callNodeIndex];
      const resourceIndex = this._funcTable.resource[funcIndex];
      const resourceType = this._resourceTable.type[resourceIndex];
      const isJS = this._funcTable.isJS[funcIndex];
      const libName = this._getOriginAnnotation(funcIndex);

      let icon = null;
      if (resourceType === resourceTypes.webhost) {
        icon = extractFaviconFromLibname(libName);
      } else if (resourceType === resourceTypes.addon) {
        icon = ExtensionIcon;
      }

      const formattedTotalTime = formatNumberDependingOnInterval(
        this._isIntegerInterval,
        totalTime
      );
      const formattedSelfTime = formatNumberDependingOnInterval(
        this._isIntegerInterval,
        selfTime
      );

      displayData = {
        totalTime: formattedTotalTime,
        totalTimeWithUnit: formattedTotalTime + 'ms',
        selfTime: selfTime === 0 ? '—' : formattedSelfTime,
        selfTimeWithUnit: selfTime === 0 ? '—' : formattedSelfTime + 'ms',
        totalTimePercent: `${formatPercent(totalTimeRelative)}`,
        name: funcName,
        lib: libName.slice(0, 1000),
        // Dim platform pseudo-stacks.
        dim: !isJS && this._jsOnly,
        categoryName: this._categories[categoryIndex].name,
        categoryColor: this._categories[categoryIndex].color,
        icon,
      };
      this._displayDataByIndex.set(callNodeIndex, displayData);
    }
    return displayData;
  }

  _getOriginAnnotation(funcIndex: IndexIntoFuncTable): string {
    return getOriginAnnotationForFunc(
      funcIndex,
      this._funcTable,
      this._resourceTable,
      this._stringTable
    );
  }
}
