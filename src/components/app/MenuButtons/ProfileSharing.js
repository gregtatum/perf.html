/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow

import * as React from 'react';
import memoize from 'memoize-immutable';
import { CSSTransition, TransitionGroup } from 'react-transition-group';
import classNames from 'classnames';
import actions from '../../../actions';
import { toggleCheckedSharingOptions } from '../../../actions/publish';
import ArrowPanel from '../../shared/ArrowPanel';
import ButtonWithPanel from '../../shared/ButtonWithPanel';
import { shortenUrl } from '../../../utils/shorten-url';
import { getProfile, getProfileRootRange } from '../../../selectors/profile';
import {
  getCheckedSharingOptions,
  getDownloadSize,
} from '../../../selectors/publish';

import explicitConnect, {
  type ExplicitConnectOptions,
  type ConnectedProps,
} from '../../../utils/connect';

import type { Profile } from '../../../types/profile';
import type {
  Action,
  DataSource,
  CheckedSharingOptions,
} from '../../../types/actions';
import type { StartEndRange } from '../../../types/units';

require('./ProfileSharing.css');

type Props = {|
  +profile: Profile,
  +dataSource: DataSource,
  +predictUrl: (Action | Action[]) => string,
  +onProfilePublished: typeof actions.profilePublished,
|};

export class MenuButtonsProfileSharing extends React.PureComponent<Props> {
  _permalinkButton: ButtonWithPanel | null;
  _permalinkTextField: HTMLInputElement | null;
  _takePermalinkButtonRef = (elem: any) => {
    this._permalinkButton = elem;
  };
  _takePermalinkTextFieldRef = (elem: any) => {
    this._permalinkTextField = elem;
  };

  constructor(props: Props) {
    super(props);
    const { dataSource } = props;
    this.state = {
      state: dataSource === 'public' ? 'public' : 'local', // local -> uploading (<-> error) -> public
      uploadProgress: 0,
      error: null,
      fullUrl: window.location.href,
      shortUrl: window.location.href,
    };
  }

  componentWillReceiveProps({ dataSource }: Props) {
    if (dataSource === 'public' && this.state.state !== 'public') {
      this.setState({ state: 'public' });
    }
    if (window.location.href !== this.state.fullUrl) {
      this.setState({
        fullUrl: window.location.href,
        shortUrl: window.location.href,
      });
    }
  }

  _onPermalinkPanelOpen = () => {
    this._shortenUrlAndFocusTextFieldOnCompletion();
  };

  _shortenUrlAndFocusTextFieldOnCompletion(): Promise<void> {
    return shortenUrl(this.state.fullUrl)
      .then(shortUrl => {
        this.setState({ shortUrl });
        const textField = this._permalinkTextField;
        if (textField) {
          textField.focus();
          textField.select();
        }
      })
      .catch(() => {});
  }

  _onPermalinkPanelClose = () => {
    if (this._permalinkTextField) {
      this._permalinkTextField.blur();
    }
  };

  _renderPermalinkTextField = () => {
    const { shortUrl } = this.state;

    return (
      <input
        type="text"
        className="menuButtonsPermalinkTextField photon-input"
        value={shortUrl}
        readOnly="readOnly"
        ref={this._takePermalinkTextFieldRef}
      />
    );
  };

  _renderUploadError = () => {
    const { error } = this.state;
    return (
      <>
        <p>An error occurred during upload:</p>
        <pre>{error && error.toString()}</pre>
      </>
    );
  };

  _renderSharingComponent = () => {
    ProfileSharingButton;
  };

