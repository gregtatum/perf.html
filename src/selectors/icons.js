/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow
import { createSelector } from 'reselect';
import type { IconWithClassName, IconState } from '../types/state';
import type { Selector, NonMemoizedSelector1 } from '../types/store';
import type { CallNodeDisplayData } from '../types/profile-derived';

/**
 * A simple selector into the icon state.
 */
export const getIcons: Selector<IconState> = state => state.icons;

/**
 * In order to load icons without multiple requests, icons are created through
 * CSS. This functions gets the CSS class name for a call node
 */
export const getIconClassNameForCallNode: NonMemoizedSelector1<
  string,
  CallNodeDisplayData
> = (state, displayData) => {
  const icons = getIcons(state);
  return displayData.icon !== null && icons.has(displayData.icon)
    ? _classNameFromUrl(displayData.icon)
    : '';
};

/**
 * This functions returns an object with both the icon URL and the class name.
 */
export const getIconsWithClassNames: Selector<
  IconWithClassName[]
> = createSelector(getIcons, icons =>
  [...icons].map(icon => ({ icon, className: _classNameFromUrl(icon) }))
);

/**
 * Transforms a URL into a valid CSS class name.
 */
function _classNameFromUrl(url): string {
  return url.replace(/[/:.+>< ~()#,]/g, '_');
}
