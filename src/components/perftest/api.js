/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow
import { useQuery, QueryCache, ReactQueryCacheProvider } from 'react-query';

// https://treeherder.mozilla.org/api/project/mozilla-central/performance/platforms/?interval=31536000&framework=1
type PerformancePlatformList = string[];

export async function getPerformancePlatformList(): Promise<PerformancePlatformList> {
  const platformList = await fetch(
    'https://treeherder.mozilla.org/api/project/mozilla-central/performance/platforms/?interval=31536000&framework=1'
  );
  return platformList.json();
}

type SignatureId = number;

type PerformanceSummaryData = $ReadOnly<{|
  +job_id: null,
  +id: number, // 972180776,
  +value: number, // 0.7743939684432766,
  +push_timestamp: string, // '2019-11-13T22:21:29',
  +push_id: number, // 590765,
  +revision: string, // 'b42b424565738fdf7dd1edaddf73bda03df040f5',
|}>;

type PerformanceSummary = $ReadOnly<{|
  signature_id: SignatureId,
  framework_id: 1,
  signature_hash: string, // '8ea751b7e2ca668502db13a03a1450bbbb3d56ba',
  platform: string, // 'windows10-64-shippable-qr',
  test: string, // '',
  suite: string, //'tscrollx',
  lower_is_better: boolean,
  has_subtests: boolean,
  tags: string,
  values: [],
  name: string, // 'tscrollx opt e10s stylo'
  parent_signature: null,
  job_ids: [],
  repository_name: string, // 'autoland'
  repository_id: number, // 77,
  data: PerformanceSummaryData[],
|}>;

export async function getPerformanceSummary(): Promise<PerformanceSummary> {
  const response = await fetch(
    'http://treeherder.mozilla.org/api/performance/summary/?repository=autoland&signature=1927519&framework=1&interval=31536000&all_data=true'
  );
  return response.json();
}
