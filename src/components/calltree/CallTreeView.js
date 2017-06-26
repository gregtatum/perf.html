/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import React from 'react';
import CallTreeTree from './Tree';
import CallTreeSettings from './Settings';
import CallTreeFilterNavigator from './FilterNavigator';

const CallTreeView = () => (
  <div className='callTreeView'>
    <CallTreeFilterNavigator />
    <CallTreeSettings />
    <CallTreeTree/>
  </div>
);

CallTreeView.propTypes = {
};

export default CallTreeView;
