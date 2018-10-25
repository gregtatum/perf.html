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

import {
  selectedThreadSelectors,
  getCommittedRange,
  getProfileInterval,
  getPreviewSelection,
} from '../../reducers/profile-view';
import {
  getSelectedThreadIndex,
  getShowJsTracerSummary,
} from '../../reducers/url-state';
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
  // Unused directly, but used in the computation of the timing information.
  +showJsTracerSummary: boolean,
  +timeRange: { start: Milliseconds, end: Milliseconds },
  +interval: Milliseconds,
  +threadIndex: number,
  +previewSelection: PreviewSelection,
|};

type Props = ConnectedProps<{||}, StateProps, DispatchProps>;

const _computeFullTimingWeakmap = new WeakMap();
const _computeSummaryTimingWeakmap = new WeakMap();

class JsTracerExpensiveChart extends React.PureComponent<Props> {
  /**
   * Determine the maximum zoom of the viewport.
   */
  getMaximumZoom(): UnitIntervalOfProfileRange {
    const { timeRange: { start, end }, interval } = this.props;
    return interval / (end - start);
  }

  render() {
    const {
      timeRange,
      threadIndex,
      jsTracerTable,
      previewSelection,
      updatePreviewSelection,
      showJsTracerSummary,
    } = this.props;

    if (!jsTracerTable) {
      console.error(
        'The JsTracerExpensiveChart should have a non-null jsTracerTable'
      );
      return null;
    }

    const computeExpensiveJsTracerTiming = showJsTracerSummary
      ? _computeSummaryTimingWeakmap.get(jsTracerTable)
      : _computeFullTimingWeakmap.get(jsTracerTable);
    if (!computeExpensiveJsTracerTiming) {
      console.error(
        'Expected to have a computeTiming function from the given jsTracerTable'
      );
      return null;
    }

    const jsTracerTimingRows = computeExpensiveJsTracerTiming();
    if (!jsTracerTimingRows) {
      console.error(
        'The JsTracerExpensiveChart should have a non-null jsTracerTimingRows'
      );
      return null;
    }

    // The viewport needs to know about the height of what it's drawing, calculate
    // that here at the top level component.
    const maxViewportHeight = jsTracerTimingRows.length * ROW_HEIGHT;

    return (
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
    const jsTracerTable = selectedThreadSelectors.getJsTracerTable(state);
    const showJsTracerSummary = getShowJsTracerSummary(state);
    const computeTimingWeakmap = showJsTracerSummary
      ? _computeSummaryTimingWeakmap
      : _computeFullTimingWeakmap;
    const computeTiming = computeTimingWeakmap.get(jsTracerTable);
    if (!computeTiming) {
      computeTimingWeakmap.set(jsTracerTable, () =>
        selectedThreadSelectors.getExpensiveJsTracerTiming(state)
      );
    }
    return {
      jsTracerTable,
      showJsTracerSummary,
      timeRange: getCommittedRange(state),
      interval: getProfileInterval(state),
      threadIndex: getSelectedThreadIndex(state),
      previewSelection: getPreviewSelection(state),
    };
  },
  mapDispatchToProps: { updatePreviewSelection },
  component: JsTracerExpensiveChart,
};
export default explicitConnect(options);
