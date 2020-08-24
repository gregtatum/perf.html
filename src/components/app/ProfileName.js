/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow
import * as React from 'react';

import explicitConnect from '../../utils/connect';
import { getProfileName } from 'firefox-profiler/selectors';
import { changeProfileName } from '../../actions/profile-view';

import type { ConnectedProps } from '../../utils/connect';

import './ProfileName.css';

type StateProps = {|
  +profileName: string,
|};

type DispatchProps = {|
  +changeProfileName: typeof changeProfileName,
|};

type Props = ConnectedProps<{||}, StateProps, DispatchProps>;

type State = {|
  isFocused: boolean,
  // Every time the input is focused, it's recreated to consistently set the initial
  // value.
  focusGeneration: number,
|};

/**
 * Allow the user to rename profiles. These get persisted to the URL, and the document
 * title is updated with the new name. This component uses a button as a focus
 * target, but then switches to a text input when it is used. This is done because
 * the button can be dynamically sized according to its content (the default inactive
 * state), and then when active, it switches to an input, which is only fixed in size.
 */
class ProfileNameImpl extends React.PureComponent<Props, State> {
  state = {
    isFocused: false,
    focusGeneration: 0,
  };

  inputRef = React.createRef();

  blurInput() {
    this.setState(state => ({
      isFocused: false,
      focusGeneration: state.focusGeneration++,
    }));
  }

  changeProfileNameIfChanged = (event: SyntheticEvent<HTMLInputElement>) => {
    const { changeProfileName, profileName } = this.props;
    const newProfileName = event.currentTarget.value.trim();

    if (newProfileName !== profileName) {
      changeProfileName(newProfileName);
    }
  };

  blurOnEscapeOrEnter = (event: SyntheticKeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'Escape': {
        this.blurInput();
        break;
      }
      case 'Enter': {
        this.changeProfileNameIfChanged(event);
        this.blurInput();
        break;
      }
      default:
      // Do nothing.
    }
  };

  handleButtonFocus = () => {
    this.setState({ isFocused: true });

    const input = this.inputRef.current;
    if (input) {
      requestAnimationFrame(() => {
        // Allow time for React to render this.
        input.focus();
        input.select();
      });
    }
  };

  render() {
    const { isFocused, focusGeneration } = this.state;
    const { profileName } = this.props;
    const title = 'Edit the profile name';

    // Use both a button and input at the same time. Buttons can be sized according
    // to their content, and text inputs cannot. Once the button is focused, it
    // activates the input. The input ref needs to be available to focus, so it
    // is unconditionally attached the DOM, and both element's visibility is
    // controlled by CSS.
    return (
      <>
        <button
          type="button"
          style={{
            display: isFocused ? 'none' : 'block',
          }}
          title={title}
          className="profileNameButton"
          onFocus={this.handleButtonFocus}
          onClick={this.handleButtonFocus}
        >
          {profileName}
        </button>
        <input
          // The key requires both the profile name and focus generation to properly
          // support the back button and blur events.
          key={`${profileName}-${focusGeneration}`}
          className="profileNameInput"
          style={{
            display: isFocused ? 'block' : 'none',
          }}
          defaultValue={profileName}
          aria-label="Profile name"
          title={title}
          onBlur={this.changeProfileNameIfChanged}
          ref={this.inputRef}
          // Keypress won't
          onKeyDown={this.blurOnEscapeOrEnter}
        />
      </>
    );
  }
}

export const ProfileName = explicitConnect<{||}, StateProps, DispatchProps>({
  mapStateToProps: state => ({
    profileName: getProfileName(state),
  }),
  mapDispatchToProps: {
    changeProfileName,
  },
  component: ProfileNameImpl,
});
