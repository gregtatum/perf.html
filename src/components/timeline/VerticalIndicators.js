/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow
import React from 'react';
import DivWithTooltip from '../shared/DivWithTooltip';
import { withSize } from '../shared/WithSize';

import type { SizeProps } from '../shared/WithSize';
import type { TracingMarker } from '../../types/profile-derived';
import type { Milliseconds } from '../../types/units';

import './VerticalIndicators.css';

type Props = {|
  +verticalMarkers: TracingMarker[],
  +rangeStart: Milliseconds,
  +rangeEnd: Milliseconds,
  +zeroAt: Milliseconds,
  ...SizeProps,
|};

/**
 * This component draws vertical indicators from TracingMarkers for a track in the
 * timeline.
 */
const VerticalIndicators = ({
  verticalMarkers,
  rangeStart,
  rangeEnd,
  zeroAt,
  width,
}: Props) => {
  return (
    <div
      className="timelineVerticalIndicators"
      key={`${rangeStart}-${rangeEnd}`}
    >
      {verticalMarkers.map((marker, markerIndex) => {
        // Decide on the indicator color.
        let backgroundColor;
        switch (marker.name) {
          case 'Navigation::Start':
            backgroundColor = 'var(--grey-40)';
            break;
          case 'Load':
            backgroundColor = 'var(--red-60)';
            break;
          case 'DOMContentLoaded':
            backgroundColor = 'var(--blue-50)';
            break;
          default:
            if (marker.name.startsWith('Contentful paint ')) {
              backgroundColor = 'var(--green-60)';
            }
        }

        // Compute the positioning
        const rangeLength = rangeEnd - rangeStart;
        const xPixelsPerMs = width / rangeLength;
        const left = (marker.start - rangeStart) * xPixelsPerMs;

        // Create the div with a tooltip.
        return (
          <DivWithTooltip
            key={markerIndex}
            style={{ backgroundColor, left }}
            className="timelineVerticalIndicatorsLine"
            tooltip={
              <span>
                <span
                  className="timelineVerticalIndicatorsSwatch"
                  style={{ backgroundColor }}
                />{' '}
                <span className="timelineVerticalIndicatorsTime">
                  {_getFormattedTime(marker.start - zeroAt)}
                </span>{' '}
                {marker.name}
              </span>
            }
          />
        );
      })}
    </div>
  );
};

function _getFormattedTime(length: number): string {
  return `${(length / 1000).toFixed(1)}s`;
}

export default withSize(VerticalIndicators);
