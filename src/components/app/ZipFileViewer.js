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
  getZipFileTable,
  getZipFileMaxDepth,
  getSelectedZipFileIndex,
  getExpandedZipFileIndexes,
  type ZipFileTable,
  type IndexIntoZipFileTable,
} from '../../reducers/app';
import TreeView from '../shared/TreeView';
// import type { ZipEntries } from 'jszip';

type StateProps = {|
  zipFileTable: ZipFileTable | null,
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

class ZipFileTree {
  _zipFileTable: ZipFileTable;
  _displayDataByIndex: Map<IndexIntoZipFileTable, ZipDisplayData>;

  constructor(zipFileTable: ZipFileTable) {
    this._zipFileTable = zipFileTable;
    this._displayDataByIndex = new Map();
  }

  getRoots(): IndexIntoZipFileTable[] {
    const indexes = [];
    for (let index = 0; index < this._zipFileTable.length; index++) {
      if (this._zipFileTable.prefix[index] === null) {
        indexes.push(index);
      }
    }
    return indexes;
  }

  getChildren(zipTableIndex: IndexIntoZipFileTable): IndexIntoZipFileTable[] {
    return zipTableIndex === -1 ? this.getRoots() : [];
  }

  hasChildren(zipTableIndex: IndexIntoZipFileTable): boolean {
    return this._zipFileTable.file[zipTableIndex] !== null;
  }

  getAllDescendants(
    zipTableIndex: IndexIntoZipFileTable
  ): Set<IndexIntoZipFileTable> {
    const result = new Set([]);
    for (const child of this.getChildren(zipTableIndex)) {
      result.add(child);
      for (const descendant of this.getAllDescendants(child)) {
        result.add(descendant);
      }
    }
    return result;
  }

  getParent(zipTableIndex: IndexIntoZipFileTable): IndexIntoZipFileTable {
    // This returns -1 to support the CallTree interface.
    return this._zipFileTable.prefix[zipTableIndex] || -1;
  }

  getDepth(zipTableIndex: IndexIntoZipFileTable): number {
    return this._zipFileTable.depth[zipTableIndex];
  }

  hasSameNodeIds(tree: ZipFileTree) {
    return this._zipFileTable === tree._zipFileTable;
  }

  getDisplayData(zipTableIndex: IndexIntoZipFileTable): ZipDisplayData {
    let displayData = this._displayDataByIndex.get(zipTableIndex);
    if (displayData === undefined) {
      displayData = {
        name: this._zipFileTable.partName[zipTableIndex],
      };
      this._displayDataByIndex.set(zipTableIndex, displayData);
    }
    return displayData;
  }
}

/* eslint-disable react/prefer-stateless-function */
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
      zipFileTable,
      zipFileMaxDepth,
      selectedZipFileIndex,
      expandedZipFileIndexes,
      changeSelectedZipFile,
      changeExpandedZipFile,
    } = this.props;
    if (!zipFileTable) {
      return null;
    }
    const tree = new ZipFileTree(zipFileTable);

    return (
      <section className="zipFileViewer">
        <div className="zipFileViewerSection">
          <header className="zipFileViewerHeader">
            <h1>perf.html</h1>
            <p>Choose a profile from this zip file</p>
          </header>
          <TreeView
            maxNodeDepth={zipFileMaxDepth}
            tree={tree}
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
    zipFileTable: getZipFileTable(state),
    zipFileMaxDepth: getZipFileMaxDepth(state),
    selectedZipFileIndex: getSelectedZipFileIndex(state),
    expandedZipFileIndexes: getExpandedZipFileIndexes(state),
  }),
  mapDispatchToProps: { changeSelectedZipFile, changeExpandedZipFile },
  component: ZipFileViewer,
};

export default explicitConnect(options);
