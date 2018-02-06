/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow
import * as React from 'react';
import explicitConnect, {
  type ExplicitConnectOptions,
  type ConnectedProps,
} from '../../utils/connect';
import {
  procureInitialInterestingExpandedNodes,
  type ZipFileTree,
  type IndexIntoZipFileTable,
} from '../../profile-logic/zip-files';
import {
  changeSelectedZipFile,
  changeExpandedZipFile,
  viewProfileFromZip,
} from '../../actions/app';
import {
  getZipFileState,
  getZipFileTree,
  getZipFileMaxDepth,
  getSelectedZipFileIndex,
  getExpandedZipFileIndexes,
} from '../../reducers/app';
import { getZipFilePath } from '../../reducers/url-state';
import TreeView from '../shared/TreeView';
import ProfileViewer from './ProfileViewer';
import type { ZipFileState } from '../../types/reducers';

import './ZipFileViewer.css';

type StateProps = {|
  +zipFileState: ZipFileState,
  +zipFilePath: string | null,
  +zipFileTree: ZipFileTree,
  +zipFileMaxDepth: number,
  +selectedZipFileIndex: IndexIntoZipFileTable | null,
  // In practice this should never contain null, but needs to support the
  // TreeView interface.
  expandedZipFileIndexes: Array<IndexIntoZipFileTable | null>,
|};

type DispatchProps = {|
  +changeSelectedZipFile: typeof changeSelectedZipFile,
  +changeExpandedZipFile: typeof changeExpandedZipFile,
  +viewProfileFromZip: typeof viewProfileFromZip,
|};

type Props = ConnectedProps<{||}, StateProps, DispatchProps>;

type ZipDisplayData = {|
  +name: string,
|};

class ZipFileViewer extends React.PureComponent<Props> {
  _fixedColumns = [];
  _mainColumn = { propName: 'name', title: '' };
  _appendageButtons = ['focusCallstackButton'];
  _treeView: ?TreeView<IndexIntoZipFileTable, ZipDisplayData>;
  _takeTreeViewRef = treeView => (this._treeView = treeView);

  componentWillMount() {
    const {
      expandedZipFileIndexes,
      zipFileTree,
      changeExpandedZipFile,
    } = this.props;
    if (expandedZipFileIndexes.length === 0 && zipFileTree) {
      changeExpandedZipFile(
        procureInitialInterestingExpandedNodes(zipFileTree)
      );
    }
  }

  componentDidMount() {
    const { zipFileState, zipFilePath, zipFileTree } = this.props;
    if (zipFileState.phase === 'NONE' && zipFilePath) {
      // Most likely the UrlState was deserialized from the URL, but the zip file
      // still hasn't actually been decompressed yet.
      if (!zipFileTree) {
        throw new Error(
          'The zipFileTree should exist if this component was mounted'
        );
      }
    }
    this.focus();
  }

  focus() {
    const treeView = this._treeView;
    if (treeView) {
      treeView.focus();
    }
  }

  _onAppendageButtonClick = (zipFileIndex: IndexIntoZipFileTable | null) => {
    if (zipFileIndex !== null) {
      this.props.viewProfileFromZip(zipFileIndex);
    }
  };

  _renderMessage(message: React.Node) {
    return (
      <section className="zipFileViewer">
        <div className="zipFileViewerSection">
          <header className="zipFileViewerHeader">
            <h1>perf.html</h1>
            <p>Choose a profile from this zip file</p>
          </header>
          <div className="zipFileViewerMessage">{message}</div>
        </div>
      </section>
    );
  }

  render() {
    const {
      zipFileState,
      zipFileTree,
      zipFileMaxDepth,
      selectedZipFileIndex,
      expandedZipFileIndexes,
      changeSelectedZipFile,
      changeExpandedZipFile,
    } = this.props;

    if (!zipFileTree) {
      console.error('No zipFileTree was found in a ZipFileViewer.');
      return null;
    }
    const { phase } = zipFileState;

    switch (phase) {
      case 'NO_ZIP_FILE':
        console.error(
          'Loaded the ZipFileViewer component when there is no zip file.'
        );
        return this._renderMessage(<span>Error: No zip file was found.</span>);
      case 'LIST_FILES_IN_ZIP_FILE':
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
                appendageButtons={this._appendageButtons}
                onAppendageButtonClick={this._onAppendageButtonClick}
                ref={this._takeTreeViewRef}
                contextMenuId={'MarkersContextMenu'}
                rowHeight={30}
                indentWidth={15}
              />
            </div>
          </section>
        );
      case 'PROCESS_PROFILE_FROM_ZIP_FILE':
        return this._renderMessage(<span>Processing the profile...</span>);
      case 'FAILED_TO_PROCESS_PROFILE_FROM_ZIP_FILE':
        return this._renderMessage(<span>Failed to process the profile</span>);
      case 'VIEW_PROFILE_IN_ZIP_FILE':
        return <ProfileViewer />;
      default:
        (phase: empty); // eslint-disable-line no-unused-expressions
        throw new Error('Unknown zip file phase.');
    }
  }
}

const options: ExplicitConnectOptions<{||}, StateProps, DispatchProps> = {
  mapStateToProps: state => {
    const zipFileTree = getZipFileTree(state);
    if (zipFileTree === null) {
      throw new Error(
        'The zipFileTree should exist if the ZipFileViewer is mounted.'
      );
    }
    return {
      zipFileState: getZipFileState(state),
      zipFilePath: getZipFilePath(state),
      zipFileTree,
      zipFileMaxDepth: getZipFileMaxDepth(state),
      selectedZipFileIndex: getSelectedZipFileIndex(state),
      expandedZipFileIndexes: getExpandedZipFileIndexes(state),
    };
  },
  mapDispatchToProps: {
    changeSelectedZipFile,
    changeExpandedZipFile,
    viewProfileFromZip,
  },
  component: ZipFileViewer,
};

export default explicitConnect(options);
