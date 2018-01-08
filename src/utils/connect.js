/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow

import { connect } from 'react-redux';
import type {} from 'react-redux';

type ConnectOptions = {
  mapStateToProps?: *,
  mapDispatchToProps?: *,
  mergeProps?: *,
  options?: *,
  component: *,
};

/**
 * react-redux's connect function is too polymorphic and problematic. This function
 * is a wrapper to simplify the typing of connect and make it more explicit, and
 * less magical.
 */
export default function simpleConnect(connectOptions: ConnectOptions) {
  const {
    mapStateToProps,
    mapDispatchToProps,
    mergeProps,
    options,
    component,
  } = connectOptions;
  return connect(mapStateToProps, mapDispatchToProps, mergeProps, options)(
    component
  );
}
