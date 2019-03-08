/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow

import * as React from 'react';
import memoize from 'memoize-immutable';
import classNames from 'classnames';
import {
  toggleCheckedSharingOptions,
  attemptToPublish,
} from '../../../actions/publish';
import ArrowPanel from '../../shared/ArrowPanel';
import ButtonWithPanel from '../../shared/ButtonWithPanel';
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
import type { CheckedSharingOptions } from '../../../types/actions';
import type { StartEndRange } from '../../../types/units';

require('./Publish.css');

type OwnProps = {||};

type StateProps = {|
  +profile: Profile,
  +rootRange: StartEndRange,
  +checkedSharingOptions: CheckedSharingOptions,
  +downloadSizePromise: Promise<string>,
|};

type DispatchProps = {|
  toggleCheckedSharingOptions: typeof toggleCheckedSharingOptions,
  attemptToPublish: typeof attemptToPublish,
|};

type PublishProps = ConnectedProps<OwnProps, StateProps, DispatchProps>;

class MenuButtonsPublishImpl extends React.PureComponent<PublishProps> {
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
    const {
      checkedSharingOptions,
      downloadSizePromise,
      attemptToPublish,
    } = this.props;

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
            onClick={attemptToPublish}
          >
            <span className="menuButtonsPrivacyButtonsSvg menuButtonsPrivacyButtonsSvgUpload" />
            Publish
          </button>
        </div>
      </div>
    );
  };

  render() {
    return (
      <ButtonWithPanel
        className="menuButtonsShareButton"
        label="Share…"
        panel={
          <ArrowPanel
            className="menuButtonsPrivacyPanel"
            content={this._renderPanelContent}
          />
        }
      />
    );
  }
}

const profileSharingOptions: ExplicitConnectOptions<
  OwnProps,
  StateProps,
  DispatchProps
> = {
  mapStateToProps: state => ({
    profile: getProfile(state),
    rootRange: getProfileRootRange(state),
    checkedSharingOptions: getCheckedSharingOptions(state),
    downloadSizePromise: getDownloadSize(state),
  }),
  mapDispatchToProps: { toggleCheckedSharingOptions, attemptToPublish },
  component: MenuButtonsPublishImpl,
};
export const MenuButtonsPublish = explicitConnect(profileSharingOptions);

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
