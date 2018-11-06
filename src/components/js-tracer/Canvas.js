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
import { FastFillStyle } from '../../utils';
import { updatePreviewSelection } from '../../actions/profile-view';
import { BLUE_40 } from '../../utils/colors';

import type {
  Milliseconds,
  CssPixels,
  UnitIntervalOfProfileRange,
  DevicePixels,
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

/**
 * Collect all of values that are dependent on the current rendering pass.
 * These values will be reset on every draw call.
 */
type RenderPass = {|
  +ctx: CanvasRenderingContext2D,
  +textMeasurement: TextMeasurement,
  +fastFillStyle: FastFillStyle,
  +startRow: number,
  +endRow: number,
  +devicePixels: {|
    +rowHeight: DevicePixels,
    +containerWidth: DevicePixels,
    +innerContainerWidth: DevicePixels,
    +containerHeight: DevicePixels,
    +viewportTop: DevicePixels,
    +textOffsetStart: DevicePixels,
    +textOffsetTop: DevicePixels,
    +timelineMarginLeft: DevicePixels,
    +timelineMarginRight: DevicePixels,
    +oneCssPixel: DevicePixels,
    +rowLabelOffsetLeft: DevicePixels,
  |},
|};

const TEXT_OFFSET_TOP: CssPixels = 11;
const TEXT_OFFSET_START: CssPixels = 3;
const ROW_LABEL_OFFSET_LEFT: CssPixels = 5;
const FONT_SIZE: CssPixels = 10;

class JsTracerCanvas extends React.PureComponent<Props, State> {
  state: State = {
    hasFirstDraw: false,
  };

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

    const { devicePixelRatio } = window;

    // Set the font size before creating a text measurer.
    ctx.font = `${FONT_SIZE * devicePixelRatio}px sans-serif`;

    const renderPass: RenderPass = {
      ctx,
      textMeasurement: new TextMeasurement(ctx),
      fastFillStyle: new FastFillStyle(ctx),
      startRow: Math.floor(viewportTop / rowHeight),
      endRow: Math.min(
        Math.ceil(viewportBottom / rowHeight),
        jsTracerTimingRows.length
      ),
      devicePixels: {
        // Convert many of the common values provided by the Props into DevicePixels.
        containerWidth: containerWidth * devicePixelRatio,
        innerContainerWidth:
          (containerWidth - TIMELINE_MARGIN_LEFT - TIMELINE_MARGIN_RIGHT) *
          devicePixelRatio,
        containerHeight: containerHeight * devicePixelRatio,
        textOffsetStart: TEXT_OFFSET_START * devicePixelRatio,
        textOffsetTop: TEXT_OFFSET_TOP * devicePixelRatio,
        rowHeight: rowHeight * devicePixelRatio,
        viewportTop: viewportTop * devicePixelRatio,
        timelineMarginLeft: TIMELINE_MARGIN_LEFT * devicePixelRatio,
        timelineMarginRight: TIMELINE_MARGIN_RIGHT * devicePixelRatio,
        oneCssPixel: devicePixelRatio,
        rowLabelOffsetLeft: ROW_LABEL_OFFSET_LEFT * devicePixelRatio,
      },
    };

    {
      // Clear out any previous events.
      const { fastFillStyle, devicePixels } = renderPass;
      fastFillStyle.set('#ffffff');
      ctx.fillRect(
        0,
        0,
        devicePixels.containerWidth,
        devicePixels.containerHeight
      );
    }

    this.drawEvents(renderPass, hoveredItem);
    this.drawSeparatorsAndLabels(renderPass);

    if (!this.state.hasFirstDraw) {
      this.setState({ hasFirstDraw: true });
    }
  };

  // Note: we used a long argument list instead of an object parameter on
  // purpose, to reduce GC pressure while drawing.
  drawOneEvent(
    renderPass: RenderPass,
    x: DevicePixels,
    y: DevicePixels,
    w: DevicePixels,
    h: DevicePixels,
    uncutWidth: DevicePixels,
    text: string,
    backgroundColor: string = BLUE_40,
    foregroundColor: string = 'white'
  ) {
    const { ctx, textMeasurement, fastFillStyle, devicePixels } = renderPass;

    fastFillStyle.set(backgroundColor);

    if (uncutWidth >= 1) {
      ctx.fillRect(x, y + 1, w, h - 2);

      // Draw the text label
      // TODO - L10N RTL.
      // Constrain the x coordinate to the leftmost area.
      const x2: DevicePixels = x + devicePixels.textOffsetStart;
      const w2: DevicePixels = Math.max(0, w - (x2 - x));

      if (w2 > textMeasurement.minWidth) {
        const fittedText = textMeasurement.getFittedText(text, w2);
        if (fittedText) {
          fastFillStyle.set(foregroundColor);
          ctx.fillText(fittedText, x2, y + devicePixels.textOffsetTop);
        }
      }
    } else {
      ctx.fillRect(x, y + 2, 1, h - 4);
    }
  }

  drawEvents(
    renderPass: RenderPass,
    hoveredItem: IndexIntoJsTracerEvents | null
  ) {
    const { startRow, endRow, devicePixels } = renderPass;
    const {
      rangeStart,
      rangeEnd,
      jsTracerTimingRows,
      viewport: { viewportLeft, viewportRight },
    } = this.props;

    const rangeLength: Milliseconds = rangeEnd - rangeStart;
    const viewportLength: UnitIntervalOfProfileRange =
      viewportRight - viewportLeft;

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
        devicePixels.timelineMarginRight *
          (viewportLength * rangeLength / devicePixels.containerWidth);

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

          let x: DevicePixels =
            (startTime - viewportLeft) *
              devicePixels.innerContainerWidth /
              viewportLength +
            devicePixels.timelineMarginLeft;
          const y: CssPixels =
            rowIndex * devicePixels.rowHeight - devicePixels.viewportTop;
          const uncutWidth: DevicePixels =
            (endTime - startTime) *
            devicePixels.innerContainerWidth /
            viewportLength;
          const h: DevicePixels =
            devicePixels.rowHeight - devicePixels.oneCssPixel;

          let w = Math.max(1, uncutWidth);
          if (x < devicePixels.timelineMarginLeft) {
            // Adjust markers that are before the left margin.
            w = w - devicePixels.timelineMarginLeft + x;
            x = devicePixels.timelineMarginLeft;
          }
          if (uncutWidth < 1) {
            w = 1;
          }

          const tracingMarkerIndex = markerTiming.index[i];
          const isHovered = hoveredItem === tracingMarkerIndex;
          const text = markerTiming.label[i];
          let canDraw = false;
          if (x > lastDrawnPixelX + 1) {
            canDraw = true;
          } else if (w > 1) {
            w = w - (lastDrawnPixelX + 1 - x);
            x = lastDrawnPixelX + 1;
            canDraw = true;
          }
          if (isHovered) {
            hoveredElement = { x, y, w, h, uncutWidth, text };
          } else if (canDraw) {
            this.drawOneEvent(renderPass, x, y, w, h, uncutWidth, text);
          }
          if (canDraw) {
            // Only shift the last drawn pixel if the hover changed.
            lastDrawnPixelX = x + w;
          }
        }
      }
      if (hoveredElement) {
        this.drawOneEvent(
          renderPass,
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

  drawSeparatorsAndLabels(renderPass: RenderPass) {
    const {
      ctx,
      textMeasurement,
      fastFillStyle,
      startRow,
      endRow,
      devicePixels,
    } = renderPass;
    const { jsTracerTimingRows } = this.props;

    // Draw separators
    fastFillStyle.set(GREY_20);
    ctx.fillRect(
      devicePixels.timelineMarginLeft - devicePixels.oneCssPixel,
      0,
      devicePixels.oneCssPixel,
      devicePixels.containerHeight
    );
    for (let rowIndex = startRow; rowIndex < endRow; rowIndex++) {
      // `- 1` at the end, because the top separator is not drawn in the canvas,
      // it's drawn using CSS' border property. And canvas positioning is 0-based.
      const y =
        (rowIndex + 1) * devicePixels.rowHeight -
        devicePixels.viewportTop -
        devicePixels.oneCssPixel;
      ctx.fillRect(0, y, devicePixels.containerWidth, devicePixels.oneCssPixel);
    }

    // Draw the text
    fastFillStyle.set('#000000');
    for (let rowIndex = startRow; rowIndex < endRow; rowIndex++) {
      // Get the timing information for a row of stack frames.
      const { name } = jsTracerTimingRows[rowIndex];
      if (rowIndex > 0 && name === jsTracerTimingRows[rowIndex - 1].name) {
        continue;
      }
      const fittedText = textMeasurement.getFittedText(
        name,
        devicePixels.timelineMarginLeft
      );
      const y = rowIndex * devicePixels.rowHeight - devicePixels.viewportTop;
      ctx.fillText(
        fittedText,
        devicePixels.rowLabelOffsetLeft,
        y + devicePixels.textOffsetTop
      );
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
    const minDuration: Milliseconds =
      rangeLength * viewportLength / markerContainerWidth;
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
        scaleCtxToCssPixels={false}
      />
    );
  }
}

export default (withChartViewport: WithChartViewport<OwnProps, Props>)(
  JsTracerCanvas
);
