/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow

import React, { PureComponent } from 'react';

import EmptyReasons from '../shared/EmptyReasons';
import { selectedThreadSelectors } from '../../reducers/profile-view';

import explicitConnect, {
  type ExplicitConnectOptions,
  type ConnectedProps,
} from '../../utils/connect';

import type { State } from '../../types/store';
import type { Thread } from '../../types/profile';

type StateProps = {|
  +thread: Thread,
  +threadName: string,
|};

type Props = ConnectedProps<{||}, StateProps, {||}>;
class NetworkChartEmptyReasons extends PureComponent<Props> {
  render() {
    const { thread, threadName } = this.props;

    let reason;
    const viewName = 'network chart';

    if (thread.markers.length === 0) {
      reason = 'This thread has no network markers.';
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
    thread: selectedThreadSelectors.getThread(state),
    threadName: selectedThreadSelectors.getFriendlyThreadName(state),
  }),
  component: NetworkChartEmptyReasons,
};

export default explicitConnect(options);
