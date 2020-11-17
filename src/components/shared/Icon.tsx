/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */



import React, { PureComponent } from 'react';
import explicitConnect from 'firefox-profiler/utils/connect';
import { getIconClassName } from 'firefox-profiler/selectors/icons';
import { iconStartLoading } from 'firefox-profiler/actions/icons';

import { CallNodeDisplayData } from 'firefox-profiler/types';
import { ConnectedProps } from 'firefox-profiler/utils/connect';

import './Icon.css';

type OwnProps =
  | {
      // This prop is used by call tree.
      +displayData: CallNodeDisplayData,
    }
  | {
      // This prop is for other parts of the profiler.
      +iconUrl: string | null,
    };

type StateProps = {
  +className: string,
  +icon: string | null,
};

type DispatchProps = {
  +iconStartLoading: typeof iconStartLoading,
};

type Props = ConnectedProps<OwnProps, StateProps, DispatchProps>;

class IconImpl extends PureComponent<Props> {
  constructor(props: Props) {
    super(props);
    if (props.icon) {
      props.iconStartLoading(props.icon);
    }
  }

  componentDidUpdate() {
    if (this.props.icon) {
      this.props.iconStartLoading(this.props.icon);
    }
  }

  render() {
    return <div className={`nodeIcon ${this.props.className}`} />;
  }
}

export const Icon = explicitConnect<OwnProps, StateProps, DispatchProps>({
  mapStateToProps: (state, ownProps) => {
    const icon = ownProps.displayData
      ? ownProps.displayData.iconSrc
      : ownProps.iconUrl;

    return {
      className: getIconClassName(state, icon),
      icon,
    };
  },
  mapDispatchToProps: { iconStartLoading },
  component: IconImpl,
});
