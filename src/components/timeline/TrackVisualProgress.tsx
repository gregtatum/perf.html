/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */



import * as React from 'react';
import explicitConnect from 'firefox-profiler/utils/connect';
import { getCommittedRange } from 'firefox-profiler/selectors/profile';
import { updatePreviewSelection } from 'firefox-profiler/actions/profile-view';
import { TrackVisualProgressGraph } from './TrackVisualProgressGraph';
import {
  TRACK_VISUAL_PROGRESS_LINE_WIDTH,
  TRACK_VISUAL_PROGRESS_HEIGHT,
} from 'firefox-profiler/app-logic/constants';

import { ProgressGraphData, Milliseconds } from 'firefox-profiler/types';

import { ConnectedProps } from 'firefox-profiler/utils/connect';

import './TrackVisualProgress.css';

type OwnProps = {
  +progressGraphData: ProgressGraphData[],
  +graphDotTooltipText: string,
};

type StateProps = {
  +rangeStart: Milliseconds,
  +rangeEnd: Milliseconds,
};

type DispatchProps = {
  updatePreviewSelection: typeof updatePreviewSelection,
};

type Props = ConnectedProps<OwnProps, StateProps, DispatchProps>;

type State = {};
/*
 * This component is responsible for rendering the Visual Progress tracks, which
 * are only available for profiles generated by Browsertime. Currently, there are
 * 3 Visual Progress tracks, including Visual Progress, Perceptual Visual Progress,
 * and Contentful Visual Progress. Each of these tracks is passed graph data, along
 * with other properties such as graph color and tooltip text as props.
 */
export class TrackVisualProgressImpl extends React.PureComponent<Props, State> {
  render() {
    const { progressGraphData, graphDotTooltipText } = this.props;
    return (
      <div
        className="timelineTrackVisualProgress"
        style={{
          height: TRACK_VISUAL_PROGRESS_HEIGHT,
          '--graph-height': `${TRACK_VISUAL_PROGRESS_HEIGHT}px`,
        }}
      >
        <TrackVisualProgressGraph
          progressGraphData={progressGraphData}
          lineWidth={TRACK_VISUAL_PROGRESS_LINE_WIDTH}
          graphHeight={TRACK_VISUAL_PROGRESS_HEIGHT}
          graphDotTooltipText={graphDotTooltipText}
        />
      </div>
    );
  }
}

export const TrackVisualProgress = explicitConnect<
  OwnProps,
  StateProps,
  DispatchProps
>({
  mapStateToProps: state => {
    const { start, end } = getCommittedRange(state);
    return {
      rangeStart: start,
      rangeEnd: end,
    };
  },
  mapDispatchToProps: { updatePreviewSelection },
  component: TrackVisualProgressImpl,
});
