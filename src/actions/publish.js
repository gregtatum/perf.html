/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow
import type { Action } from '../types/store';
import type { CheckedSharingOptions } from '../types/actions';

export const toggleCheckedSharingOptions = (
  slug: $Keys<CheckedSharingOptions>
): Action => ({
  type: 'TOGGLE_CHECKED_SHARING_OPTION',
  slug,
});
