/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow

export function mockConsoleError() {
  const consoleError = console.error;
  (console: Object).error = jest.fn();

  // Capture the stack at the initialization of this mock.
  const error = new Error();

  const exitWarning = () => {
    throw new Error(
      `A test did not clean up a console mock. The mock was initialized at: \n\n${
        error.stack
      }`
    );
  };

  process.on('exit', exitWarning);

  return () => {
    process.removeListener('exit', exitWarning);
    (console: Object).error = consoleError;
  };
}
