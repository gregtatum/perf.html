/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow

import { PureComponent } from 'react';
import explicitConnect from '../../utils/connect';

import {
  getProfile,
  getProfileNameOrNull,
  getDataSource,
  getFileName,
} from 'firefox-profiler/selectors';
import {
  formatProductAndVersion,
  formatPlatform,
} from '../../profile-logic/profile-metainfo';

import type { Profile, DataSource } from 'firefox-profiler/types';
import type { ConnectedProps } from '../../utils/connect';
import { assertExhaustiveCheck } from '../../utils/flow';

type StateProps = {|
  +profile: Profile,
  +profileName: string | null,
  +dataSource: DataSource,
  +fileName: string | null,
|};

type Props = ConnectedProps<{||}, StateProps, {||}>;

const SEPARATOR = ' – ';
const PRODUCT = 'Firefox Profiler';

class WindowTitle extends PureComponent<Props> {
  // This component updates window title in the form of:
  // profile name - version - platform - date time - data source - 'Firefox Profiler'
  _updateTitle() {
    const { profile, profileName, dataSource, fileName } = this.props;
    const { meta } = profile;
    let title;

    if (profileName) {
      title = profileName + SEPARATOR + PRODUCT;
    } else {
      // If there is no profile name set, then generate a new one.
      title = formatProductAndVersion(meta) + SEPARATOR;
      const os = formatPlatform(meta);
      if (os) {
        title += os + SEPARATOR;
      }
      title += _formatDateTime(meta.startTime);
      title += SEPARATOR + PRODUCT;
    }

    switch (dataSource) {
      case 'from-addon':
        title = `(unpublished) ${title}`;
        break;
      case 'public':
      case 'none':
      case 'from-url':
      case 'local':
        // Do nothing.
        break;
      case 'from-file':
        if (!fileName) {
          throw new Error(
            'If loading a data source from file, then the file name should be set.'
          );
        }
        title = `(${fileName}) ${title}`;
        break;
      case 'compare':
        title = `(compare) ${title}`;
        break;
      case 'uploaded-recordings':
        throw new Error(
          `The data source "${dataSource}" is not supported by the WindowTitle`
        );
      default:
        throw assertExhaustiveCheck(
          dataSource,
          `Unknown dataSource ${dataSource}.`
        );
    }

    document.title = title;
  }

  componentDidMount() {
    this._updateTitle();
  }

  componentDidUpdate() {
    this._updateTitle();
  }

  render() {
    return null;
  }
}

function _formatDateTime(timestamp: number): string {
  const dateTimeLabel = new Date(timestamp).toLocaleString(undefined, {
    timeZone: 'UTC',
    timeZoneName: 'short',
  });

  return dateTimeLabel;
}

export default explicitConnect<{||}, StateProps, {||}>({
  mapStateToProps: state => ({
    profileName: getProfileNameOrNull(state),
    profile: getProfile(state),
    dataSource: getDataSource(state),
    fileName: getFileName(state),
  }),
  component: WindowTitle,
});
