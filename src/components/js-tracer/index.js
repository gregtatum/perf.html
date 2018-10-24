/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow
import * as React from 'react';
import {
  TIMELINE_MARGIN_LEFT,
  TIMELINE_MARGIN_RIGHT,
} from '../../app-logic/constants';
import explicitConnect from '../../utils/connect';
import JsTracerCanvas from './Canvas';
import JsTracerSettings from './Settings';
import EmptyReasons from './EmptyReasons';

import {
  selectedThreadSelectors,
  getCommittedRange,
  getProfileInterval,
  getPreviewSelection,
} from '../../reducers/profile-view';
import { getSelectedThreadIndex } from '../../reducers/url-state';
import { updatePreviewSelection } from '../../actions/profile-view';

import type { JsTracerTable } from '../../types/profile';
import type { JsTracerTiming } from '../../types/profile-derived';
import type {
  Milliseconds,
  UnitIntervalOfProfileRange,
} from '../../types/units';
import type { PreviewSelection } from '../../types/actions';
import type {
  ExplicitConnectOptions,
  ConnectedProps,
} from '../../utils/connect';

require('./index.css');

const ROW_HEIGHT = 16;

type DispatchProps = {|
  +updatePreviewSelection: typeof updatePreviewSelection,
|};

type StateProps = {|
  +jsTracerTable: JsTracerTable | null,
  +jsTracerTimingRows: JsTracerTiming[] | null,
  +maxRows: number,
  +timeRange: { start: Milliseconds, end: Milliseconds },
  +interval: Milliseconds,
  +threadIndex: number,
  +previewSelection: PreviewSelection,
|};

type Props = ConnectedProps<{||}, StateProps, DispatchProps>;

class JsTracer extends React.PureComponent<Props> {
  /**
   * Determine the maximum zoom of the viewport.
   */
  getMaximumZoom(): UnitIntervalOfProfileRange {
    const { timeRange: { start, end }, interval } = this.props;
    return interval / (end - start);
  }

  render() {
    const {
      maxRows,
      timeRange,
      threadIndex,
      jsTracerTimingRows,
      jsTracerTable,
      previewSelection,
      updatePreviewSelection,
    } = this.props;

    // The viewport needs to know about the height of what it's drawing, calculate
    // that here at the top level component.
    const maxViewportHeight = maxRows * ROW_HEIGHT;

    return (
      <div className="jsTracer">
        {jsTracerTable === null || jsTracerTimingRows === null ? (
          <EmptyReasons />
        ) : (
          <>
            <JsTracerSettings />
            <JsTracerCanvas
              key={threadIndex}
              viewportProps={{
                timeRange,
                previewSelection,
                maxViewportHeight,
                viewportNeedsUpdate,
                maximumZoom: this.getMaximumZoom(),
                marginLeft: TIMELINE_MARGIN_LEFT,
                marginRight: TIMELINE_MARGIN_RIGHT,
              }}
              chartProps={{
                jsTracerTimingRows,
                jsTracerTable,
                updatePreviewSelection,
                rangeStart: timeRange.start,
                rangeEnd: timeRange.end,
                rowHeight: ROW_HEIGHT,
                threadIndex,
              }}
            />
          </>
        )}
      </div>
    );
  }
}

// This function is given the JsTracerCanvas's chartProps.
function viewportNeedsUpdate(
  prevProps: { +jsTracerTimingRows: JsTracerTiming[] },
  newProps: { +jsTracerTimingRows: JsTracerTiming[] }
) {
  return prevProps.jsTracerTimingRows !== newProps.jsTracerTimingRows;
}

const options: ExplicitConnectOptions<{||}, StateProps, DispatchProps> = {
  mapStateToProps: state => {
    const jsTracerTimingRows = selectedThreadSelectors.getJsTracerTiming(state);
    return {
      jsTracerTable: selectedThreadSelectors.getJsTracerTable(state),
      jsTracerTimingRows,
      maxRows: jsTracerTimingRows === null ? 0 : jsTracerTimingRows.length,
      timeRange: getCommittedRange(state),
      interval: getProfileInterval(state),
      threadIndex: getSelectedThreadIndex(state),
      previewSelection: getPreviewSelection(state),
    };
  },
  mapDispatchToProps: { updatePreviewSelection },
  component: JsTracer,
};
export default explicitConnect(options);
