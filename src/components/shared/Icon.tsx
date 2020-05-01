/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */



import React, { PureComponent } from "react";
import explicitConnect, { ConnectedProps } from "../../utils/connect";
import { getIconClassName } from "../../selectors/icons";
import { iconStartLoading } from "../../actions/icons";

import { CallNodeDisplayData } from "../../types/profile-derived";


type OwnProps = {
  // This prop is used by call tree.
  readonly displayData: CallNodeDisplayData;
} | {
  // This prop is for other parts of the profiler.
  readonly iconUrl: string | null;
};

type StateProps = {
  readonly className: string;
  readonly icon: string | null;
};

type DispatchProps = {
  readonly iconStartLoading: typeof iconStartLoading;
};

type Props = ConnectedProps<OwnProps, StateProps, DispatchProps>;

class Icon extends PureComponent<Props> {

  constructor(props: Props) {
    super(props);
    if (props.icon) {
      props.iconStartLoading(props.icon);
    }
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    if (nextProps.icon) {
      nextProps.iconStartLoading(nextProps.icon);
    }
  }

  render() {
    return <div className={`nodeIcon ${this.props.className}`} />;
  }
}

export default explicitConnect<OwnProps, StateProps, DispatchProps>({
  mapStateToProps: (state, ownProps) => {
    const icon = ownProps.displayData ? ownProps.displayData.icon : ownProps.iconUrl;

    return {
      className: getIconClassName(state, icon),
      icon
    };
  },
  mapDispatchToProps: { iconStartLoading },
  component: Icon
});