/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow

import {
  BLUE_40,
  BLUE_60,
  GREEN_60,
  GREY_20,
  GREY_30,
  ORANGE_50,
  PURPLE_70,
  YELLOW_50,
  MAGENTA_60,
} from 'photon-colors';

type ColorStyles = {|
  +selectedFillStyle: string,
  +unselectedFillStyle: string,
  +selectedTextColor: string,
  +gravity: number,
|};

/**
 * Map a color name, which comes from Gecko, into a CSS style color. These colors cannot
 * be changed without considering the values coming from Gecko, and from old profiles
 * that already have their category colors saved into the profile.
 *
 * Category color names come from:
 * https://searchfox.org/mozilla-central/rev/0b8ed772d24605d7cb44c1af6d59e4ca023bd5f5/tools/profiler/core/platform.cpp#1593-1627
 */
export function mapCategoryColorNameToStyles(colorName: string): ColorStyles {
  switch (colorName) {
    case 'transparent':
      return {
        selectedFillStyle: 'transparent',
        unselectedFillStyle: 'transparent',
        selectedTextColor: '#000',
        gravity: 0,
      };
    case 'purple':
      return {
        selectedFillStyle: PURPLE_70,
        // Colors are assumed to have the form #RRGGBB, so concatenating 2 more digits to
        // the end defines the transparency #RRGGBBAA.
        unselectedFillStyle: PURPLE_70 + '60',
        selectedTextColor: '#fff',
        gravity: 5,
      };
    case 'green':
      return {
        selectedFillStyle: GREEN_60,
        unselectedFillStyle: GREEN_60 + '60',
        selectedTextColor: '#fff',
        gravity: 4,
      };
    case 'orange':
      return {
        selectedFillStyle: ORANGE_50,
        unselectedFillStyle: ORANGE_50 + '60',
        selectedTextColor: '#fff',
        gravity: 2,
      };
    case 'yellow':
      return {
        selectedFillStyle: YELLOW_50,
        unselectedFillStyle: YELLOW_50 + '60',
        selectedTextColor: '#000',
        gravity: 6,
      };
    case 'lightblue':
      return {
        selectedFillStyle: BLUE_40,
        unselectedFillStyle: BLUE_40 + '60',
        selectedTextColor: '#000',
        gravity: 1,
      };
    case 'grey':
      return {
        selectedFillStyle: GREY_30,
        unselectedFillStyle: GREY_30 + '60',
        selectedTextColor: '#000',
        gravity: 8,
      };
    case 'blue':
      return {
        selectedFillStyle: BLUE_60,
        unselectedFillStyle: BLUE_60 + '60',
        selectedTextColor: '#fff',
        gravity: 3,
      };
    case 'brown':
      return {
        selectedFillStyle: MAGENTA_60,
        unselectedFillStyle: MAGENTA_60 + '60',
        selectedTextColor: '#fff',
        gravity: 7,
      };
    default:
      console.error(
        `Unknown color name '${colorName}' encountered. Consider updating this code to handle it.`
      );
      return {
        selectedFillStyle: GREY_30,
        unselectedFillStyle: GREY_30 + '60',
        selectedTextColor: '#000',
        gravity: 8,
      };
  }
}

/**
 * This function tweaks the colors for the stack chart, but re-uses most
 * of the logic from `mapCategoryColorNameToStyles`.
 */
export function mapCategoryColorNameToStackChartStyles(
  colorName: string
): ColorStyles {
  if (colorName === 'transparent') {
    return {
      selectedFillStyle: GREY_30,
      unselectedFillStyle: GREY_20 + '60',
      selectedTextColor: '#000',
      gravity: 8,
    };
  }
  return mapCategoryColorNameToStyles(colorName);
}