  render() {
    const { state, uploadProgress } = this.state;

    return (
      <TransitionGroup
        className={classNames('menuButtonsCompositeButtonContainer', {
          currentButtonIsShareButton: state === 'local',
          currentButtonIsUploadingButton: state === 'uploading',
          currentButtonIsPermalinkButton: state === 'public',
          currentButtonIsUploadErrorButton: state === 'error',
        })}
        data-testid="menuButtonsCompositeButtonContainer"
      >
        {/* the buttons are conditionally rendered (depending on the state) */}
        {state === 'local' && (
          <AnimateUpTransition>
            <ButtonWithPanel
              buttonClassName="menuButtonsShareButton"
              shareLabel="Share…"
              panel={
                <ArrowPanel
                  className="menuButtonsPrivacyPanel"
                  onOpen={panelOpenEvent ? panelOpenEvent : undefined}
                  content={this._renderSharingComponent}
                />
              }
            />
            <ProfileSharingButton
              okButtonClickEvent={this._attemptToShare}
              checkboxDisabled={false}
            />
          </AnimateUpTransition>
        )}

        {state === 'uploading' && (
          <AnimateUpTransition>
            <UploadingStatus progress={uploadProgress} />
          </AnimateUpTransition>
        )}

        {/* The Permalink button is rendered when state === 'uploading' AND state === 'public'.
       The Permalink button itself is hidden when uploading is in progress,
       but the Permalink's ArrowPanel with the URL is always displayed. */}
        {(state === 'uploading' || state === 'public') && (
          <AnimateUpTransition>
            <ButtonWithPanel
              className="menuButtonsPermalinkButton"
              ref={this._takePermalinkButtonRef}
              label="Permalink"
              panel={
                <ArrowPanel
                  className="menuButtonsPermalinkPanel"
                  onOpen={this._onPermalinkPanelOpen}
                  onClose={this._onPermalinkPanelClose}
                  content={this._renderPermalinkTextField}
                />
              }
            />
          </AnimateUpTransition>
        )}

        {state === 'error' && (
          <AnimateUpTransition>
            <ButtonWithPanel
              className="menuButtonsUploadErrorButton"
              label="Upload Error"
              open
              panel={
                <ArrowPanel
                  className="menuButtonsUploadErrorPanel"
                  title="Upload Error"
                  okButtonText="Try Again"
                  cancelButtonText="Cancel"
                  onOkButtonClick={this._attemptToShare}
                  content={this._renderUploadError}
                />
              }
            />
          </AnimateUpTransition>
        )}
      </TransitionGroup>
    );
  }
}

const UploadingStatus = ({ progress }: { progress: number }) => (
  <div className="menuButtonsUploadingButton">
    <div className="menuButtonsUploadingButtonInner">
      <progress
        className="menuButtonsUploadingButtonProgress"
        value={progress}
      />
      <div className="menuButtonsUploadingButtonLabel">Uploading...</div>
    </div>
  </div>
);

// CSSTransition wrapper component
const AnimateUpTransition = (props: {}) => (
  <CSSTransition
    {...props}
    timeout={200}
    classNames="menuButtonsTransitionUp"
  />
);

type ProfileSharingButtonOwnProps = {|
  +buttonClassName: string,
  +shareLabel: string,
  +okButtonClickEvent: () => mixed,
  +panelOpenEvent?: () => void,
  +checkboxDisabled: boolean,
|};

type ProfileSharingButtonStateProps = {|
  +profile: Profile,
  +rootRange: StartEndRange,
  +checkedSharingOptions: CheckedSharingOptions,
  +downloadSizePromise: Promise<string>,
|};

type ProfileSharingButtonDispatchProps = {|
  toggleCheckedSharingOptions: typeof toggleCheckedSharingOptions,
|};

type ProfileSharingButtonProps = ConnectedProps<
  ProfileSharingButtonOwnProps,
  ProfileSharingButtonStateProps,
  ProfileSharingButtonDispatchProps
>;

class ProfileSharingButtonImpl extends React.PureComponent<
  ProfileSharingButtonProps
