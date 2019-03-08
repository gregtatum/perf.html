/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow

import * as React from 'react';
import classNames from 'classnames';
import {
  toggleCheckedSharingOptions,
  attemptToPublish,
} from '../../../actions/publish';
import { getProfile, getProfileRootRange } from '../../../selectors/profile';
import {
  getCheckedSharingOptions,
  getFilenameString,
  getDownloadSize,
  getCompressedProfileBlobUrl,
  getSanitizedProfileGeneration,
} from '../../../selectors/publish';

import explicitConnect, {
  type ExplicitConnectOptions,
  type ConnectedProps,
} from '../../../utils/connect';

import type { Profile } from '../../../types/profile';
import type { CheckedSharingOptions } from '../../../types/actions';
import type { StartEndRange } from '../../../types/units';

require('./Publish.css');

export class MenuButtonsPublish extends React.PureComponent<
  {},
  {| isMounted: boolean |}
> {
  state = {
    isMounted: false,
  };

  componentWillMount() {
    this.setState({ isMounted: true });
  }

  render() {
    const { isMounted } = this.state;

    if (!isMounted) {
      // Mounting this panel can be expensive, as it fully compresses the profile in
      // preparation for download, and for computing the download size. Do not run
      // the connected component selectors unless needed.
      return null;
    }

    return <MenuButtonsPublishConnected />;
  }
}

type OwnProps = {||};

type StateProps = {|
  +profile: Profile,
  +rootRange: StartEndRange,
  +checkedSharingOptions: CheckedSharingOptions,
  +downloadSizePromise: Promise<string>,
  +compressedProfileBlobUrlPromise: Promise<string>,
  +sanitizedProfileGeneration: number,
  +downloadFileName: string,
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

  render() {
    const {
      checkedSharingOptions,
      downloadSizePromise,
      attemptToPublish,
      downloadFileName,
      compressedProfileBlobUrlPromise,
      sanitizedProfileGeneration,
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
            <DownloadSize
              key={sanitizedProfileGeneration}
              downloadSizePromise={downloadSizePromise}
            />
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
          <DownloadButton
            key={sanitizedProfileGeneration}
            downloadFileName={downloadFileName}
            compressedProfileBlobUrlPromise={compressedProfileBlobUrlPromise}
          />
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
    downloadFileName: getFilenameString(state),
    compressedProfileBlobUrlPromise: getCompressedProfileBlobUrl(state),
    sanitizedProfileGeneration: getSanitizedProfileGeneration(state),
  }),
  mapDispatchToProps: { toggleCheckedSharingOptions, attemptToPublish },
  component: MenuButtonsPublishImpl,
};
const MenuButtonsPublishConnected = explicitConnect(profileSharingOptions);

type DownloadSizeProps = {| +downloadSizePromise: Promise<string> |};

/**
 * This class should be correctly keyed so that it never updates.
 */
class DownloadSize extends React.PureComponent<
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
    if (downloadSize === null) {
      return null;
    }
    return <span className="menuButtonsDownloadButton">({downloadSize})</span>;
  }
}

type DownloadButtonProps = {|
  +compressedProfileBlobUrlPromise: Promise<string>,
  +downloadFileName: string,
|};

/**
 * This class should be correctly keyed so that it never updates.
 */
class DownloadButton extends React.PureComponent<
  DownloadButtonProps,
  {| compressedProfileBlobUrl: string | null, isDestroyed: boolean |}
> {
  state = { compressedProfileBlobUrl: null, isDestroyed: false };

  componentDidMount() {
    const { compressedProfileBlobUrlPromise } = this.props;
    compressedProfileBlobUrlPromise.then(compressedProfileBlobUrl => {
      if (!this.state.isDestroyed) {
        this.setState({ compressedProfileBlobUrl });
      }
    });
  }

  componentDidUpdate() {
    console.warn(
      'The DownloadButtonKeyed component should never update, the key generated was not correct.'
    );
  }

  componentWillUnmount() {
    this.setState({ isDestroyed: true });
  }

  render() {
    const { downloadFileName } = this.props;
    const { compressedProfileBlobUrl } = this.state;
    const className =
      'photon-button menuButtonsPrivacyButton menuButtonsPrivacyButtonsDownload';

    if (compressedProfileBlobUrl) {
      return (
        // This component must be an <a> rather than a <button> as the download attribute
        // allows users to download the profile.
        <a
          type="button"
          href={compressedProfileBlobUrl}
          download={`${downloadFileName}.gz`}
          className={className}
        >
          <span className="menuButtonsPrivacyButtonsSvg menuButtonsPrivacyButtonsSvgDownload" />
          Download
        </a>
      );
    }

    return (
      // This component must be an <a> rather than a <button> as the download attribute
      // allows users to download the profile.
      <a type="button" href="#" className={classNames(className, 'disabled')}>
        Compressing…
      </a>
    );
  }
}
