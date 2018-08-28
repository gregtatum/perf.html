/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow
import * as React from 'react';
import classNames from 'classnames';
import { timeCode } from '../../utils/time-code';
import { withSize } from '../shared/WithSize';
import Tooltip from '../shared/Tooltip';
import MarkerTooltipContents from '../shared/MarkerTooltipContents';
import {
  styles,
  overlayFills,
} from '../../profile-logic/interval-marker-styles';
import explicitConnect from '../../utils/connect';
import {
  selectorsForThread,
  getPreviewSelection,
} from '../../reducers/profile-view';
import { getSelectedThreadIndex } from '../../reducers/url-state';
import './Markers.css';

import type { MarkerPayload } from '../../types/markers';
import type { MarkersTableByType } from '../../types/profile-derived';
import type { Milliseconds, CssPixels } from '../../types/units';
import type { SizeProps } from '../shared/WithSize';
import type {
  ExplicitConnectOptions,
  ConnectedProps,
} from '../../utils/connect';
import type { ThreadIndex, IndexIntoMarkersTable } from '../../types/profile';

type MarkerState = 'PRESSED' | 'HOVERED' | 'NONE';

/**
 * The TimelineMarkers component is built up of several nested components,
 * and they are all collected in this file. In pseudo-code, they take
 * the following forms:
 *
 * export const TimelineJankMarkers = (
 *  <WithSize>
 *    <Connect markers={JankMarkers}>
 *      <TimelineMarkers />
 *    </Connect>
 *  </WithSize>
 * );
 *
 * export const TimelineOverviewMarkers = (
 *   <WithSize>
 *     <Connect markers={AllMarkers}>
 *       <TimelineMarkers />
 *     </Connect>
 *   </WithSize>
 * );
 */

export type OwnProps = {|
  +className: string,
  +rangeStart: Milliseconds,
  +rangeEnd: Milliseconds,
  +threadIndex: ThreadIndex,
  +onSelect: any,
  ...SizeProps,
|};

export type StateProps<Payload> = {|
  +markers: MarkersTableByType<Payload>,
  +isSelected: boolean,
  +styles: any,
  +overlayFills: {
    +HOVERED: string,
    +PRESSED: string,
  },
  +isModifyingSelection: boolean,
|};

type Props<Payload> = ConnectedProps<SizeProps, OwnProps, StateProps<Payload>>;

type State = {
  hoveredItem: IndexIntoMarkersTable | null,
  mouseDownItem: IndexIntoMarkersTable | null,
  mouseX: CssPixels,
  mouseY: CssPixels,
};

class TimelineMarkers<Payload> extends React.PureComponent<
  Props<Payload>,
  State
