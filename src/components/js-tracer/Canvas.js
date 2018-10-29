/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow
import { GREY_20 } from 'photon-colors';
import * as React from 'react';
import classNames from 'classnames';
import {
  TIMELINE_MARGIN_LEFT,
  TIMELINE_MARGIN_RIGHT,
} from '../../app-logic/constants';
import {
  withChartViewport,
  type WithChartViewport,
} from '../shared/chart/Viewport';
import ChartCanvas from '../shared/chart/Canvas';
import TextMeasurement from '../../utils/text-measurement';
import { updatePreviewSelection } from '../../actions/profile-view';
import { BLUE_40 } from '../../utils/colors';

import type {
  Milliseconds,
  CssPixels,
  UnitIntervalOfProfileRange,
} from '../../types/units';
import type {
  ThreadIndex,
  IndexIntoJsTracerEvents,
  JsTracerTable,
} from '../../types/profile';
import type { JsTracerTiming } from '../../types/profile-derived';
import type { Viewport } from '../shared/chart/Viewport';

type DrawingInformation = {
  x: CssPixels,
  y: CssPixels,
  w: CssPixels,
  h: CssPixels,
  uncutWidth: CssPixels,
  text: string,
};

type OwnProps = {|
  +rangeStart: Milliseconds,
  +rangeEnd: Milliseconds,
  +jsTracerTimingRows: JsTracerTiming[],
  +jsTracerTable: JsTracerTable,
  +rowHeight: CssPixels,
  +threadIndex: ThreadIndex,
  +updatePreviewSelection: typeof updatePreviewSelection,
|};

type Props = {|
  ...OwnProps,
  // Bring in the viewport props from the higher order Viewport component.
  +viewport: Viewport,
|};

type State = {|
  // hoveredItem: null | number,
  hasFirstDraw: boolean,
|};

const TEXT_OFFSET_TOP = 11;
const TEXT_OFFSET_START = 3;

class JsTracerCanvas extends React.PureComponent<Props, State> {
  _textMeasurement: null | TextMeasurement;
  _previousFillColor: null | string = null;
  state: State = {
    hasFirstDraw: false,
  };

  /**
   * Most of the draw calls are tiny tiny boxes, so it takes too long to split up the
   * draw calls into multiple passes. It turns out that we are mostly drawing the same
   * color boxes over and over. This method makes sure we only set the fillStyle once
   * we actually change the value. This saves a lot of processing time on computing the
   * CSS color in the CanvasRenderingContext2D.
   */
  _setFillStyle(ctx: CanvasRenderingContext2D, fillStyle: string) {
    if (fillStyle !== this._previousFillColor) {
      ctx.fillStyle = fillStyle;
      this._previousFillColor = fillStyle;
    }
  }

  drawCanvas = (
    ctx: CanvasRenderingContext2D,
    hoveredItem: IndexIntoJsTracerEvents | null
  ) => {
    const {
      rowHeight,
      jsTracerTimingRows,
      viewport: {
        viewportTop,
        viewportBottom,
        containerWidth,
        containerHeight,
      },
    } = this.props;

    // Invalidate the previously cached fillStyle.
    this._previousFillColor = null;

    // Convert CssPixels to Stack Depth
    const startRow = Math.floor(viewportTop / rowHeight);
    const endRow = Math.min(
      Math.ceil(viewportBottom / rowHeight),
      jsTracerTimingRows.length
    );

    this._setFillStyle(ctx, '#ffffff');
    ctx.fillRect(0, 0, containerWidth, containerHeight);

    this.drawEvents(ctx, hoveredItem, startRow, endRow);
    this.drawSeparatorsAndLabels(ctx, startRow, endRow);

    if (!this.state.hasFirstDraw) {
      this.setState({ hasFirstDraw: true });
    }
  };

  // Note: we used a long argument list instead of an object parameter on
  // purpose, to reduce GC pressure while drawing.
  drawOneEvent(
    ctx: CanvasRenderingContext2D,
    x: CssPixels,
    y: CssPixels,
    w: CssPixels,
    h: CssPixels,
    uncutWidth: CssPixels,
    text: string,
    backgroundColor: string = BLUE_40,
    foregroundColor: string = 'white'
  ) {
    this._setFillStyle(ctx, backgroundColor);

    const textMeasurement = this._getTextMeasurement(ctx);

    if (uncutWidth >= 1) {
      ctx.fillRect(x, y + 1, w, h - 2);

      // Draw the text label
      // TODO - L10N RTL.
      // Constrain the x coordinate to the leftmost area.
      const x2: CssPixels = x + TEXT_OFFSET_START;
      const w2: CssPixels = Math.max(0, w - (x2 - x));

      if (w2 > textMeasurement.minWidth) {
        const fittedText = textMeasurement.getFittedText(text, w2);
        if (fittedText) {
          this._setFillStyle(ctx, foregroundColor);
          ctx.fillText(fittedText, x2, y + TEXT_OFFSET_TOP);
        }
      }
    } else {
      ctx.fillRect(x, y + 2, 1, h - 4);
    }
  }

