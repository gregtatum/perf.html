/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow

import * as React from 'react';
import explicitConnect from '../../../utils/connect';
import { getProfile, getProfileRootRange } from '../../../selectors/profile';
import { getDataSource } from '../../../selectors/url-state';
import { MenuButtonsMetaInfo } from './MetaInfo';
import { MenuButtonsPublish } from './Publish';
import { MenuButtonsPermalink } from './Permalink';
import { ProfileDownloadButton } from './Download';
import { assertExhaustiveCheck } from '../../../utils/flow';

import type { StartEndRange } from '../../../types/units';
import type { Profile } from '../../../types/profile';
import type { DataSource } from '../../../types/actions';
import type {
  ExplicitConnectOptions,
  ConnectedProps,
} from '../../../utils/connect';

require('./index.css');

type StateProps = {|
  +profile: Profile,
  +rootRange: StartEndRange,
  +dataSource: DataSource,
|};

type Props = ConnectedProps<{||}, StateProps, {||}>;

const MenuButtons = ({ profile, rootRange, dataSource }: Props) => (
  <>
    {/* Place the info button outside of the menu buttons to allow it to shrink. */}
    <MenuButtonsMetaInfo profile={profile} />
    <div className="menuButtons">
      <PublishOrPermalinkButtons dataSource={dataSource} />
      <ProfileDownloadButton profile={profile} rootRange={rootRange} />
      <a
        href="/docs/"
        target="_blank"
        className="menuButtonsLink"
        title="Open the documentation in a new window"
      >
        Docs…
      </a>
    </div>
  </>
);

const PublishOrPermalinkButtons = ({ dataSource }) => {
  switch (dataSource) {
    case 'from-addon':
    case 'from-file':
    case 'local':
      return <MenuButtonsPublish />;
    case 'public':
    case 'from-url':
    case 'compare':
      return <MenuButtonsPermalink />;
    case 'none':
      return null;
    default:
      throw assertExhaustiveCheck(dataSource);
  }
};

const options: ExplicitConnectOptions<{||}, StateProps, {||}> = {
  mapStateToProps: state => ({
    profile: getProfile(state),
    rootRange: getProfileRootRange(state),
    dataSource: getDataSource(state),
  }),
  component: MenuButtons,
};
export default explicitConnect(options);
