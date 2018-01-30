/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow
import TextDecoder from 'text-encoding';

/**
 * This function mocks out the indexedDB as an in-memory database while fn is running.
 */
export default function withMockTextDecoder<T: Function>(fn: T) {
  return async () => {
    if (window.TextDecoder) {
      throw new Error(
        'Attempting to mock TextDecoder, but found an existing value on window.TextDecoder.'
      );
    }
    window.TextDecoder = TextDecoder;

    const response = await fn();

    delete window.TextDecoder;
    return response;
  };
}
