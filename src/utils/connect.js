/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow

import * as React from 'react';
import { connect } from 'react-redux';
import type { Dispatch, State, ThunkAction, Action } from '../types/store';

type MapStateToProps<OwnProps: Object, StateProps: Object> = (
  state: State,
  ownProps: OwnProps
) => StateProps;

type MapDispatchToProps<OwnProps: Object, DispatchProps: Object> =
  | ((dispatch: Dispatch, ownProps: OwnProps) => DispatchProps)
  | DispatchProps;

type MergeProps<
  StateProps,
  DispatchProps: Object,
  OwnProps: Object,
  Props: Object
> = (
  stateProps: StateProps,
  dispatchProps: DispatchProps,
  ownProps: OwnProps
) => Props;

type ConnectOptions = {
  pure?: boolean,
  areStatesEqual?: boolean,
  areOwnPropsEqual?: boolean,
  areStatePropsEqual?: boolean,
  areMergedPropsEqual?: boolean,
  storeKey?: boolean,
  forwardRef?: boolean,
};

/**
 * This function type describes the operation of taking a simple action creator, and
 * just returning it.
 */
type WrapActionCreator<Arg1, Arg2, Arg3, Arg4> = WrapActionCreator0 &
  WrapActionCreator1<Arg1> &
  WrapActionCreator2<Arg1, Arg2> &
  WrapActionCreator3<Arg1, Arg2, Arg3> &
  WrapActionCreator4<Arg1, Arg2, Arg3, Arg4>;

type WrapActionCreator0 = (() => Action) => () => Action;
type WrapActionCreator1<Arg1> = ((Arg1) => Action) => Arg1 => Action;
type WrapActionCreator2<Arg1, Arg2> = (
  (Arg1, Arg2) => Action
) => (Arg1, Arg2) => Action;
type WrapActionCreator3<Arg1, Arg2, Arg3> = (
  (Arg1, Arg2, Arg3) => Action
) => (Arg1, Arg2, Arg3) => Action;
type WrapActionCreator4<Arg1, Arg2, Arg3, Arg4> = (
  (Arg1, Arg2, Arg3, Arg4) => Action
) => (Arg1, Arg2, Arg3, Arg4) => Action;

/**
 * This function type describes the operation of removing the (Dispatch, GetState) from
 * a thunk action creator.
 * For instance:
 *   (...Args) => (Dispatch, GetState) => Returns
 *
 * Gets transformed into:
 *   (...Args) => Returns
 */

type WrapThunkActionCreator<
  Returns,
  Arg1,
  Arg2,
  Arg3,
  Arg4
> = WrapThunkActionCreator0<Returns> &
  WrapThunkActionCreator1<Returns, Arg1> &
  WrapThunkActionCreator2<Returns, Arg1, Arg2> &
  WrapThunkActionCreator3<Returns, Arg1, Arg2, Arg3> &
  WrapThunkActionCreator4<Returns, Arg1, Arg2, Arg3, Arg4>;

type WrapThunkActionCreator0<Returns> = (
  () => ThunkAction<Returns>
) => () => Returns;
type WrapThunkActionCreator1<Returns, Arg1> = (
  (Arg1) => ThunkAction<Returns>
) => Arg1 => Returns;
type WrapThunkActionCreator2<Returns, Arg1, Arg2> = (
  (Arg1, Arg2) => ThunkAction<Returns>
) => (Arg1, Arg2) => Returns;
type WrapThunkActionCreator3<Returns, Arg1, Arg2, Arg3> = (
  (Arg1, Arg2, Arg3) => ThunkAction<Returns>
) => (Arg1, Arg2, Arg3) => Returns;
type WrapThunkActionCreator4<Returns, Arg1, Arg2, Arg3, Arg4> = (
  (Arg1, Arg2, Arg3, Arg4) => ThunkAction<Returns>
) => (Arg1, Arg2, Arg3, Arg4) => Returns;

/**
 * This type takes a Props object and wraps each function in Redux's connect function.
 * It is primarily exported for testing as explicitConnect should do this for us
 * automatically. It leaves normal action creators alone, but with ThunkActions it
 * removes the (Dispatch, GetState) part of a ThunkAction.
 */
export type WrapDispatchProps<DispatchProps: Object> = $ObjMap<
  DispatchProps,
  WrapActionCreator<*, *, *, *> & WrapThunkActionCreator<*, *, *, *, *>
>;

/**
 * This type takes a single action creator, and returns the type as if the dispatch
 * function was wrapped around it. It leaves normal action creators alone, but with
 * ThunkActions it removes the (Dispatch, GetState) part of a ThunkAction.
 */
export type WrapFunctionInDispatch<Fn: Function> = $Call<
  WrapActionCreator<*, *, *, *> & WrapThunkActionCreator<*, *, *, *, *>,
  Fn
>;

type ExplicitConnectOptions<
  OwnProps: Object,
  StateProps: Object,
  DispatchProps: Object
> = {|
  mapStateToProps?: MapStateToProps<OwnProps, StateProps>,
  mapDispatchToProps?: MapDispatchToProps<OwnProps, DispatchProps>,
  mergeProps?: MergeProps<
    StateProps,
    DispatchProps,
    OwnProps,
    ConnectedProps<OwnProps, StateProps, DispatchProps>
  >,
  options?: ConnectOptions,
  component: React.ComponentType<
    ConnectedProps<OwnProps, StateProps, DispatchProps>
  >,
|};

export type ConnectedProps<
  OwnProps: Object,
  StateProps: Object,
  DispatchProps: Object
> = $ReadOnly<{|
  ...OwnProps,
  ...StateProps,
  ...WrapDispatchProps<DispatchProps>,
|}>;

export type ConnectedComponent<
  OwnProps: Object,
  StateProps: Object,
  DispatchProps: Object
> =
  | React.ComponentType<ConnectedProps<OwnProps, StateProps, DispatchProps>>
  | React.StatelessFunctionalComponent<
      ConnectedProps<OwnProps, StateProps, DispatchProps>
    >;

/**
 * react-redux's connect function is too polymorphic and problematic. This function
 * is a wrapper to simplify the typing of connect and make it more explicit, and
 * less magical.
 */
export default function explicitConnect<
  OwnProps: Object,
  StateProps: Object,
  DispatchProps: Object
>(
  connectOptions: ExplicitConnectOptions<OwnProps, StateProps, DispatchProps>
): React.ComponentType<OwnProps> {
  const {
    mapStateToProps,
    mapDispatchToProps,
    mergeProps,
    options,
    component,
  } = connectOptions;

  // Opt out of the flow-typed definition of react-redux's connect, and use our own.
  return (connect: any)(
    mapStateToProps,
    mapDispatchToProps,
    mergeProps,
    options
  )(component);
}
