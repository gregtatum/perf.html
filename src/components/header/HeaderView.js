/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow

import React, { PureComponent } from 'react';
import HeaderThreadBar from './ThreadBar';
import Reorderable from '../shared/Reorderable';
import TimeSelectionScrubber from './TimeSelectionScrubber';
import ProfileThreadJankOverview from './ProfileThreadJankOverview';
import ProfileThreadTracingMarkerOverview from './ProfileThreadTracingMarkerOverview';
import OverflowEdgeIndicator from '../shared/OverflowEdgeIndicator';
import { connect } from 'react-redux';
import { getProfile, getProfileViewOptions, getDisplayRange, getZeroAt } from '../../reducers/profile-view';
import { getVisibleThreadOrder, getHiddenThreads, getThreadOrder } from '../../reducers/url-state';

import {
  changeThreadOrder,
  updateProfileSelection,
  addRangeFilterAndUnsetSelection,
  changeSelectedThread,
} from '../../actions/profile-view';

import type { Profile, ThreadIndex } from '../../types/profile';
import type { ProfileSelection } from '../../types/actions';
import type { State } from '../../types/reducers';
import type { Milliseconds, StartEndRange } from '../../types/units';

require('./HeaderView.css');

type Props = {|
  profile: Profile,
  className: string,
  visibleThreadOrder: ThreadIndex[],
  hiddenThreads: ThreadIndex[],
  threadOrder: ThreadIndex[],
  selection: ProfileSelection,
  timeRange: StartEndRange,
  zeroAt: Milliseconds,
  changeThreadOrder: typeof changeThreadOrder,
  updateProfileSelection: typeof updateProfileSelection,
  addRangeFilterAndUnsetSelection: typeof addRangeFilterAndUnsetSelection,
  changeSelectedThread: typeof changeSelectedThread,
|};

class HeaderView extends PureComponent {
  props: Props;

  constructor(props: Props) {
    super(props);
    (this: any)._onZoomButtonClick = this._onZoomButtonClick.bind(this);
    (this: any)._onIntervalMarkerSelect = this._onIntervalMarkerSelect.bind(this);
  }

  _onZoomButtonClick(start: Milliseconds, end: Milliseconds) {
    const { addRangeFilterAndUnsetSelection, zeroAt } = this.props;
    addRangeFilterAndUnsetSelection(start - zeroAt, end - zeroAt);
  }

  _onIntervalMarkerSelect(threadIndex: ThreadIndex, start: Milliseconds, end: Milliseconds) {
    const { timeRange, updateProfileSelection, changeSelectedThread } = this.props;
    updateProfileSelection({
      hasSelection: true,
      isModifying: false,
      selectionStart: Math.max(timeRange.start, start),
      selectionEnd: Math.min(timeRange.end, end),
    });
    changeSelectedThread(threadIndex);
  }

  render() {
    const {
      profile, threadOrder, visibleThreadOrder, changeThreadOrder,
      selection, updateProfileSelection, timeRange, zeroAt, hiddenThreads,
    } = this.props;
    const threads = profile.threads;

    return <TimeSelectionScrubber className='header'
                           zeroAt={zeroAt}
                           rangeStart={timeRange.start}
                           rangeEnd={timeRange.end}
                           minSelectionStartWidth={profile.meta.interval}
                           selection={selection}
                           onSelectionChange={updateProfileSelection}
                           onZoomButtonClick={this._onZoomButtonClick}>
      <div className='headerIntervalMarkerOverviewContainer headerIntervalMarkerOverviewContainerJank'>
        {
          visibleThreadOrder.map(threadIndex => {
            const threadName = threads[threadIndex].name;
            const processType = threads[threadIndex].processType;
            return (
              ((threadName === 'GeckoMain' && processType !== 'plugin') ?
                <ProfileThreadJankOverview className='headerIntervalMarkerOverview headerIntervalMarkerOverviewJank'
                                           rangeStart={timeRange.start}
                                           rangeEnd={timeRange.end}
                                           threadIndex={threadIndex}
                                           key={threadIndex}
                                           onSelect={this._onIntervalMarkerSelect}
                                           isModifyingSelection={selection.isModifying} /> : null)
            );
          })
        }
      </div>
      <div className='headerIntervalMarkerOverviewContainer headerIntervalMarkerOverviewContainerGfx'>
        {
          visibleThreadOrder.map(threadIndex => {
            const threadName = threads[threadIndex].name;
            const processType = threads[threadIndex].processType;
            return (
              (((threadName === 'GeckoMain' || threadName === 'Compositor' || threadName ==='Renderer') && processType !== 'plugin') ?
                <ProfileThreadTracingMarkerOverview className={`headerIntervalMarkerOverview headerIntervalMarkerOverviewGfx headerIntervalMarkerOverviewThread${threadName}`}
                                                    rangeStart={timeRange.start}
                                                    rangeEnd={timeRange.end}
                                                    threadIndex={threadIndex}
                                                    key={threadIndex}
                                                    onSelect={this._onIntervalMarkerSelect}
                                                    isModifyingSelection={selection.isModifying} /> : null)
            );
          })
        }
      </div>
      <OverflowEdgeIndicator className='headerOverflowEdgeIndicator'>
        {<Reorderable tagName='ol'
                     className='headerThreadList'
                     order={threadOrder}
                     orient='vertical'
                     onChangeOrder={changeThreadOrder}>
          {
            threads.map((thread, threadIndex) =>
              <HeaderThreadBar key={threadIndex}
                                      index={threadIndex}
                                      interval={profile.meta.interval}
                                      rangeStart={timeRange.start}
                                      rangeEnd={timeRange.end}
                                      isHidden={hiddenThreads.includes(threadIndex)}/>
            )
          }
        </Reorderable>}
      </OverflowEdgeIndicator>
    </TimeSelectionScrubber>;
  }
}

export default connect(
  (state: State) => ({
    profile: getProfile(state),
    selection: getProfileViewOptions(state).selection,
    visibleThreadOrder: getVisibleThreadOrder(state),
    threadOrder: getThreadOrder(state),
    hiddenThreads: getHiddenThreads(state),
    timeRange: getDisplayRange(state),
    zeroAt: getZeroAt(state),
  }),
  {
    changeThreadOrder,
    updateProfileSelection,
    addRangeFilterAndUnsetSelection,
    changeSelectedThread,
  }
)(HeaderView);
