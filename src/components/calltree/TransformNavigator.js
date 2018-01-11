/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow

import explicitConnect from '../../utils/connect';
import { selectedThreadSelectors } from '../../reducers/profile-view';
import FilterNavigatorBar from './FilterNavigatorBar';
import { popTransformsFromStack } from '../../actions/profile-view';

import type { State } from '../../types/reducers';
import type { ExplicitConnectOptions } from '../../utils/connect';

import './TransformNavigator.css';

type Props = $PropertyType<FilterNavigatorBar, 'props'>;
type DispatchProps = {|
  onPop: $PropertyType<Props, 'onPop'>,
|};
type StateProps = $Diff<Props, StateProps>;

const options: ExplicitConnectOptions<{||}, StateProps, DispatchProps> = {
  mapStateToProps: (state: State) => {
    const items = selectedThreadSelectors.getTransformLabels(state);
    return {
      className: 'calltreeTransformNavigator',
      items,
      selectedItem: items.length - 1,
    };
  },
  mapDispatchToProps: { onPop: popTransformsFromStack },
  component: FilterNavigatorBar,
};

export default explicitConnect(options);
