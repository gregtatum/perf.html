/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow
import * as React from 'react';
import explicitConnect from '../../utils/connect';
import { getInvertCallstack, selectedThread } from 'firefox-profiler/selectors';
import { changeInvertCallstack } from '../../actions/profile-view';
import FlameGraphEmptyReasons from './FlameGraphEmptyReasons';
import FlameGraph from './FlameGraph';

import type { ConnectedProps } from '../../utils/connect';

require('./MaybeFlameGraph.css');

type StateProps = {|
  +maxStackDepth: number,
  +invertCallstack: boolean,
|};
type DispatchProps = {|
  +changeInvertCallstack: typeof changeInvertCallstack,
|};
type Props = ConnectedProps<{||}, StateProps, DispatchProps>;

class MaybeFlameGraph extends React.PureComponent<Props> {
  _onSwitchToNormalCallstackClick = () => {
    this.props.changeInvertCallstack(false);
  };

  render() {
    const { maxStackDepth, invertCallstack } = this.props;

    if (maxStackDepth === 0) {
      return <FlameGraphEmptyReasons />;
    }

    if (invertCallstack) {
      return (
        <div className="flameGraphDisabledMessage">
          <h3>The Flame Graph is not available for inverted call stacks</h3>
          <p>
            <button
              type="button"
              onClick={this._onSwitchToNormalCallstackClick}
            >
              Switch to the normal call stack
            </button>{' '}
            to show the Flame Graph.
          </p>
        </div>
      );
    }
    return <FlameGraph />;
  }
}

export default explicitConnect<{||}, StateProps, DispatchProps>({
  mapStateToProps: state => {
    return {
      invertCallstack: getInvertCallstack(state),
      maxStackDepth: selectedThread.getCallNodeMaxDepthForFlameGraph(state),
    };
  },
  mapDispatchToProps: {
    changeInvertCallstack,
  },
  component: MaybeFlameGraph,
});
