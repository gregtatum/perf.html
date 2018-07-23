/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow

import React, { PureComponent } from 'react';
import {
  changeSelectedThread,
  changeRightClickedTrack,
} from '../../actions/profile-view';
import ContextMenuTrigger from '../shared/ContextMenuTrigger';
import {
  getSelectedThreadIndex,
  getHiddenGlobalTracks,
} from '../../reducers/url-state';
import explicitConnect from '../../utils/connect';
import {
  getGlobalTracks,
  selectorsForThread,
} from '../../reducers/profile-view';
import './GlobalTrack.css';
import TrackThread from './TrackThread';
import type { TrackReference } from '../../types/actions';
import type { ThreadIndex } from '../../types/profile';
import type { TrackIndex, GlobalTrack } from '../../types/profile-derived';
import type {
  ExplicitConnectOptions,
  ConnectedProps,
} from '../../utils/connect';

type OwnProps = {|
  +trackReference: TrackReference,
  +trackIndex: TrackIndex,
  +style?: Object /* This is used by Reorderable */,
|};

type StateProps = {|
  +threadIndex: null | ThreadIndex,
  +trackName: string,
  +globalTrack: GlobalTrack,
  +isSelected: boolean,
  +isHidden: boolean,
  +titleText: string | null,
|};

type DispatchProps = {|
  +changeSelectedThread: typeof changeSelectedThread,
  +changeRightClickedTrack: typeof changeRightClickedTrack,
|};

type Props = ConnectedProps<OwnProps, StateProps, DispatchProps>;

class GlobalTrackComponent extends PureComponent<Props> {
  _onLabelMouseDown = (event: MouseEvent) => {
    const {
      changeSelectedThread,
      changeRightClickedTrack,
      threadIndex,
      trackReference,
    } = this.props;

    if (event.button === 0) {
      // Don't allow clicks on the threads list to steal focus from the tree view.
      event.preventDefault();
      if (threadIndex !== null) {
        changeSelectedThread(threadIndex);
      }
    } else if (event.button === 2) {
      // This is needed to allow the context menu to know what was right clicked without
      // actually changing the current selection.
      changeRightClickedTrack(trackReference);
    }
  };

  _onLineClick = () => {
    const { threadIndex, changeSelectedThread } = this.props;
    if (threadIndex !== null) {
      changeSelectedThread(threadIndex);
    }
  };

  renderTrack() {
    const { globalTrack } = this.props;
    switch (globalTrack.type) {
      case 'process': {
        const { mainThreadIndex } = globalTrack;
        if (mainThreadIndex === null) {
          (mainThreadIndex: empty);
          throw new Error('TODO - Add support for blank main thread index');
        }
        return <TrackThread threadIndex={mainThreadIndex} />;
      }
      case 'screenshots':
        // TODO: Add support for screenshots.
        return <div />;
      default:
        console.error('Unhandled globalTrack type', (globalTrack: empty));
        return null;
    }
  }

  render() {
    const { isSelected, isHidden, titleText, trackName, style } = this.props;

    if (isHidden) {
      // If this global track is hidden, render out a stub element so that the
      // Reorderable Component still works across all the tracks.
      return <li className="timelineGlobalTrackHidden" />;
    }

    return (
      <li
        className={'timelineGlobalTrack' + (isSelected ? ' selected' : '')}
        onClick={this._onLineClick}
        style={style}
      >
        <ContextMenuTrigger
          id={'TimelineThreadContextMenu'}
          renderTag="div"
          attributes={{
            title: titleText,
            className: 'grippy timelineGlobalTrackLabel',
            onMouseDown: this._onLabelMouseDown,
          }}
        >
          <h1 className="timelineGlobalTrackName">{trackName}</h1>
        </ContextMenuTrigger>
        <div className="timelineGlobalTrackTrack">{this.renderTrack()}</div>
      </li>
    );
  }
}
const options: ExplicitConnectOptions<OwnProps, StateProps, DispatchProps> = {
  mapStateToProps: (state, { trackIndex }) => {
    const globalTracks = getGlobalTracks(state);
    const globalTrack = globalTracks[trackIndex];

    // These get assigned based on the track type.
    let threadIndex = null;
    let isSelected = false;
    let titleText = null;
    let trackName;

    // Run different selectors based on the track type.
    switch (globalTrack.type) {
      case 'process':
        {
          // Look up the thread information for the process if it exists.
          if (globalTrack.mainThreadIndex !== null) {
            threadIndex = globalTrack.mainThreadIndex;
            const selectors = selectorsForThread(threadIndex);
            isSelected = threadIndex === getSelectedThreadIndex(state);
            trackName = selectors.getFriendlyThreadName(state);
            titleText = selectors.getThreadProcessDetails(state);
          } else {
            trackName = `Process ${globalTrack.pid}`;
          }
        }
        break;
      case 'screenshots':
        trackName = 'Screenshots';
        break;
      default:
        throw new Error(`Unhandled GlobalTrack type ${(globalTrack: empty)}`);
    }

    return {
      threadIndex,
      trackName,
      titleText,
      globalTrack,
      isSelected,
      isHidden: getHiddenGlobalTracks(state).has(trackIndex),
    };
  },
  mapDispatchToProps: {
    changeSelectedThread,
    changeRightClickedTrack,
  },
  component: GlobalTrackComponent,
};

export default explicitConnect(options);
