/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow

import * as React from 'react';
import explicitConnect from '../../utils/connect';
import { getIsUrlSetupDone } from '../../selectors/app';
import { updateUrlState, urlSetupDone, show404 } from '../../actions/app';
import { urlFromState, stateFromLocation } from '../../app-logic/url-handling';

import type { ConnectedProps } from '../../utils/connect';
import type { UrlState } from '../../types/state';

type StateProps = {|
  +urlState: UrlState,
  +isUrlSetupDone: boolean,
|};

type DispatchProps = {|
  +updateUrlState: typeof updateUrlState,
  +urlSetupDone: typeof urlSetupDone,
  +show404: typeof show404,
|};

type OwnProps = {|
  +children: React.Node,
|};

type Props = ConnectedProps<OwnProps, StateProps, DispatchProps>;

/**
 * This component manages the interaction with the window.history browser API.
 */
class UrlManager extends React.PureComponent<Props> {
  _updateState(firstRun: boolean) {
    const { updateUrlState, show404, urlState: previousUrlState } = this.props;
    let newUrlState;
    if (window.history.state) {
      // The UrlState is serialized and stored in the history API. Pull out that state
      // and use it as the real UrlState.
      newUrlState = (window.history.state: UrlState);
    } else {
      // There is no state serialized and stored by the browser, attempt to create
      // A UrlState object by parsin gthe window.location.
      try {
        newUrlState = stateFromLocation(window.location);
      } catch (e) {
        // The location could not be parsed, show a 404 instead.
        console.error(e);
        show404(window.location.pathname + window.location.search);
        return;
      }
    }

    if (firstRun) {
      // Validate the initial URL state. We can't refresh on a from-file URL.
      if (newUrlState.dataSource === 'from-file') {
        newUrlState = null;
      }
    } else {
      // Profile sanitization and publishing can do weird things for the history API.
      // Rather than write lots of complicated interactions, just bail out of allowing
      // the back button to work when going between a published profile, and one
      // that is not.
      if (
        previousUrlState.dataSource !== newUrlState.dataSource ||
        previousUrlState.hash !== newUrlState.hash
      ) {
        window.history.replaceState(
          previousUrlState,
          document.title,
          urlFromState(previousUrlState)
        );
      }
    }

    // Update the Redux store.
    updateUrlState(newUrlState);
  }

  componentDidMount() {
    this._updateState(true);
    window.addEventListener('popstate', () => this._updateState(false));
    this.props.urlSetupDone();
  }

  componentWillReceiveProps(nextProps: Props) {
    const { isUrlSetupDone } = this.props;
    const newUrl = urlFromState(nextProps.urlState);
    if (newUrl !== window.location.pathname + window.location.search) {
      if (isUrlSetupDone) {
        window.history.pushState(nextProps.urlState, document.title, newUrl);
      } else {
        window.history.replaceState(nextProps.urlState, document.title, newUrl);
      }
    }
  }

  render() {
    const { isUrlSetupDone } = this.props;
    return isUrlSetupDone ? (
      this.props.children
    ) : (
      <div className="processingUrl" />
    );
  }
}

export default explicitConnect<OwnProps, StateProps, DispatchProps>({
  mapStateToProps: state => ({
    urlState: state.urlState,
    isUrlSetupDone: getIsUrlSetupDone(state),
  }),
  mapDispatchToProps: {
    updateUrlState,
    urlSetupDone,
    show404,
  },
  component: UrlManager,
});
