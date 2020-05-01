/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */



import * as React from "react";
import { showMenu } from "react-contextmenu";
import TimelineGlobalTrack from "./GlobalTrack";
import TimelineRuler from "./Ruler";
import TimelineSelection from "./Selection";
import OverflowEdgeIndicator from "./OverflowEdgeIndicator";
import Reorderable from "../shared/Reorderable";
import { withSize } from "../shared/WithSize";
import explicitConnect from "../../utils/connect";
import { getPanelLayoutGeneration } from "../../selectors/app";
import { getCommittedRange, getZeroAt, getGlobalTracks, getGlobalTrackReferences, getHiddenTrackCount, getActiveBrowsingContextID } from "../../selectors/profile";
import { getGlobalTrackOrder, getTimelineType, getShowTabOnly } from "../../selectors/url-state";
import { TIMELINE_MARGIN_LEFT, TIMELINE_MARGIN_RIGHT, TIMELINE_SETTINGS_HEIGHT } from "../../app-logic/constants";
import TimelineTrackContextMenu from "./TrackContextMenu";

import "./index.css";

import { SizeProps } from "../shared/WithSize";

import { changeGlobalTrackOrder, changeTimelineType, changeRightClickedTrack } from "../../actions/profile-view";
import { changeViewAndRecomputeProfileData } from "../../actions/receive-profile";

import { BrowsingContextID } from "../../types/profile";
import { TrackIndex, GlobalTrack, InitialSelectedTrackReference } from "../../types/profile-derived";
import { GlobalTrackReference, TimelineType, HiddenTrackCount } from "../../types/actions";
import { Milliseconds, StartEndRange } from "../../types/units";
import { ConnectedProps } from "../../utils/connect";

type StateProps = {
  readonly committedRange: StartEndRange;
  readonly globalTracks: GlobalTrack[];
  readonly globalTrackOrder: TrackIndex[];
  readonly globalTrackReferences: GlobalTrackReference[];
  readonly panelLayoutGeneration: number;
  readonly zeroAt: Milliseconds;
  readonly timelineType: TimelineType;
  readonly hiddenTrackCount: HiddenTrackCount;
  readonly activeBrowsingContextID: BrowsingContextID | null;
  readonly showTabOnly: BrowsingContextID | null;
};

type DispatchProps = {
  readonly changeGlobalTrackOrder: typeof changeGlobalTrackOrder;
  readonly changeTimelineType: typeof changeTimelineType;
  readonly changeRightClickedTrack: typeof changeRightClickedTrack;
  readonly changeViewAndRecomputeProfileData: typeof changeViewAndRecomputeProfileData;
};

type Props = SizeProps & ConnectedProps<{}, StateProps, DispatchProps>;

type State = {
  initialSelected: InitialSelectedTrackReference | null;
};

class TimelineSettingsGraphType extends React.PureComponent<{
  readonly timelineType: TimelineType;
  readonly changeTimelineType: typeof changeTimelineType;
}> {

  _changeToCategories = () => this.props.changeTimelineType('category');
  _changeToStacks = () => this.props.changeTimelineType('stack');

  render() {
    const {
      timelineType
    } = this.props;

    return <form>
        <div className="timelineSettingsToggle">
          Graph type:{' '}
          <label className="photon-label photon-label-micro timelineSettingsToggleLabel">
            <input type="radio" name="timelineSettingsToggle" className="photon-radio photon-radio-micro timelineSettingsToggleInput" checked={timelineType === 'category'} onChange={this._changeToCategories} />
            Categories
          </label>
          <label className="photon-label-micro timelineSettingsToggleLabel">
            <input type="radio" name="timelineSettingsToggle" className="photon-radio photon-radio-micro timelineSettingsToggleInput" checked={timelineType === 'stack'} onChange={this._changeToStacks} />
            Stack height
          </label>
        </div>
      </form>;
  }
}

class TimelineSettingsHiddenTracks extends React.PureComponent<{
  readonly hiddenTrackCount: HiddenTrackCount;
  readonly changeRightClickedTrack: typeof changeRightClickedTrack;
}> {

  _showMenu = (event: React.MouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    this.props.changeRightClickedTrack(null);
    showMenu({
      data: null,
      id: 'TimelineTrackContextMenu',
      position: { x: rect.left, y: rect.bottom },
      target: event.target
    });
  };

  render() {
    const {
      hiddenTrackCount
    } = this.props;

    return <button type="button" onClick={this._showMenu} className="timelineSettingsHiddenTracks">
        <span className="timelineSettingsHiddenTracksNumber">
          {hiddenTrackCount.total - hiddenTrackCount.hidden}
        </span>
        {' / '}
        <span className="timelineSettingsHiddenTracksNumber">
          {hiddenTrackCount.total}{' '}
        </span>
        tracks visible
      </button>;
  }
}