> {
  _toggles: { [$Keys<CheckedSharingOptions>]: () => mixed } = {
    isFiltering: () => this.props.toggleCheckedSharingOptions('isFiltering'),
    hiddenThreads: () =>
      this.props.toggleCheckedSharingOptions('hiddenThreads'),
    timeRange: () => this.props.toggleCheckedSharingOptions('timeRange'),
    screenshots: () => this.props.toggleCheckedSharingOptions('screenshots'),
    urls: () => this.props.toggleCheckedSharingOptions('urls'),
    extension: () => this.props.toggleCheckedSharingOptions('extension'),
  };

  _renderCheckbox(slug: $Keys<CheckedSharingOptions>, label: string) {
    const { checkedSharingOptions } = this.props;
    const isDisabled = !checkedSharingOptions.isFiltering;
    const toggle = this._toggles[slug];
    return (
      <label
        className={classNames({
          'photon-label': true,
          menuButtonsPrivacyDataChoicesLabel: true,
          disabled: isDisabled,
        })}
      >
        <input
          type="checkbox"
          className="photon-checkbox"
          name={slug}
          disabled={isDisabled}
          onChange={toggle}
          checked={checkedSharingOptions[slug]}
        />
        {label}
      </label>
    );
  }

  _renderPanelContent = () => {
    const { checkedSharingOptions, downloadSizePromise } = this.props;

    return (
      <div className="menuButtonsPrivacyContent">
        <div className="menuButtonsPrivacyIcon" />
        <p className="menuButtonsPrivacyInfoDescription">
          You’re about to share your profile potentially where others have
          public access to it. By default, the profile is stripped of much of
          the personally identifiable information.
        </p>
        <details className="menuButtonsPrivacyData">
          <summary className="menuButtonsPrivacyDataSummary">
            Adjust how much is shared{' '}
            <DownloadSize downloadSizePromise={downloadSizePromise} />
          </summary>
          <label className="photon-label">
            <input
              className="photon-checkbox"
              type="checkbox"
              name="isFiltering"
              onChange={this._toggles.isFiltering}
              checked={checkedSharingOptions.isFiltering}
            />
            Filter out potentially identifying information
          </label>
          <div className="menuButtonsPrivacyDataChoices">
            {this._renderCheckbox('hiddenThreads', 'Remove hidden threads')}
            {this._renderCheckbox(
              'timeRange',
              'Remove information out of the time range'
            )}
            {this._renderCheckbox('screenshots', 'Remove screenshots')}
            {this._renderCheckbox('urls', 'Remove all URLs')}
            {this._renderCheckbox('extension', 'Remove extensions')}
          </div>
        </details>
        <div className="menuButtonsPrivacyButtons">
          <button
            type="button"
            className="photon-button menuButtonsPrivacyButton menuButtonsPrivacyButtonsDownload"
          >
            <span className="menuButtonsPrivacyButtonsSvg menuButtonsPrivacyButtonsSvgDownload" />
            Download
          </button>
          <button
            type="button"
            className="photon-button photon-button-primary menuButtonsPrivacyButton menuButtonsPrivacyButtonsUpload"
          >
            <span className="menuButtonsPrivacyButtonsSvg menuButtonsPrivacyButtonsSvgUpload" />
            Publish
          </button>
        </div>
      </div>
    );
  };

  render() {
    const { buttonClassName, shareLabel, panelOpenEvent } = this.props;

    return (
      <ButtonWithPanel
        className={buttonClassName}
        label={shareLabel}
        panel={
          <ArrowPanel
            className="menuButtonsPrivacyPanel"
            onOpen={panelOpenEvent ? panelOpenEvent : undefined}
            content={this._renderPanelContent}
          />
        }
      />
    );
  }
}

const profileSharingOptions: ExplicitConnectOptions<
  ProfileSharingButtonOwnProps,
  ProfileSharingButtonStateProps,
  ProfileSharingButtonDispatchProps
> = {
  mapStateToProps: state => ({
    profile: getProfile(state),
    rootRange: getProfileRootRange(state),
    checkedSharingOptions: getCheckedSharingOptions(state),
    downloadSizePromise: getDownloadSize(state),
  }),
  mapDispatchToProps: { toggleCheckedSharingOptions },
  component: ProfileSharingButtonImpl,
};
export const ProfileSharingButton = explicitConnect(profileSharingOptions);

type DownloadSizeProps = {| +downloadSizePromise: Promise<string> |};

class DownloadSize extends React.PureComponent<DownloadSizeProps> {
  // Ok, this is a little odd, but there is no easy way to generate a React
  // key off of the size promise, so instead, use a memoized function to
  // increment a key generation value to generate a unique ID for each WeakMap
  // we have seen.
  //
  // See the following for more information on keyed components:
  // https://reactjs.org/blog/2018/06/07/you-probably-dont-need-derived-state.html#recommendation-fully-uncontrolled-component-with-a-key
  _keyGeneration = 0;
  _objectToNumberedKey = (_obj: Object): number => this._keyGeneration++;
  _getDownloadSizeKey = memoize(this._objectToNumberedKey, {
    cache: new WeakMap(),
  });

  render() {
    const { downloadSizePromise } = this.props;
    const key = this._getDownloadSizeKey(downloadSizePromise);
    return (
      <DownloadSizeKeyed key={key} downloadSizePromise={downloadSizePromise} />
    );
  }
}

/**
 * This class should be correctly keyed so that it never updates.
 */
class DownloadSizeKeyed extends React.PureComponent<
  DownloadSizeProps,
  {| downloadSize: string | null, isDestroyed: boolean |}
> {
  state = { downloadSize: null, isDestroyed: false };

  componentDidMount() {
    const { downloadSizePromise } = this.props;
    downloadSizePromise.then(downloadSize => {
      if (!this.state.isDestroyed) {
        this.setState({ downloadSize });
      }
    });
  }

  componentDidUpdate() {
    console.warn(
      'The DownloadSizeKeyed component should never update, the key generated was not correct.'
    );
  }

  componentWillUnmount() {
    this.setState({ isDestroyed: true });
  }

  render() {
    const { downloadSize } = this.state;
    return downloadSize === null ? null : (
      <span className="menuButtonsDownloadButton">({downloadSize})</span>
    );
  }
}
