/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow
import * as React from 'react';
import DivWithTooltip from '../shared/DivWithTooltip';
import { withSize } from '../shared/WithSize';
import {
  getStringPropertyOrNull,
  getNumberPropertyOrNull,
} from '../../utils/flow';
import { displayNiceUrl } from '../../utils';

import type { SizeProps } from '../shared/WithSize';
import type { PageList } from '../../types/profile';
import type { TracingMarker } from '../../types/profile-derived';
import type { Milliseconds } from '../../types/units';

import './VerticalIndicators.css';

type OwnProps = {|
  +verticalMarkers: TracingMarker[],
  +pages: PageList | null,
  +rangeStart: Milliseconds,
  +rangeEnd: Milliseconds,
  +zeroAt: Milliseconds,
|};

type Props = {|
  ...OwnProps,
  ...SizeProps,
|};

/**
 * This component draws vertical indicators from TracingMarkers for a track in the
 * timeline.
 */
const VerticalIndicators = ({
  verticalMarkers,
  pages,
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

        // Optionally compute a url.
        let url = null;
        const { data } = marker;
        if (pages && data) {
          const docshellId = getStringPropertyOrNull(data, 'docShellId');
          const historyId = getNumberPropertyOrNull(data, 'docshellHistoryId');
          if (docshellId) {
            const page = pages.find(
              page =>
                page.docshellId === docshellId && page.historyId === historyId
            );
            if (page) {
              url = (
                <div className="timelineVerticalIndicatorsUrl">
                  {displayNiceUrl(page.url)}
                </div>
              );
            }
          }
        }

        // Create the div with a tooltip.
        return (
          <DivWithTooltip
            key={markerIndex}
            style={{ backgroundColor, left }}
            className="timelineVerticalIndicatorsLine"
            tooltip={
              <>
                <div>
                  <span
                    className="timelineVerticalIndicatorsSwatch"
                    style={{ backgroundColor }}
                  />{' '}
                  {marker.name}
                  <span className="timelineVerticalIndicatorsDim">
                    {' at '}
                  </span>
                  <span className="timelineVerticalIndicatorsTime">
                    {_getFormattedTime(marker.start - zeroAt)}
                  </span>{' '}
                </div>
                {url}
              </>
            }
          />
        );
      })}
    </div>
  );
};

function _getFormattedTime(length: number): string {
  return `${(length / 1000).toFixed(3)}s`;
}

// The withSize type coercion is not happening correctly.
export default (withSize(VerticalIndicators): React.ComponentType<OwnProps>);
