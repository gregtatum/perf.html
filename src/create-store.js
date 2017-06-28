/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow

import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import { createLogger } from 'redux-logger';
import reducers from './reducers';
import threadDispatcher from './utils/thread-middleware';
import messages from './profile-logic/summary-worker/messages-content';
import handleMessages from './utils/message-handler';
import type { Store } from './types/store';
// import Worker from './utils/worker-factory';

function getWorkerPath(): string {
  const rootEl = document.querySelector('#root');
  if (!rootEl) {
    throw new Error('Could not find the root element on the page.');
  }
  const scriptEl = rootEl.nextElementSibling;
  if (!scriptEl) {
    throw new Error('Could not find the script element on the page.');
  }
  const bundleSrc = scriptEl.getAttribute('src');
  if (!bundleSrc) {
    throw new Error('Could not find the script src from the script tag');
  }
  debugger;
  return bundleSrc;
}

/**
 * Isolate the store creation into a function, so that it can be used outside of the
 * app's execution context, e.g. for testing.
 * @return {object} Redux store.
 */
export default function initializeStore(): Store {
  const worker = new Worker(getWorkerPath());

  const middlewares = [
    thunk,
    threadDispatcher(worker, 'toWorker'),
  ];

  if (process.env.NODE_ENV === 'development') {
    middlewares.push(createLogger({titleFormatter: action => `content action ${action.type}`}));
  }

  const store = createStore(
    reducers,
    applyMiddleware(...middlewares)
  );

  handleMessages(worker, store, messages);

  return store;
}
