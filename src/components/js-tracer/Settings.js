/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow

import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import { changeShowJsTracerSummary } from '../../actions/profile-view';
import { getShowJsTracerSummary } from '../../reducers/url-state';

import './Settings.css';

import type { ImplementationFilter } from '../../types/actions';

type Props = {|
  +implementationFilter: ImplementationFilter,
  +showJsTracerSummary: boolean,
  +changeShowJsTracerSummary: typeof changeShowJsTracerSummary,
|};

class JsTracerSettings extends PureComponent<Props> {
  _onCheckboxChange = (e: SyntheticEvent<HTMLInputElement>) => {
    this.props.changeShowJsTracerSummary(e.currentTarget.checked);
  };

  render() {
    const { showJsTracerSummary } = this.props;

    return (
      <div className="jsTracerSettings">
        <ul className="jsTracerSettingsList">
          <li className="jsTracerSettingsListItem">
            <label className="jsTracerSettingsLabel">
              <input
                type="checkbox"
                className="jsTracerSettingsCheckbox"
                onChange={this._onCheckboxChange}
                checked={showJsTracerSummary}
              />
              {' Summarize'}
            </label>
          </li>
        </ul>
      </div>
    );
  }
}

export default connect(
  state => ({
    showJsTracerSummary: getShowJsTracerSummary(state),
  }),
  {
    changeShowJsTracerSummary,
  }
)(JsTracerSettings);
