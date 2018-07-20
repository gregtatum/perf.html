/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow
import React, { PureComponent } from 'react';
import { ContextMenu, MenuItem } from 'react-contextmenu';
import {
  hideGlobalTrack,
  showGlobalTrack,
  isolateGlobalTrack,
  isolateLocalTrack,
} from '../../actions/profile-view';
import explicitConnect from '../../utils/connect';
import { ensureExists } from '../../utils/flow';
import {
  getThreads,
  getRightClickedTrack,
  getGlobalTracks,
  getLocalTracksByPid,
} from '../../reducers/profile-view';
import {
  getGlobalTrackOrder,
  getHiddenGlobalTracks,
} from '../../reducers/url-state';
import { getFriendlyThreadName } from '../../profile-logic/profile-data';
import classNames from 'classnames';

import type { Thread, ThreadIndex, Pid } from '../../types/profile';
import type {
  TrackIndex,
  GlobalTrack,
  LocalTrack,
} from '../../types/profile-derived';
import type { State } from '../../types/reducers';
import type { TrackReference } from '../../types/actions';

import type {
  ExplicitConnectOptions,
  ConnectedProps,
} from '../../utils/connect';

type StateProps = {|
  +threads: Thread[],
  +globalTrackOrder: TrackIndex[],
  +hiddenGlobalTracks: Set<TrackIndex>,
  +rightClickedTrack: TrackReference,
  +globalTracks: GlobalTrack[],
  +localTracksByPid: Map<Pid, LocalTrack[]>,
|};

type DispatchProps = {|
  +hideGlobalTrack: typeof hideGlobalTrack,
  +showGlobalTrack: typeof showGlobalTrack,
  +isolateGlobalTrack: typeof isolateGlobalTrack,
  +isolateLocalTrack: typeof isolateLocalTrack,
|};

type Props = ConnectedProps<{||}, StateProps, DispatchProps>;

class TimelineThreadContextMenu extends PureComponent<Props> {
  _toggleTrackVisibility = (_, data: { trackIndex: TrackIndex }): void => {
    console.log('!!! _toggleTrackVisibility', data.trackIndex);
    const { trackIndex } = data;
    const { hiddenGlobalTracks, hideGlobalTrack, showGlobalTrack } = this.props;
    if (hiddenGlobalTracks.has(trackIndex)) {
      console.log('!!! show');
      showGlobalTrack(trackIndex);
    } else {
      console.log('!!! hide');
      hideGlobalTrack(trackIndex);
    }
  };

  _isolateTrack = () => {
    const {
      isolateGlobalTrack,
      isolateLocalTrack,
      rightClickedTrack,
    } = this.props;
    if (rightClickedTrack.type === 'global') {
      isolateGlobalTrack(rightClickedTrack.trackIndex);
    } else {
      const { pid, trackIndex } = rightClickedTrack;
      isolateLocalTrack(pid, trackIndex);
    }
  };

  getRightClickedThreadIndex(): ThreadIndex | null {
    const { rightClickedTrack, globalTracks, localTracksByPid } = this.props;
    if (rightClickedTrack.type === 'global') {
      const track = globalTracks[rightClickedTrack.trackIndex];
      return track.type === 'process' ? track.mainThreadIndex : null;
    } else {
      const { pid, trackIndex } = rightClickedTrack;
      const localTracks = ensureExists(
        localTracksByPid.get(pid),
        'No local tracks found at that pid.'
      );
      const track = localTracks[trackIndex];

      return track.type === 'thread' ? track.threadIndex : null;
    }
  }

  render() {
    const {
      threads,
      globalTrackOrder,
      hiddenGlobalTracks,
      globalTracks,
    } = this.props;

    const rightClickedThreadIndex = this.getRightClickedThreadIndex();
    const clickedThreadName =
      rightClickedThreadIndex === null
        ? null
        : getFriendlyThreadName(threads, threads[rightClickedThreadIndex]);

    console.log('!!! globalTrackOrder', globalTrackOrder);
    return (
      <ContextMenu id={'TimelineThreadContextMenu'}>
        {threads.length > 1 && clickedThreadName !== null ? (
          <div>
            <MenuItem
              onClick={this._isolateTrack}
              disabled={hiddenGlobalTracks.size === globalTrackOrder.length - 1}
            >
              Only show: {`"${clickedThreadName}"`}
            </MenuItem>
            <div className="react-contextmenu-separator" />
          </div>
        ) : null}
        {globalTrackOrder.map(trackIndex => {
          const isHidden = hiddenGlobalTracks.has(trackIndex);
          const globalTrack = globalTracks[trackIndex];
          return globalTrack.type === 'process' ? (
            <MenuItem
              key={trackIndex}
              preventClose={true}
              data={{ trackIndex }}
              onClick={this._toggleTrackVisibility}
              attributes={{
                className: classNames({ checkable: true, checked: !isHidden }),
              }}
            >
              {globalTrack.mainThreadIndex === null
                ? null
                : getFriendlyThreadName(
                    threads,
                    threads[globalTrack.mainThreadIndex]
                  )}
            </MenuItem>
          ) : null;
        })}
      </ContextMenu>
    );
  }
}

const options: ExplicitConnectOptions<{||}, StateProps, DispatchProps> = {
  mapStateToProps: (state: State) => ({
    threads: getThreads(state),
    globalTrackOrder: getGlobalTrackOrder(state),
    hiddenGlobalTracks: getHiddenGlobalTracks(state),
    rightClickedTrack: getRightClickedTrack(state),
    globalTracks: getGlobalTracks(state),
    localTracksByPid: getLocalTracksByPid(state),
  }),
  mapDispatchToProps: {
    hideGlobalTrack,
    showGlobalTrack,
    isolateGlobalTrack,
    isolateLocalTrack,
  },
  component: TimelineThreadContextMenu,
};
export default explicitConnect(options);
