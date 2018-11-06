/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow
import * as React from 'react';
import explicitConnect from '../../utils/connect';
import JsTracerExpensiveChart from './ExpensiveChart';
import JsTracerSettings from './Settings';
import EmptyReasons from './EmptyReasons';

import { selectedThreadSelectors } from '../../reducers/profile-view';
import { updatePreviewSelection } from '../../actions/profile-view';

import type { JsTracerTable } from '../../types/profile';
import type {
  ExplicitConnectOptions,
  ConnectedProps,
} from '../../utils/connect';

require('./index.css');

type DispatchProps = {|
  +updatePreviewSelection: typeof updatePreviewSelection,
|};

type StateProps = {|
  +jsTracerInvalidationChecker: () => boolean,
  +jsTracerTable: JsTracerTable | null,
|};

type Props = ConnectedProps<{||}, StateProps, DispatchProps>;

type State = {|
  wasLoaderMounted: boolean,
|};

const LOADER_WAS_MOUNTED = { wasLoaderMounted: true };
const LOADER_HAS_NOT_BEEN_MOUNTED = { wasLoaderMounted: false };

class JsTracer extends React.PureComponent<Props, State> {
  state: State = LOADER_HAS_NOT_BEEN_MOUNTED;

  _rafGeneration: number = 0;

  componentDidMount() {
    this._checkInvalidation(this.props);
  }

  componentWillReceiveProps(props: Props) {
    this._checkInvalidation(props);
  }

  _checkInvalidation(props: Props) {
    if (props.jsTracerInvalidationChecker()) {
      const rafGeneration = ++this._rafGeneration;
      requestAnimationFrame(() => {
        // Ensure the requested frame is the one after the React update.
        requestAnimationFrame(() => {
          if (rafGeneration === this._rafGeneration) {
            this.setState(LOADER_WAS_MOUNTED);
          }
        });
      });
      this.setState(LOADER_HAS_NOT_BEEN_MOUNTED);
    } else {
      this.setState(LOADER_WAS_MOUNTED);
    }
  }

  render() {
    const { jsTracerTable } = this.props;

    return (
      <div className="jsTracer">
        {jsTracerTable === null ? (
          <EmptyReasons />
        ) : (
          <>
            <JsTracerSettings />
            {this.state.wasLoaderMounted ? (
              <JsTracerExpensiveChart />
            ) : (
              <div className="jsTracerLoader">
                Re-constructing tracing information from{' '}
                {jsTracerTable.events.length.toLocaleString()} events. This
                might take a moment.
              </div>
            )}
          </>
        )}
      </div>
    );
  }
}

const options: ExplicitConnectOptions<{||}, StateProps, DispatchProps> = {
  mapStateToProps: state => {
    return {
      jsTracerInvalidationChecker: selectedThreadSelectors.getJsTracerInvalidationChecker(
        state
      ),
      jsTracerTable: selectedThreadSelectors.getJsTracerTable(state),
    };
  },
  mapDispatchToProps: { updatePreviewSelection },
  component: JsTracer,
};
export default explicitConnect(options);
