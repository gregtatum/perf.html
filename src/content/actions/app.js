/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow
import type { Action } from './types';
import type { Component } from 'react';

export function changeSelectedTab(selectedTab: string): Action {
  return {
    type: 'CHANGE_SELECTED_TAB',
    selectedTab,
  };
}

export function profilePublished(hash: string): Action {
  return {
    type: 'PROFILE_PUBLISHED',
    hash,
  };
}

export function changeTabOrder(tabOrder: number[]): Action {
  return {
    type: 'CHANGE_TAB_ORDER',
    tabOrder,
  };
}

export function changeTooltipHoveredItem(component: Component<any, any, any>): Action {
  return {
    type: 'TOOLTIP_HOVER_ITEM_CHANGED',
    component,
  };
}

export function changeTooltipCoordinates(coordinates: [CssPixels, CssPixels]): Action {
  return {
    type: 'TOOLTIP_COORDINATES_CHANGED',
    coordinates,
  };
}
