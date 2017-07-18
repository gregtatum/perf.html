/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import React from 'react';
import Perf from 'react-addons-perf';
import { render } from 'react-dom';
import Root from './components/app/Root';
import createStore from './create-store';
import '../res/style.css';

if (process.env.NODE_ENV === 'production') {
  const runtime = require('offline-plugin/runtime');
  runtime.install({
    onUpdateReady: () => {
      runtime.applyUpdate();
    },
  });
}

if (process.env.NODE_ENV === 'development') {
  if (localStorage.logRedux !== 'true' && localStorage.logRedux !== 'false') {
    localStorage.logRedux = 'true';
  }
  if (localStorage.logRedux !== 'true' && localStorage.logRedux !== 'false') {
    localStorage.logTimeCode = 'true';
  }
  console.log(
    'perf.html logging is enabled. To toggle the level set the following values to true or false'
  );
  console.log(`localStorage.logRedux - Currently ${localStorage.logRedux}`);
  console.log(
    `localStorage.logTimeCode - Currently ${localStorage.logTimeCode}`
  );
}

window.geckoProfilerPromise = new Promise(function(resolve) {
  window.connectToGeckoProfiler = resolve;
});

const store = createStore();

render(<Root store={store} />, document.getElementById('root'));

window.Perf = Perf;