class TimelineSettingsActiveTabView extends React.PureComponent<{
  readonly activeBrowsingContextID: BrowsingContextID | null;
  readonly showTabOnly: BrowsingContextID | null;
  readonly changeViewAndRecomputeProfileData: typeof changeViewAndRecomputeProfileData;
}> {

  _toggleShowTabOnly = () => {
    const {
      showTabOnly,
      changeViewAndRecomputeProfileData,
      activeBrowsingContextID
    } = this.props;
    if (showTabOnly === null) {
      changeViewAndRecomputeProfileData(activeBrowsingContextID);
    } else {
      changeViewAndRecomputeProfileData(null);
    }
  };

  render() {
    const {
      activeBrowsingContextID,
      showTabOnly
    } = this.props;
    if (activeBrowsingContextID === null) {
      return null;
    }

    return <div className="timelineSettingsToggle">
        <label className="photon-label photon-label-micro timelineSettingsToggleLabel">
          <input type="checkbox" name="timelineSettingsActiveTabToggle" className="photon-checkbox photon-checkbox-micro" onChange={this._toggleShowTabOnly} checked={showTabOnly !== null} />
          Show active tab only
        </label>
      </div>;
  }
}

class FullTimeline extends React.PureComponent<Props, State> {

  state = {
    initialSelected: null
  };

  /**
   * This method collects the initially selected track's HTMLElement. This allows the timeline
   * to scroll the initially selected track into view once the page is loaded.
   */
  setInitialSelected = (el: InitialSelectedTrackReference) => {
    this.setState({ initialSelected: el });
  };

  render() {
    const {
      globalTracks,
      globalTrackOrder,
      changeGlobalTrackOrder,
      committedRange,
      zeroAt,
      width,
      globalTrackReferences,
      panelLayoutGeneration,
      timelineType,
      hiddenTrackCount,
      changeTimelineType,
      changeRightClickedTrack,
      activeBrowsingContextID,
      showTabOnly,
      changeViewAndRecomputeProfileData
    } = this.props;

    // Do not include the left and right margins when computing the timeline width.
    const timelineWidth = width - TIMELINE_MARGIN_LEFT - TIMELINE_MARGIN_RIGHT;

    return <>
        <div className="timelineSettings" style={{
        '--timeline-settings-height': `${TIMELINE_SETTINGS_HEIGHT}px`
      }}>
          <TimelineSettingsGraphType timelineType={timelineType} changeTimelineType={changeTimelineType} />
          <TimelineSettingsHiddenTracks hiddenTrackCount={hiddenTrackCount} changeRightClickedTrack={changeRightClickedTrack} />
          {
          /*
           Removing the active tab view checkbox for now.
           TODO: Bring it back once we are done with the new active tab UI implementation.
          */
        }
          {
          /* eslint-disable-next-line no-constant-condition */
        }
          {true ? null : <TimelineSettingsActiveTabView activeBrowsingContextID={activeBrowsingContextID} showTabOnly={showTabOnly} changeViewAndRecomputeProfileData={changeViewAndRecomputeProfileData} />}
        </div>
        <TimelineSelection width={timelineWidth}>
          <TimelineRuler zeroAt={zeroAt} rangeStart={committedRange.start} rangeEnd={committedRange.end} width={timelineWidth} />
          <OverflowEdgeIndicator className="timelineOverflowEdgeIndicator" panelLayoutGeneration={panelLayoutGeneration} initialSelected={this.state.initialSelected}>
            <Reorderable tagName="ol" className="timelineThreadList" grippyClassName="timelineTrackGlobalGrippy" order={globalTrackOrder} orient="vertical" onChangeOrder={changeGlobalTrackOrder}>
              {globalTracks.map((globalTrack, trackIndex) => <TimelineGlobalTrack key={trackIndex} trackIndex={trackIndex} trackReference={globalTrackReferences[trackIndex]} setInitialSelected={this.setInitialSelected} />)}
            </Reorderable>
          </OverflowEdgeIndicator>
        </TimelineSelection>
        <TimelineTrackContextMenu />
      </>;
  }
}

export default explicitConnect<{}, StateProps, DispatchProps>({
  mapStateToProps: state => ({
    globalTracks: getGlobalTracks(state),
    globalTrackOrder: getGlobalTrackOrder(state),
    globalTrackReferences: getGlobalTrackReferences(state),
    committedRange: getCommittedRange(state),
    zeroAt: getZeroAt(state),
    panelLayoutGeneration: getPanelLayoutGeneration(state),
    timelineType: getTimelineType(state),
    hiddenTrackCount: getHiddenTrackCount(state),
    activeBrowsingContextID: getActiveBrowsingContextID(state),
    showTabOnly: getShowTabOnly(state)
  }),
  mapDispatchToProps: {
    changeGlobalTrackOrder,
    changeTimelineType,
    changeRightClickedTrack,
    changeViewAndRecomputeProfileData
  },
  component: withSize<Props>(FullTimeline)
});