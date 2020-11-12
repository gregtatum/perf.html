/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow
import * as React from 'react';
import { useQuery, QueryCache, ReactQueryCacheProvider } from 'react-query';

import './index.css';
import { getPerformancePlatformList } from './api';

const queryCache = new QueryCache();

function PerfTestRoot() {
  const platformList = useQuery('platformList', getPerformancePlatformList);
  const summary = useQuery('getPerformanceSummary', getPerformanceSummary);

  if (platformList.isLoading) {
    return 'Loading';
  }
  if (platformList.error) {
    return 'error';
  }

  return (
    <div className="perfTest">
      <h1>Platform List:</h1>
      {platformList.data.map(platform => (
        <div key={platform}>{platform}</div>
      ))}
    </div>
  );
}

export class PerfTest extends React.PureComponent {
  render() {
    return (
      <ReactQueryCacheProvider queryCache={queryCache}>
        <PerfTestRoot />
      </ReactQueryCacheProvider>
    );
  }
}
