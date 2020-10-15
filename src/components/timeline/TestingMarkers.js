/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow

import { connect } from 'react-redux';
import type { State } from 'firefox-profiler/types';

/**
 * TODO
 */
export const TimelineMarkersTesting = connect<
  OwnProps,
  StateProps,
  DispatchProps,
  State
>(
  (state, props) => {
    const { threadsKey } = props;
    const selectors = getThreadSelectorsFromThreadsKey(threadsKey);
    const selectedThreads = getSelectedThreadIndexes(state);

    return {
      getMarker: selectors.getMarkerGetter(state),
      markerIndexes: selectors.getTimelineTestingMarkerIndexes(state),
      isSelected: _getTimelineMarkersIsSelected(selectedThreads, threadsKey),
      isModifyingSelection: getPreviewSelection(state).isModifying,
      testId: 'TimelineMarkersTesting',
      rightClickedMarker: selectors.getRightClickedMarker(state),
    };
  },
  { changeRightClickedMarker }
)(TimelineMarkers);
