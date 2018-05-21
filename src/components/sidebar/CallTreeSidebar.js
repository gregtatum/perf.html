/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow

import * as React from 'react';
import explicitConnect from '../../utils/connect';
import { selectedThreadSelectors } from '../../reducers/profile-view';
import { getFunctionName } from '../../profile-logic/function-info';

import type { ExplicitConnectOptions } from '../../utils/connect';
import type { CallTree } from '../../profile-logic/call-tree';
import type { Thread, IndexIntoStackTable } from '../../types/profile';
import type {
  IndexIntoCallNodeTable,
  CallNodeInfo,
  CallNodePath,
} from '../../types/profile-derived';

type StateProps = {|
  +callNodeInfo: CallNodeInfo,
  +tree: CallTree,
  +thread: Thread,
  +selectedNodeIndex: IndexIntoCallNodeTable | null,
  +selectedCallNodePath: CallNodePath,
|};

type SidebarDetailProps = {|
  +label: string,
  +children: React.Node,
|};

function SidebarDetail({ label, children }: SidebarDetailProps) {
  return (
    <React.Fragment>
      <div className="sidebar-label">{label}:</div>
      {children}
    </React.Fragment>
  );
}

class CallTreeSidebar extends React.PureComponent<StateProps> {
  renderJsStackInformation() {
    const {
      selectedNodeIndex,
      thread,
      callNodeInfo,
      selectedCallNodePath,
    } = this.props;
    if (selectedNodeIndex === null) {
      return null;
    }

    const funcIndex = callNodeInfo.callNodeTable.func[selectedNodeIndex];
    const isJs = thread.funcTable.isJS[funcIndex];
    if (!isJs) {
      return null;
    }

    /*
    const { funcTable, stackTable, frameTable } = thread;
    const funcIndex = callNodeInfo.callNodeTable.func[selectedNodeIndex];
    const isJs = funcTable.isJS[funcIndex];
    if (!isJs) {
      return null;
    }

    // Get all JS frames for a given CallNodePath
    const stackIndexToCallNodeDepth: Map<
      IndexIntoStackTable | null,
      number
    > = new Map();
    const stacksMatchingPath: Set<IndexIntoStackTable | null> = new Set();
    const tipCallNodeDepth = selectedCallNodePath.length - 1;
    stackIndexToCallNodeDepth.set(null, -1);
    stacksMatchingPath.add(null);
    const frameIndexes = [];
    for (let stackIndex = 0; stackIndex < stackTable.length; stackIndex++) {
      const prefixIndex = stackTable.prefix[stackIndex];
      if (!stacksMatchingPath.has(prefixIndex)) {
        continue;
      }
      const depth = stackIndexToCallNodeDepth.get(prefixIndex) + 1;
      const frameIndex = stackTable.frame[stackIndex];
      const funcIndex = frameTable.func[frameIndex];

      if (funcIndex === selectedCallNodePath[depth]) {
        if (depth === tipCallNodeDepth) {
          // This stack is at the tip of the path, remember the stack frame.
          frameIndexes.push(frameIndex);
        } else {
          // This stack is part of the path, but not at the tip.
          stacksMatchingPath.add(stackIndex);
        }
      }
    }
    */
    const frameType: Map<IndexIntoStackTable, string> = new Map();
    for (
      let stackIndex = 0;
      stackIndex < callNodeInfo.stackIndexToCallNodeIndex.length;
      stackIndex++
    ) {
      if (
        callNodeInfo.stackIndexToCallNodeIndex[stackIndex] === selectedNodeIndex
      ) {
        const frameIndex = thread.stackTable.frame[stackIndex];
        const stringIndex = thread.frameTable.implementation[frameIndex];
        const implementation =
          stringIndex === null
            ? 'interpreter'
            : thread.stringTable.getString(stringIndex);
        frameType.set(stackIndex, implementation);
      }
    }

    const sampleCount = {};
    for (
      let sampleIndex = 0;
      sampleIndex < thread.samples.length;
      sampleIndex++
    ) {
      const stackIndex = thread.samples.stack[sampleIndex];
      if (stackIndex === null) {
        continue;
      }
      const implementation = frameType.get(stackIndex);
      if (implementation) {
        sampleCount[implementation] = (sampleCount[implementation] || 0) + 1;
      }
    }

    return (
      <div className="sidebarJsStack">
        This is JS
        <div className="sidebarJsStackFrames">
          Frame indexes: {Object.entries(sampleCount).toString()}
        </div>
      </div>
    );
  }

  render() {
    const { tree, selectedNodeIndex } = this.props;
    if (selectedNodeIndex === null) {
      return (
        <div className="sidebar sidebar-calltree">
          Select a node to display some information about it.
        </div>
      );
    }

    const data = tree.getDisplayData(selectedNodeIndex);
    // `data.selfTime` is a string, containing either a number or, if the value
    // is 0, is '—'. So we we use isNaN on purpose (instead of Number.isNaN), to
    // force a conversion and decide whether we should add the unit or keep the
    // character '—'.
    // We don't compare against '—' to avoid hardcoded values. In the future we
    // should have a dedicated method in `tree` to recover the values we need in
    // the format we need.
    const selfTime = isNaN(data.selfTime)
      ? data.selfTime
      : data.selfTime + 'ms';
    return (
      <aside className="sidebar sidebar-calltree">
        <header className="sidebar-titlegroup">
          <h2 className="sidebar-title">{getFunctionName(data.name)}</h2>
          <p className="sidebar-subtitle">{data.lib}</p>
        </header>
        <div className="sidebar-details">
          <SidebarDetail label="Running Time">{data.totalTime}ms</SidebarDetail>
          <SidebarDetail label="Self Time">{selfTime}</SidebarDetail>
        </div>
        {this.renderJsStackInformation()}
      </aside>
    );
  }
}

const options: ExplicitConnectOptions<{||}, StateProps, {||}> = {
  mapStateToProps: state => ({
    thread: selectedThreadSelectors.getFilteredThread(state),
    callNodeInfo: selectedThreadSelectors.getCallNodeInfo(state),
    tree: selectedThreadSelectors.getCallTree(state),
    selectedNodeIndex: selectedThreadSelectors.getSelectedCallNodeIndex(state),
    selectedCallNodePath: selectedThreadSelectors.getSelectedCallNodePath(
      state
    ),
  }),
  component: CallTreeSidebar,
};
export default explicitConnect(options);