> {
  _canvas: HTMLCanvasElement | null = null;
  _requestedAnimationFrame: boolean = false;
  state = {
    hoveredItem: null,
    mouseDownItem: null,
    mouseX: 0,
    mouseY: 0,
  };

  _takeCanvasRef = (c: HTMLCanvasElement | null) => {
    this._canvas = c;
  };

  _scheduleDraw() {
    window.requestAnimationFrame(() => {
      const c = this._canvas;
      if (c) {
        timeCode('IntervalMarkerTimeline render', () => {
          this.drawCanvas(c);
        });
      }
    });
  }

  _hitTest(e): IndexIntoMarkersTable | null {
    const c = this._canvas;
    if (c === null) {
      return null;
    }

    const r = c.getBoundingClientRect();
    const { width, rangeStart, rangeEnd, markers, styles } = this.props;
    const x = e.pageX - r.left;
    const y = e.pageY - r.top;
    const time = rangeStart + x / width * (rangeEnd - rangeStart);

    // Markers are drawn in array order; the one drawn last is on top. So if
    // there are multiple markers under the mouse, we want to find the one
    // with the highest array index. So we walk the list of intervalMarkers
    // from high index to low index, which is front to back in z-order.
    for (
      let markerIndex = markers.length - 1;
      markerIndex >= 0;
      markerIndex--
    ) {
      const startTime = markers.startTime[markerIndex];
      const duration = markers.duration[markerIndex];
      const name = markers.name[markerIndex];
      if (
        duration === null ||
        time < startTime ||
        time >= startTime + duration
      ) {
        continue;
      }
      const style = name in styles ? styles[name] : styles.default;
      if (y >= style.top && y < style.top + style.height) {
        return markerIndex;
      }
    }
    return null;
  }

  _onMouseMove = (event: SyntheticMouseEvent<>) => {
    const hoveredItem = this._hitTest(event);
    if (hoveredItem !== null) {
      this.setState({
        hoveredItem,
        mouseX: event.pageX,
        mouseY: event.pageY,
      });
    } else if (this.state.hoveredItem !== null) {
      this.setState({
        hoveredItem: null,
      });
    }
  };

  _onMouseDown = e => {
    const mouseDownItem = this._hitTest(e);
    this.setState({ mouseDownItem });
    if (mouseDownItem !== null) {
      if (e.target.setCapture) {
        e.target.setCapture();
      }
      e.stopPropagation();
    }
  };

  _onMouseUp = e => {
    const { mouseDownItem } = this.state;
    if (mouseDownItem !== null) {
      const mouseUpItem = this._hitTest(e);
      if (
        mouseDownItem === mouseUpItem &&
        mouseUpItem !==
          null /* extra null check because flow doesn't realize it's unnecessary */
      ) {
        const { onSelect, threadIndex, markers } = this.props;
        const startTime = markers.startTime[mouseUpItem];
        const duration = markers.duration[mouseUpItem];
        if (duration !== null) {
          onSelect(threadIndex, startTime, startTime + duration);
        }
      }
      this.setState({
        hoveredItem: mouseUpItem,
        mouseDownItem: null,
      });
    }
  };

  _onMouseOut = () => {
    this.setState({
      hoveredItem: null,
    });
  };

  componentDidUpdate(prevProps: Props<Payload>, prevState: State) {
    if (
      prevProps !== this.props ||
      prevState.hoveredItem !== this.state.hoveredItem
    ) {
      this._scheduleDraw();
    }
  }

  render() {
    const {
      className,
      markers,
      isSelected,
      isModifyingSelection,
      threadIndex,
    } = this.props;

    const { mouseDownItem, hoveredItem, mouseX, mouseY } = this.state;
    const shouldShowTooltip = !isModifyingSelection && !mouseDownItem;

    return (
      <div className={classNames(className, isSelected ? 'selected' : null)}>
        <canvas
          className="timelineMarkersCanvas"
          ref={this._takeCanvasRef}
          onMouseDown={this._onMouseDown}
          onMouseMove={this._onMouseMove}
          onMouseUp={this._onMouseUp}
          onMouseOut={this._onMouseOut}
        />
        {shouldShowTooltip && hoveredItem ? (
          <Tooltip mouseX={mouseX} mouseY={mouseY}>
            <MarkerTooltipContents
              markerIndex={hoveredItem}
              markers={markers}
              threadIndex={threadIndex}
            />
          </Tooltip>
        ) : null}
      </div>
    );
  }

  _drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: CssPixels,
    y: CssPixels,
    width: CssPixels,
    height: CssPixels,
    cornerSize: CssPixels
  ) {
    // Cut out c x c -sized squares in the corners.
    const c = Math.min(width / 2, Math.min(height / 2, cornerSize));
    const bottom = y + height;
    ctx.fillRect(x + c, y, width - 2 * c, c);
    ctx.fillRect(x, y + c, width, height - 2 * c);
    ctx.fillRect(x + c, bottom - c, width - 2 * c, c);
  }

  drawCanvas(c: HTMLCanvasElement) {
    const {
      rangeStart,
      rangeEnd,
      width,
      markers,
      styles,
      overlayFills,
    } = this.props;

    const devicePixelRatio = c.ownerDocument
      ? c.ownerDocument.defaultView.devicePixelRatio
      : 1;
    const height = c.getBoundingClientRect().height;
    const pixelWidth = Math.round(width * devicePixelRatio);
    const pixelHeight = Math.round(height * devicePixelRatio);

    if (c.width !== pixelWidth || c.height !== pixelHeight) {
      c.width = pixelWidth;
      c.height = pixelHeight;
    }
    const ctx = c.getContext('2d');
    if (ctx === null || ctx === undefined) {
      return;
    }

    ctx.clearRect(0, 0, pixelWidth, pixelHeight);
    ctx.scale(devicePixelRatio, devicePixelRatio);

    for (let markerIndex = 0; markerIndex < markers.length; markerIndex++) {
      const startTime = markers.startTime[markerIndex];
      const duration = markers.duration[markerIndex];
      const name = markers.name[markerIndex];
      if (duration === null) {
        // Only draw markers with a duration.
        continue;
      }
      const pos = (startTime - rangeStart) / (rangeEnd - rangeStart) * width;
      const itemWidth = Number.isFinite(duration)
        ? duration / (rangeEnd - rangeStart) * width
        : Number.MAX_SAFE_INTEGER;
      const style = name in styles ? styles[name] : styles.default;
      ctx.fillStyle = style.background;
      if (style.squareCorners) {
        ctx.fillRect(pos, style.top, itemWidth, style.height);
      } else {
        this._drawRoundedRect(
          ctx,
          pos,
          style.top,
          itemWidth,
          style.height,
          1 / devicePixelRatio
        );
      }
      if (style.borderLeft !== null) {
        ctx.fillStyle = style.borderLeft;
        ctx.fillRect(pos, style.top, 1, style.height);
      }
      if (style.borderRight !== null) {
        ctx.fillStyle = style.borderRight;
        ctx.fillRect(pos + itemWidth - 1, style.top, 1, style.height);
      }
      const markerState = this._getMarkerState(markerIndex);
      if (markerState === 'HOVERED' || markerState === 'PRESSED') {
        ctx.fillStyle = overlayFills[markerState];
        if (style.squareCorners) {
          ctx.fillRect(pos, style.top, itemWidth, style.height);
        } else {
          this._drawRoundedRect(
            ctx,
            pos,
            style.top,
            itemWidth,
            style.height,
            1 / devicePixelRatio
          );
        }
      }
    }
    ctx.scale(1 / devicePixelRatio, 1 / devicePixelRatio);
  }

  _getMarkerState(marker: IndexIntoMarkersTable): MarkerState {
    const { hoveredItem, mouseDownItem } = this.state;
    if (mouseDownItem !== null) {
      if (marker === mouseDownItem && marker === hoveredItem) {
        return 'PRESSED';
      }
      return 'NONE';
    }
    if (marker === hoveredItem) {
      return 'HOVERED';
    }
    return 'NONE';
  }
}

