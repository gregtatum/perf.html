/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow

import React, { PureComponent } from 'react';

import EmptyReasons from '../shared/EmptyReasons';
import { selectedThreadSelectors } from '../../reducers/profile-view';
import { getSelectedTab } from '../../reducers/url-state';

import explicitConnect, {
  type ExplicitConnectOptions,
  type ConnectedProps,
} from '../../utils/connect';

import type { State } from '../../types/store';
import type { TabSlug } from '../../app-logic/tabs-handling';

type StateProps = {|
  +threadName: string,
  +selectedTab: TabSlug,
  +isThreadEmptyOfMarkers: boolean,
|};

type Props = ConnectedProps<{||}, StateProps, {||}>;
class MarkerChartEmptyReasons extends PureComponent<Props> {
  render() {
    const { selectedTab, isThreadEmptyOfMarkers, threadName } = this.props;

    let reason, viewName;
    if (selectedTab === 'network-chart') {
      viewName = 'network chart';
      if (isThreadEmptyOfMarkers) {
        reason = 'This thread has no network markers.';
      } else {
        reason =
          'All network requests were filtered out by the current selection or search term.';
      }
    } else {
      viewName = 'network chart';
      if (isThreadEmptyOfMarkers) {
        reason = 'This thread contains no markers.';
      } else {
        reason =
          'All markers were filtered out by the current selection or search term.';
      }
    }

    return (
      <EmptyReasons
        threadName={threadName}
        reason={reason}
        viewName={viewName}
      />
    );
  }
}

const options: ExplicitConnectOptions<{||}, StateProps, {||}> = {
  mapStateToProps: (state: State) => ({
    threadName: selectedThreadSelectors.getFriendlyThreadName(state),
    isThreadEmptyOfMarkers:
      selectedThreadSelectors.getThread(state).markers.length === 0,
    selectedTab: getSelectedTab(state),
  }),
  component: MarkerChartEmptyReasons,
};

export default explicitConnect(options);