  drawEvents(
    ctx: CanvasRenderingContext2D,
    hoveredItem: IndexIntoJsTracerEvents | null,
    startRow: number,
    endRow: number
  ) {
    const {
      rangeStart,
      rangeEnd,
      jsTracerTimingRows,
      rowHeight,
      viewport: { containerWidth, viewportLeft, viewportRight, viewportTop },
    } = this.props;

    const markerContainerWidth =
      containerWidth - TIMELINE_MARGIN_LEFT - TIMELINE_MARGIN_RIGHT;

    const rangeLength: Milliseconds = rangeEnd - rangeStart;
    const viewportLength: UnitIntervalOfProfileRange =
      viewportRight - viewportLeft;

    ctx.lineWidth = 1;

    // Only draw the stack frames that are vertically within view.
    for (let rowIndex = startRow; rowIndex < endRow; rowIndex++) {
      // Get the timing information for a row of stack frames.
      const markerTiming = jsTracerTimingRows[rowIndex];

      if (!markerTiming) {
        continue;
      }

      // Decide which samples to actually draw
      const timeAtViewportLeft: Milliseconds =
        rangeStart + rangeLength * viewportLeft;
      const timeAtViewportRightPlusMargin: Milliseconds =
        rangeStart +
        rangeLength * viewportRight +
        // This represents the amount of seconds in the right margin:
        TIMELINE_MARGIN_RIGHT *
          (viewportLength * rangeLength / markerContainerWidth);

      let hoveredElement: DrawingInformation | null = null;
      let lastDrawnPixelX = 0;
      for (let i = 0; i < markerTiming.length; i++) {
        // Only draw samples that are in bounds.
        if (
          markerTiming.end[i] > timeAtViewportLeft &&
          markerTiming.start[i] < timeAtViewportRightPlusMargin
        ) {
          const startTime: UnitIntervalOfProfileRange =
            (markerTiming.start[i] - rangeStart) / rangeLength;
          const endTime: UnitIntervalOfProfileRange =
            (markerTiming.end[i] - rangeStart) / rangeLength;

          let x: CssPixels =
            (startTime - viewportLeft) * markerContainerWidth / viewportLength +
            TIMELINE_MARGIN_LEFT;
          const y: CssPixels = rowIndex * rowHeight - viewportTop;
          const uncutWidth: CssPixels =
            (endTime - startTime) * markerContainerWidth / viewportLength;
          const h: CssPixels = rowHeight - 1;

          let w = Math.max(1, uncutWidth);
          if (x < TIMELINE_MARGIN_LEFT) {
            // Adjust markers that are before the left margin.
            w = w - TIMELINE_MARGIN_LEFT + x;
            x = TIMELINE_MARGIN_LEFT;
          }
          if (uncutWidth < 1) {
            w = 1;
          }

          const tracingMarkerIndex = markerTiming.index[i];
          const isHovered = hoveredItem === tracingMarkerIndex;
          const text = markerTiming.label[i];
          if (isHovered) {
            hoveredElement = { x, y, w, h, uncutWidth, text };
          } else {
            let canDraw = false;
            if (x > lastDrawnPixelX + 1) {
              canDraw = true;
            } else if (w > 1) {
              w = w - (lastDrawnPixelX + 1 - x);
              x = lastDrawnPixelX + 1;
              canDraw = true;
            }
            if (canDraw) {
              this.drawOneEvent(ctx, x, y, w, h, uncutWidth, text);
              lastDrawnPixelX = x + w;
            }
          }
        }
      }
      if (hoveredElement) {
        this.drawOneEvent(
          ctx,
          hoveredElement.x,
          hoveredElement.y,
          hoveredElement.w,
          hoveredElement.h,
          hoveredElement.uncutWidth,
          hoveredElement.text,
          'Highlight', //    background color
          'HighlightText' // foreground color
        );
      }
    }
  }

  /**
   * Lazily create the text measurement tool, as a valid 2d rendering context must
   * exist before it is created.
   */
  _getTextMeasurement(ctx: CanvasRenderingContext2D): TextMeasurement {
    if (!this._textMeasurement) {
      this._textMeasurement = new TextMeasurement(ctx);
    }
    return this._textMeasurement;
  }

