/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow

import React, { PureComponent, PropTypes } from 'react';
import { connect } from 'react-redux';
import actions from '../../actions';
import { getImplementationFilter, getInvertCallstack, getSearchString } from '../../reducers/url-state';
import IdleSearchField from '../shared/IdleSearchField';

import './Settings.css';

type Props = {
  implementationFilter: string,
  invertCallstack: boolean,
  searchString: string,
  changeImplementationFilter: string => void,
  changeInvertCallstack: boolean => void,
  changeCallTreeSearchString: string => void,
};

class CallTreeSettings extends PureComponent {
  props: Props;

  constructor(props) {
    super(props);
    (this: any)._onImplementationFilterChange = this._onImplementationFilterChange.bind(this);
    (this: any)._onInvertCallstackClick = this._onInvertCallstackClick.bind(this);
    (this: any)._onSearchFieldIdleAfterChange = this._onSearchFieldIdleAfterChange.bind(this);
  }

  _onImplementationFilterChange(e: Event & { target: HTMLSelectElement }) {
    this.props.changeImplementationFilter(e.target.value);
  }

  _onInvertCallstackClick(e: Event & { target: HTMLInputElement }) {
    this.props.changeInvertCallstack(e.target.checked);
  }

  _onSearchFieldIdleAfterChange(value: string) {
    this.props.changeCallTreeSearchString(value);
  }

  render() {
    const { implementationFilter, invertCallstack, searchString } = this.props;
    return (
      <div className='callTreeSettings'>
        <ul className='callTreeSettingsList'>
          <li className='callTreeSettingsListItem'>
            <label className='callTreeSettingsLabel'>
              Filter:
              <select
                     className='callTreeSettingsSelect'
                     onChange={this._onImplementationFilterChange}
                     value={implementationFilter}>
                <option value='combined'>Combined stacks</option>
                <option value='js'>JS only</option>
                <option value='cpp'>C++ only</option>
              </select>
            </label>
          </li>
          <li className='callTreeSettingsListItem'>
            <label className='callTreeSettingsLabel'>
              <input type='checkbox'
                     className='callTreeSettingsCheckbox'
                     onChange={this._onInvertCallstackClick}
                     checked={invertCallstack}/>
              { ' Invert call stack' }
            </label>
          </li>
        </ul>
        <div className='callTreeSettingsSearchbar'>
          <label className='callTreeSettingsSearchbarLabel'>
            {'Filter stacks: '}
            <IdleSearchField className='callTreeSettingsSearchField'
                             title='Only display stacks which contain a function whose name matches this substring'
                             idlePeriod={200}
                             defaultValue={searchString}
                             onIdleAfterChange={this._onSearchFieldIdleAfterChange}/>
          </label>
        </div>
      </div>
    );
  }
}

CallTreeSettings.propTypes = {
  implementationFilter: PropTypes.string.isRequired,
  changeImplementationFilter: PropTypes.func.isRequired,
  invertCallstack: PropTypes.bool.isRequired,
  changeInvertCallstack: PropTypes.func.isRequired,
  changeCallTreeSearchString: PropTypes.func.isRequired,
  searchString: PropTypes.string.isRequired,
};

export default connect(state => ({
  invertCallstack: getInvertCallstack(state),
  implementationFilter: getImplementationFilter(state),
  searchString: getSearchString(state),
}), actions)(CallTreeSettings);
