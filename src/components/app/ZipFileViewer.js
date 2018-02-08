/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow
import React, { PureComponent } from 'react';
import explicitConnect, {
  type ExplicitConnectOptions,
  type ConnectedProps,
} from '../../utils/connect';
import './ZipFileViewer.css';
import {
  changeSelectedZipFile,
  changeExpandedZipFile,
} from '../../actions/app';
import {
  getZipFileTree,
  getZipFileMaxDepth,
  getSelectedZipFileIndex,
  getExpandedZipFileIndexes,
} from '../../reducers/app';
import type {
  ZipFileTree,
  IndexIntoZipFileTable,
} from '../../profile-logic/zip-files';

import TreeView from '../shared/TreeView';

type StateProps = {|
  zipFileTree: ZipFileTree | null,
  zipFileMaxDepth: number,
  selectedZipFileIndex: IndexIntoZipFileTable | null,
  // In practice this should never contain null, but needs to support the
  // TreeView interface.
  expandedZipFileIndexes: Array<IndexIntoZipFileTable | null>,
|};
type DispatchProps = {|
  changeSelectedZipFile: typeof changeSelectedZipFile,
  changeExpandedZipFile: typeof changeExpandedZipFile,
|};
type OwnProps = {||};

type Props = ConnectedProps<OwnProps, StateProps, DispatchProps>;

type ZipDisplayData = {|
  name: string,
|};

class ZipFileViewer extends PureComponent<Props> {
  _fixedColumns = [];
  _mainColumn = { propName: 'name', title: '' };

  _expandedNodeIds: Array<IndexIntoZipFileTable | null> = [];
  _treeView: ?TreeView<IndexIntoZipFileTable, ZipDisplayData>;
  _takeTreeViewRef = treeView => (this._treeView = treeView);

  componentDidMount() {
    this.focus();
  }

  focus() {
    const treeView = this._treeView;
    if (treeView) {
      treeView.focus();
    }
  }

  _onExpandedCallNodesChange(
    newExpandedZipFileIndexes: Array<IndexIntoZipFileTable | null>
  ) {
    console.log(newExpandedZipFileIndexes);
  }

  _onSelectionChange = (selectedFile: IndexIntoZipFileTable) => {
    // TODO
    console.log('selectedFile', selectedFile);
  };

  render() {
    const {
      zipFileTree,
      zipFileMaxDepth,
      selectedZipFileIndex,
      expandedZipFileIndexes,
      changeSelectedZipFile,
      changeExpandedZipFile,
    } = this.props;

    if (!zipFileTree) {
      return null;
    }

    return (
      <section className="zipFileViewer">
        <div className="zipFileViewerSection">
          <header className="zipFileViewerHeader">
            <h1>perf.html</h1>
            <p>Choose a profile from this zip file</p>
          </header>
          <TreeView
            maxNodeDepth={zipFileMaxDepth}
            tree={zipFileTree}
            fixedColumns={this._fixedColumns}
            mainColumn={this._mainColumn}
            onSelectionChange={changeSelectedZipFile}
            onExpandedNodesChange={changeExpandedZipFile}
            selectedNodeId={selectedZipFileIndex}
            expandedNodeIds={expandedZipFileIndexes}
            ref={this._takeTreeViewRef}
            contextMenuId={'MarkersContextMenu'}
          />
        </div>
      </section>
    );
  }
}

const options: ExplicitConnectOptions<OwnProps, StateProps, DispatchProps> = {
  mapStateToProps: state => ({
    zipFileTree: getZipFileTree(state),
    zipFileMaxDepth: getZipFileMaxDepth(state),
    selectedZipFileIndex: getSelectedZipFileIndex(state),
    expandedZipFileIndexes: getExpandedZipFileIndexes(state),
  }),
  mapDispatchToProps: { changeSelectedZipFile, changeExpandedZipFile },
  component: ZipFileViewer,
};

export default explicitConnect(options);