  drawSeparatorsAndLabels(
    ctx: CanvasRenderingContext2D,
    startRow: number,
    endRow: number
  ) {
    const {
      jsTracerTimingRows,
      rowHeight,
      viewport: { viewportTop, containerWidth, containerHeight },
    } = this.props;

    // Draw separators
    this._setFillStyle(ctx, GREY_20);
    ctx.fillRect(TIMELINE_MARGIN_LEFT - 1, 0, 1, containerHeight);
    for (let rowIndex = startRow; rowIndex < endRow; rowIndex++) {
      // `- 1` at the end, because the top separator is not drawn in the canvas,
      // it's drawn using CSS' border property. And canvas positioning is 0-based.
      const y = (rowIndex + 1) * rowHeight - viewportTop - 1;
      ctx.fillRect(0, y, containerWidth, 1);
    }

    const textMeasurement = this._getTextMeasurement(ctx);

    // Draw the text
    this._setFillStyle(ctx, '#000000');
    for (let rowIndex = startRow; rowIndex < endRow; rowIndex++) {
      // Get the timing information for a row of stack frames.
      const { name } = jsTracerTimingRows[rowIndex];
      if (rowIndex > 0 && name === jsTracerTimingRows[rowIndex - 1].name) {
        continue;
      }
      const fittedText = textMeasurement.getFittedText(
        name,
        TIMELINE_MARGIN_LEFT
      );
      const y = rowIndex * rowHeight - viewportTop;
      ctx.fillText(fittedText, 5, y + TEXT_OFFSET_TOP);
    }
  }

  hitTest = (x: CssPixels, y: CssPixels): IndexIntoJsTracerEvents | null => {
    if (x < TIMELINE_MARGIN_LEFT) {
      return null;
    }
    const {
      rangeStart,
      rangeEnd,
      jsTracerTimingRows,
      rowHeight,
      viewport: { viewportLeft, viewportRight, viewportTop, containerWidth },
    } = this.props;
    const markerContainerWidth =
      containerWidth - TIMELINE_MARGIN_LEFT - TIMELINE_MARGIN_RIGHT;

    const rangeLength: Milliseconds = rangeEnd - rangeStart;
    const viewportLength: UnitIntervalOfProfileRange =
      viewportRight - viewportLeft;
    const unitIntervalTime: UnitIntervalOfProfileRange =
      viewportLeft +
      viewportLength * ((x - TIMELINE_MARGIN_LEFT) / markerContainerWidth);
    const time: Milliseconds = rangeStart + unitIntervalTime * rangeLength;
    const rowIndex = Math.floor((y + viewportTop) / rowHeight);
    const minDuration = rangeLength * viewportLength / markerContainerWidth;
    const markerTiming = jsTracerTimingRows[rowIndex];

    if (!markerTiming) {
      return null;
    }

    for (let i = 0; i < markerTiming.length; i++) {
      const start = markerTiming.start[i];
      // Ensure that really small markers are hoverable with a minDuration.
      const end = Math.max(start + minDuration, markerTiming.end[i]);
      if (start < time && end > time) {
        return markerTiming.index[i];
      }
    }
    return null;
  };

  onDoubleClickMarker = (_markerIndex: IndexIntoJsTracerEvents | null) => {
    // if (markerIndex === null) {
    //   return;
    // }
    // const { markers, updatePreviewSelection } = this.props;
    // const marker = markers[markerIndex];
    // updatePreviewSelection({
    //   hasSelection: true,
    //   isModifying: false,
    //   selectionStart: marker.start,
    //   selectionEnd: marker.start + marker.dur,
    // });
  };

  getHoveredItemInfo = (_hoveredItem: IndexIntoJsTracerEvents): React.Node => {
    return null;
    // const marker = this.props.markers[hoveredItem];
    // return (
    //   <MarkerTooltipContents
    //     marker={marker}
    //     threadIndex={this.props.threadIndex}
    //   />
    // );
  };

  render() {
    const { containerWidth, containerHeight, isDragging } = this.props.viewport;
    return (
      <ChartCanvas
        className={classNames({
          jsTracerCanvas: true,
          jsTracerCanvasDrawn: this.state.hasFirstDraw,
        })}
        containerWidth={containerWidth}
        containerHeight={containerHeight}
        isDragging={isDragging}
        onDoubleClickItem={this.onDoubleClickMarker}
        getHoveredItemInfo={this.getHoveredItemInfo}
        drawCanvas={this.drawCanvas}
        hitTest={this.hitTest}
        scaleCtxToCssPixels={true}
      />
    );
  }
}

export default (withChartViewport: WithChartViewport<OwnProps, Props>)(
  JsTracerCanvas
);