/**
 * Create a special connected component for Jank instances.
 */
const jankOptions: ExplicitConnectOptions<OwnProps, StateProps<null>, {||}> = {
  mapStateToProps: (state, props) => {
    const { threadIndex } = props;
    const selectors = selectorsForThread(threadIndex);
    const selectedThread = getSelectedThreadIndex(state);

    return {
      markers: selectors.getJankMarkers(state),
      isSelected: threadIndex === selectedThread,
      styles: styles,
      overlayFills: overlayFills,
      isModifyingSelection: getPreviewSelection(state).isModifying,
    };
  },
  component: TimelineMarkers,
};

export const TimelineJankMarkers = withSize(explicitConnect(jankOptions));

/**
 * Create a connected component for an overview of the markers.
 */
const markerOptions: ExplicitConnectOptions<
  OwnProps,
  StateProps<MarkerPayload>,
  {||}
> = {
  mapStateToProps: (state, props) => {
    const { threadIndex } = props;
    const selectors = selectorsForThread(threadIndex);
    const selectedThread = getSelectedThreadIndex(state);
    const markers = selectors.getRangeFilteredMarkersForHeader(state);
    return {
      markers,
      isSelected: threadIndex === selectedThread,
      styles,
      overlayFills,
      isModifyingSelection: getPreviewSelection(state).isModifying,
    };
  },
  component: TimelineMarkers,
};

export const TimelineOverviewMarkers = withSize(explicitConnect(markerOptions));
