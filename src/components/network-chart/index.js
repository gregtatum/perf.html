/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow
import * as React from 'react';
import explicitConnect from '../../utils/connect';
import MarkerChartCanvas from './Canvas';
import NetworkChartEmptyReasons from './NetworkChartEmptyReasons';

import {
  selectedThreadSelectors,
  getDisplayRange,
  getProfileInterval,
  getProfileViewOptions,
} from '../../reducers/profile-view';
import { getSelectedThreadIndex } from '../../reducers/url-state';
import { updateProfileSelection } from '../../actions/profile-view';

import type {
  TracingMarker,
  MarkerTimingRows,
} from '../../types/profile-derived';
import type {
  Milliseconds,
  UnitIntervalOfProfileRange,
} from '../../types/units';
import type { ProfileSelection } from '../../types/actions';
import type {
  ExplicitConnectOptions,
  ConnectedProps,
} from '../../utils/connect';

require('./index.css');

const ROW_HEIGHT = 16;

type DispatchProps = {|
  +updateProfileSelection: typeof updateProfileSelection,
|};

type StateProps = {|
  +markers: TracingMarker[],
  +networkTimingRows: MarkerTimingRows,
  +maxNetworkRows: number,
  +timeRange: { start: Milliseconds, end: Milliseconds },
  +interval: Milliseconds,
  +threadIndex: number,
  +selection: ProfileSelection,
  +threadName: string,
  +processDetails: string,
|};

type Props = ConnectedProps<{||}, StateProps, DispatchProps>;

class NetworkChart extends React.PureComponent<Props> {
  /**
   * Determine the maximum zoom of the viewport.
   */
  getMaximumZoom(): UnitIntervalOfProfileRange {
    const { timeRange: { start, end }, interval } = this.props;
    return interval / (end - start);
  }

  render() {
    const {
      maxNetworkRows,
      timeRange,
      threadIndex,
      networkTimingRows,
      markers,
      selection,
      threadName,
      processDetails,
      updateProfileSelection,
    } = this.props;

    if (!markers.length) {
      return <NetworkChartEmptyReasons />;
    }

    // The viewport needs to know about the height of what it's drawing, calculate
    // that here at the top level component.
    const maxViewportHeight = maxNetworkRows * ROW_HEIGHT;

    return (
      <div className="networkChart">
        <div className="networkChartLabels grippy" title={processDetails}>
          <span className="networkChartLabelsName">{threadName}</span>
        </div>
        <MarkerChartCanvas
          key={threadIndex}
          viewportProps={{
            timeRange,
            selection,
            maxViewportHeight,
            viewportNeedsUpdate,
            maximumZoom: this.getMaximumZoom(),
          }}
          chartProps={{
            networkTimingRows,
            markers,
            updateProfileSelection,
            rangeStart: timeRange.start,
            rangeEnd: timeRange.end,
            rowHeight: ROW_HEIGHT,
            threadIndex,
          }}
        />
      </div>
    );
  }
}

//** This function is given the NetworkChartCanvas's chartProps. */
function viewportNeedsUpdate(
  prevProps: { +networkTimingRows: MarkerTimingRows },
  newProps: { +networkTimingRows: MarkerTimingRows }
) {
  return prevProps.networkTimingRows !== newProps.networkTimingRows;
}

const options: ExplicitConnectOptions<{||}, StateProps, DispatchProps> = {
  mapStateToProps: state => {
    const markers = selectedThreadSelectors.getTracingMarkers(state);
    const networkTimingRows = selectedThreadSelectors.getNetworkTiming(state);
    const threadName = selectedThreadSelectors.getFriendlyThreadName(state);

    return {
      markers,
      networkTimingRows,
      maxNetworkRows: networkTimingRows.length,
      timeRange: getDisplayRange(state),
      interval: getProfileInterval(state),
      threadIndex: getSelectedThreadIndex(state),
      selection: getProfileViewOptions(state).selection,
      threadName,
      processDetails: selectedThreadSelectors.getThreadProcessDetails(state),
    };
  },
  mapDispatchToProps: { updateProfileSelection },
  component: NetworkChart,
};
export default explicitConnect(options);
