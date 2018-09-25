/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow

import React, { PureComponent } from 'react';
import classNames from 'classnames';
import { timeCode } from '../../../utils/time-code';
import photonColors from 'photon-colors';
import bisection from 'bisection';
import clamp from 'clamp';

import './ActivityGraph.css';

import type {
  Thread,
  CategoryList,
  IndexIntoSamplesTable,
  IndexIntoCategoryList,
  SamplesTable,
  StackTable,
} from '../../../types/profile';
import type {
  Milliseconds,
  DevicePixels,
  CssPixels,
} from '../../../types/units';

type Props = {|
  +className: string,
  +fullThread: Thread,
  +interval: Milliseconds,
  +rangeStart: Milliseconds,
  +rangeEnd: Milliseconds,
  +onSampleClick: (sampleIndex: IndexIntoSamplesTable) => void,
  +categories: CategoryList,
  +samplesSelectedStates?: boolean[],
  +treeOrderSampleComparator?: (
    IndexIntoSamplesTable,
    IndexIntoSamplesTable
  ) => number,
|};

type CategoryFill = {|
  category: IndexIntoCategoryList,
  perPixelContribution: Float32Array,
  fillStyle: string | CanvasPattern,
|};

type SampleContributionToPixel = {|
  sample: IndexIntoSamplesTable,
  contribution: number,
|};

type CategoryDrawStyle = {|
  +category: number,
  +gravity: number,
  +selectedFillStyle: string,
  +unselectedFillStyle: string,
  +filteredOutFillStyle: CanvasPattern,
|};

type SelectedPercentageAtPixelBuffers = {|
  // The following arrays get recreated when the canvas gets resized.
  +beforeSelectedPercentageAtPixel: Float32Array,
  +selectedPercentageAtPixel: Float32Array,
  +afterSelectedPercentageAtPixel: Float32Array,
  +filteredOutPercentageAtPixel: Float32Array,
|};

const BOX_BLUR_RADII = [3, 2, 2];
const SMOOTHING_RADIUS = 3 + 2 + 2;
const SMOOTHING_KERNEL: Float32Array = _getSmoothingKernel(
  SMOOTHING_RADIUS,
  BOX_BLUR_RADII
);

class ThreadActivityGraph extends PureComponent<Props> {
  _canvas: null | HTMLCanvasElement = null;
  _resizeListener = () => this.forceUpdate();
  _categoryDrawStyles: null | CategoryDrawStyle[] = null;
  _lastDrawer: null | ActivityGraphDrawer = null;

  _takeCanvasRef = (canvas: HTMLCanvasElement | null) => {
    this._canvas = canvas;
  };

  _renderCanvas() {
    const canvas = this._canvas;
    if (canvas !== null) {
      timeCode('ThreadActivityGraph render', () => {
        this.drawCanvas(canvas);
      });
    }
  }

  componentDidMount() {
    window.addEventListener('resize', this._resizeListener);
    this.forceUpdate(); // for initial size
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this._resizeListener);
  }

  /**
   * Get or lazily create the category info. It requires the 2d ctx to exist in order
   * to create the fill patterns.
   */
  _getCategoryDrawStyles(ctx: CanvasRenderingContext2D): CategoryDrawStyle[] {
    if (this._categoryDrawStyles === null) {
      // Lazily initialize this list.
      this._categoryDrawStyles = this.props.categories.map(
        ({ color: colorName }, categoryIndex) => {
          const styles = _mapColorNameToStyles(colorName);
          return {
            ...styles,
            category: categoryIndex,
            filteredOutFillStyle: _createDiagonalStripePattern(
              ctx,
              styles.unselectedFillStyle
            ),
          };
        }
      );
    }

    return this._categoryDrawStyles;
  }

  drawCanvas(canvas: HTMLCanvasElement) {
    const { fullThread } = this.props;
    const { samples } = fullThread;

    if (samples.length === 0) {
      // Do not attempt to render when there are no samples.
      return;
    }
    const r = canvas.getBoundingClientRect();
    const canvasPixelWidth = Math.round(r.width * window.devicePixelRatio);
    const canvasPixelHeight = Math.round(r.height * window.devicePixelRatio);
    canvas.width = canvasPixelWidth;
    canvas.height = canvasPixelHeight;
    const ctx = canvas.getContext('2d');
    const drawer = new ActivityGraphDrawer(
      ctx,
      this.props,
      this._getCategoryDrawStyles(ctx)
    );

    drawer.accumulateSampleCategories();
    drawer.drawFills();

    this._lastDrawer = drawer;
  }

  _onMouseUp = (e: SyntheticMouseEvent<>) => {
    const drawer = this._lastDrawer;
    const canvas = this._canvas;
    if (!canvas || !drawer) {
      return;
    }
    // Re-measure the canvas and get the coordinates and time for the click.
    const { rangeStart, rangeEnd } = this.props;
    const rect = canvas.getBoundingClientRect();
    const x = e.pageX - rect.left;
    const y = e.pageY - rect.top;
    const time = rangeStart + x / rect.width * (rangeEnd - rangeStart);

    const sample = drawer.getSampleAtClick(x, y, time);
    if (sample !== null) {
      this.props.onSampleClick(sample);
    }
  };

  render() {
    this._renderCanvas();
    return (
      <div className={this.props.className}>
        <canvas
          className={classNames(
            `${this.props.className}Canvas`,
            'threadActivityGraphCanvas'
          )}
          ref={this._takeCanvasRef}
          onMouseUp={this._onMouseUp}
        />
      </div>
    );
  }
}

export default ThreadActivityGraph;

/**
 * Apply a 1d box blur to a destination array.
 */
function _boxBlur1D(
  srcArray: Float32Array,
  destArray: Float32Array,
  radius: number
): void {
  if (srcArray.length < radius) {
    destArray.set(srcArray);
    return;
  }

  // We treat values outside the range as zero.
  let total = 0;
  for (let kx = 0; kx <= radius; ++kx) {
    total += srcArray[kx];
  }
  destArray[0] = total / (radius * 2 + 1);

  for (let x = 1; x < radius + 1; ++x) {
    total += srcArray[x + radius];
    destArray[x] = total / (radius * 2 + 1);
  }
  for (let x = radius + 1; x < srcArray.length - radius; ++x) {
    total -= srcArray[x - radius - 1];
    total += srcArray[x + radius];
    destArray[x] = total / (radius * 2 + 1);
  }
  for (let x = srcArray.length - radius; x < srcArray.length; ++x) {
    total -= srcArray[x - radius - 1];
    destArray[x] = total / (radius * 2 + 1);
  }
}

/**
 * Apply a blur with a gaussian distribution to a destination array.
 */
function _applyGaussianBlur1D(
  srcArray: Float32Array,
  boxBlurRadii: number[]
): void {
  let a = srcArray;
  let b = new Float32Array(srcArray.length);
  for (const radius of boxBlurRadii) {
    _boxBlur1D(a, b, radius);
    [b, a] = [a, b];
  }

  if (b === srcArray) {
    // The last blur was applied to the temporary array, blit the final values back
    // to the srcArray. This ensures that we are always mutating the values of the
    // src array, and not returning the newly created array.
    for (let i = 0; i < srcArray.length; i++) {
      srcArray[i] = a[i];
    }
  }
}

/**
 * Filtered out samples use a diagonal stripe pattern, create that here.
 */
function _createDiagonalStripePattern(
  chartCtx: CanvasRenderingContext2D,
  color: string
): CanvasPattern {
  // Create a second canvas, draw to it in order to create a pattern. This canvas
  // and context will be discarded after the pattern is created.
  const patternCanvas = document.createElement('canvas');
  const dpr = Math.round(window.devicePixelRatio);
  patternCanvas.width = 4 * dpr;
  patternCanvas.height = 4 * dpr;
  const patternContext = patternCanvas.getContext('2d');
  patternContext.scale(dpr, dpr);

  const linear = patternContext.createLinearGradient(0, 0, 4, 4);
  linear.addColorStop(0, color);
  linear.addColorStop(0.25, color);
  linear.addColorStop(0.25, 'transparent');
  linear.addColorStop(0.5, 'transparent');
  linear.addColorStop(0.5, color);
  linear.addColorStop(0.75, color);
  linear.addColorStop(0.75, 'transparent');
  linear.addColorStop(1, 'transparent');
  patternContext.fillStyle = linear;
  patternContext.fillRect(0, 0, 4, 4);

  return chartCtx.createPattern(patternCanvas, 'repeat');
}

/**
 * Map a color name, which comes from Gecko, into a CSS style color. These colors cannot
 * be changed without considering the values coming from Gecko, and from old profiles
 * that already have their category colors saved into the profile.
 *
 * Category color names come from:
 * https://searchfox.org/mozilla-central/rev/0b8ed772d24605d7cb44c1af6d59e4ca023bd5f5/tools/profiler/core/platform.cpp#1593-1627
 */
function _mapColorNameToStyles(colorName: string) {
  switch (colorName) {
    case 'transparent':
      return {
        selectedFillStyle: 'transparent',
        unselectedFillStyle: 'transparent',
        gravity: 0,
      };
    case 'purple':
      return {
        selectedFillStyle: photonColors.PURPLE_70,
        unselectedFillStyle: photonColors.PURPLE_70 + '60',
        gravity: 5,
      };
    case 'green':
      return {
        selectedFillStyle: photonColors.GREEN_60,
        unselectedFillStyle: photonColors.GREEN_60 + '60',
        gravity: 4,
      };
    case 'orange':
      return {
        selectedFillStyle: photonColors.ORANGE_50,
        unselectedFillStyle: photonColors.ORANGE_50 + '60',
        gravity: 2,
      };
    case 'yellow':
      return {
        selectedFillStyle: photonColors.YELLOW_50,
        unselectedFillStyle: photonColors.YELLOW_50 + '60',
        gravity: 6,
      };
    case 'lightblue':
      return {
        selectedFillStyle: photonColors.BLUE_40,
        unselectedFillStyle: photonColors.BLUE_40 + '60',
        gravity: 1,
      };
    case 'grey':
      return {
        selectedFillStyle: photonColors.GREY_30,
        unselectedFillStyle: photonColors.GREY_30 + '60',
        gravity: 8,
      };
    case 'blue':
      return {
        selectedFillStyle: photonColors.BLUE_60,
        unselectedFillStyle: photonColors.BLUE_60 + '60',
        gravity: 3,
      };
    case 'brown':
      return {
        selectedFillStyle: photonColors.MAGENTA_60,
        unselectedFillStyle: photonColors.MAGENTA_60 + '60',
        gravity: 7,
      };
    default:
      console.error(
        'Unknown color name encountered. Consider updating this code to handle it.'
      );
      return {
        selectedFillStyle: photonColors.GREY_30,
        unselectedFillStyle: photonColors.GREY_30 + '60',
        gravity: 8,
      };
  }
}

function _getSmoothingKernel(
  smoothingRadius: number,
  boxBlurRadii: number[]
): Float32Array {
  const kernelWidth = smoothingRadius + 1 + smoothingRadius;
  const kernel = new Float32Array(kernelWidth);
  kernel[smoothingRadius] = 1;
  _applyGaussianBlur1D(kernel, boxBlurRadii);
  return kernel;
}

/**
 * A lot is going on with the drawing of this graph. Break out the canvas calls
 * separately from the component logic. This makes it easier to assume that
 * the context always exists, and it makes it easy to share lots of shared state
 * between various methods.
 */
class ActivityGraphDrawer {
  ctx: CanvasRenderingContext2D;
  rangeStart: Milliseconds;
  rangeEnd: Milliseconds;
  rangeLength: Milliseconds;
  canvasPixelWidth: DevicePixels;
  canvasPixelHeight: DevicePixels;
  devicePixelRatio: number;
  xPixelsPerMs: number;
  categoryDrawStyles: CategoryDrawStyle[];
  buffers: SelectedPercentageAtPixelBuffers[];
  samples: SamplesTable;
  stackTable: StackTable;
  interval: Milliseconds;
  greyCategoryIndex: IndexIntoCategoryList;
  samplesSelectedStates: ?Array<boolean>;
  categoryFills: CategoryFill[];
  categories: CategoryList;
  treeOrderSampleComparator: ?(
    IndexIntoSamplesTable,
    IndexIntoSamplesTable
  ) => number;

  constructor(
    ctx: CanvasRenderingContext2D,
    {
      rangeEnd,
      rangeStart,
      categories,
      interval,
      samplesSelectedStates,
      fullThread: { samples, stackTable },
    }: Props,
    categoryDrawStyles: CategoryDrawStyle[]
  ) {
    // Collect the common variables used on the various methods.
    this.canvasPixelWidth = ctx.canvas.width;
    this.canvasPixelHeight = ctx.canvas.height;
    this.rangeEnd = rangeEnd;
    this.rangeStart = rangeStart;
    this.rangeLength = rangeEnd - rangeStart;
    this.categoryDrawStyles = categoryDrawStyles;
    this.interval = interval;
    this.xPixelsPerMs = this.canvasPixelWidth / this.rangeLength;
    this.samples = samples;
    this.stackTable = stackTable;
    this.samplesSelectedStates = samplesSelectedStates;
    this.greyCategoryIndex = categories.findIndex(c => c.color === 'grey') || 0;
    this.devicePixelRatio = window.devicePixelRatio;
    this.ctx = ctx;
    // TODO - Consider making all initialization functions into pure functions.
    this.buffers = this._createSelectedPercentageAtPixelBuffers();
    this.categoryFills = this._getFills();
  }

  _createSelectedPercentageAtPixelBuffers(): SelectedPercentageAtPixelBuffers[] {
    return this.categoryDrawStyles.map(() => ({
      beforeSelectedPercentageAtPixel: new Float32Array(this.canvasPixelWidth),
      selectedPercentageAtPixel: new Float32Array(this.canvasPixelWidth),
      afterSelectedPercentageAtPixel: new Float32Array(this.canvasPixelWidth),
      filteredOutPercentageAtPixel: new Float32Array(this.canvasPixelWidth),
    }));
  }

  _getFills(): CategoryFill[] {
    // Sort all of the categories by their gravity.
    const categoryIndexesByGravity = this.categoryDrawStyles
      .map((_, i) => i)
      .sort(
        (a, b) =>
          this.categoryDrawStyles[b].gravity -
          this.categoryDrawStyles[a].gravity
      );

    // For each category, create a fill style for each of 4 draw states. These fill styles
    // are sorted by their gravity.
    //
    // * 'UNSELECTED_ORDERED_BEFORE_SELECTED',
    // * 'SELECTED',
    // * 'UNSELECTED_ORDERED_AFTER_SELECTED',
    // * 'FILTERED_OUT'
    const nestedFills: CategoryFill[][] = categoryIndexesByGravity.map(
      categoryIndex => {
        const categoryDrawStyle = this.categoryDrawStyles[categoryIndex];
        const buffers = this.buffers[categoryIndex];
        // For every category we draw four fills, for the four selection kinds:
        return [
          {
            category: categoryDrawStyle.category,
            fillStyle: categoryDrawStyle.unselectedFillStyle,
            perPixelContribution: buffers.beforeSelectedPercentageAtPixel,
          },
          {
            category: categoryDrawStyle.category,
            fillStyle: categoryDrawStyle.selectedFillStyle,
            perPixelContribution: buffers.selectedPercentageAtPixel,
          },
          {
            category: categoryDrawStyle.category,
            fillStyle: categoryDrawStyle.unselectedFillStyle,
            perPixelContribution: buffers.afterSelectedPercentageAtPixel,
          },
          {
            category: categoryDrawStyle.category,
            fillStyle: categoryDrawStyle.filteredOutFillStyle,
            perPixelContribution: buffers.filteredOutPercentageAtPixel,
          },
        ];
      }
    );

    // Flatten out the fills into a single array.
    return [].concat(...nestedFills);
  }

  accumulateSampleCategories() {
    const { samples, interval, stackTable, greyCategoryIndex } = this;
    let prevSampleTime = samples.time[0] - interval;
    let sampleTime = samples.time[0];
    for (let i = 0; i < samples.length - 1; i++) {
      const nextSampleTime = samples.time[i + 1];
      const stackIndex = samples.stack[i];
      const category =
        stackIndex !== null
          ? stackTable.category[stackIndex]
          : greyCategoryIndex;
      this._accumulateInCategory(
        category,
        i,
        prevSampleTime,
        sampleTime,
        nextSampleTime
      );
      prevSampleTime = sampleTime;
      sampleTime = nextSampleTime;
    }
    const lastSampleStack = samples.stack[samples.length - 1];
    const lastSampleCategory =
      lastSampleStack !== null
        ? stackTable.category[lastSampleStack]
        : greyCategoryIndex;

    this._accumulateInCategory(
      lastSampleCategory,
      samples.length - 1,
      prevSampleTime,
      sampleTime,
      sampleTime + interval
    );
  }

  _accumulateInCategory(
    category: IndexIntoCategoryList,
    sampleIndex: IndexIntoSamplesTable,
    prevSampleTime: Milliseconds,
    sampleTime: Milliseconds,
    nextSampleTime: Milliseconds
  ) {
    const {
      rangeEnd,
      rangeStart,
      categoryDrawStyles,
      xPixelsPerMs,
      canvasPixelWidth,
    } = this;
    if (sampleTime < rangeStart || sampleTime >= rangeEnd) {
      return;
    }

    const categoryDrawStyle = categoryDrawStyles[category];
    const buffers = this.buffers[category];

    if (categoryDrawStyle.selectedFillStyle === 'transparent') {
      return;
    }

    const sampleStart = (prevSampleTime + sampleTime) / 2;
    const sampleEnd = (sampleTime + nextSampleTime) / 2;
    let pixelStart = (sampleStart - rangeStart) * xPixelsPerMs;
    let pixelEnd = (sampleEnd - rangeStart) * xPixelsPerMs;
    pixelStart = Math.max(0, pixelStart);
    pixelEnd = Math.min(canvasPixelWidth - 1, pixelEnd);
    const intPixelStart = pixelStart | 0;
    const intPixelEnd = pixelEnd | 0;

    // For every sample, we have a fractional interval of this sample's
    // contribution to the graph's pixels.
    //
    // v       v       v       v       v       v       v       v       v
    // +-------+-------+-----+-+-------+-------+-----+-+-------+-------+
    // |       |       |     |///////////////////////| |       |       |
    // |       |       |     |///////////////////////| |       |       |
    // |       |       |     |///////////////////////| |       |       |
    // +-------+-------+-----+///////////////////////+-+-------+-------+
    //
    // We have a device-pixel array of contributions. We map the fractional
    // interval to this array of device pixels: Fully overlapping pixels are
    // 1, and the partial overlapping pixels are the degree of overlap.

    //                                 |
    //                                 v
    //
    // +-------+-------+-------+-------+-------+-------+-------+-------+
    // |       |       |       |///////////////+-------+       |       |
    // |       |       |       |///////////////////////|       |       |
    // |       |       +-------+///////////////////////|       |       |
    // +-------+-------+///////////////////////////////+-------+-------+
    const categoryArray = this._pickCategoryArray(buffers, sampleIndex);
    for (let i = intPixelStart; i <= intPixelEnd; i++) {
      categoryArray[i] += 1;
    }
    categoryArray[intPixelStart] -= pixelStart - intPixelStart;
    categoryArray[intPixelEnd] -= 1 - (pixelEnd - intPixelEnd);
  }

  _pickCategoryArray(
    buffers: SelectedPercentageAtPixelBuffers,
    sampleIndex: IndexIntoSamplesTable
  ): Float32Array {
    const { samplesSelectedStates } = this;
    if (!samplesSelectedStates) {
      return buffers.selectedPercentageAtPixel;
    }
    switch (samplesSelectedStates[sampleIndex]) {
      case 'FILTERED_OUT':
        return buffers.filteredOutPercentageAtPixel;
      case 'UNSELECTED_ORDERED_BEFORE_SELECTED':
        return buffers.beforeSelectedPercentageAtPixel;
      case 'SELECTED':
        return buffers.selectedPercentageAtPixel;
      case 'UNSELECTED_ORDERED_AFTER_SELECTED':
        return buffers.afterSelectedPercentageAtPixel;
      default:
        throw new Error('Unexpected samplesSelectedStates value');
    }
  }

  categoryAtPixel(
    x: number,
    y: number
  ): null | {
    category: IndexIntoCategoryList,
    offsetToCategoryStart: DevicePixels,
  } {
    const deviceX = Math.round(x * this.devicePixelRatio);
    const deviceY = Math.round(y * this.devicePixelRatio);

    if (
      !this.categoryFills ||
      deviceX < 0 ||
      deviceX >= this.canvasPixelWidth ||
      deviceY < 0 ||
      deviceY >= this.canvasPixelHeight
    ) {
      return null;
    }

    const valueToFind = 1 - deviceY / this.canvasPixelHeight;
    let currentCategory = null;
    let currentCategoryStart = 0.0;
    let previousFillEnd = 0.0;
    for (const { category, perPixelContribution } of this.categoryFills) {
      const fillEnd = perPixelContribution[deviceX];

      if (category !== currentCategory) {
        currentCategory = category;
        currentCategoryStart = previousFillEnd;
      }

      if (fillEnd >= valueToFind) {
        return {
          category,
          offsetToCategoryStart: valueToFind - currentCategoryStart,
        };
      }

      previousFillEnd = fillEnd;
    }

    return null;
  }

  _orderedSmoothedSampleContributionsToPixel(
    time: number,
    canvasPixelWidth: number,
    category: IndexIntoCategoryList
  ): Array<SampleContributionToPixel> {
    const {
      rangeStart,
      rangeEnd,
      treeOrderSampleComparator,
      categories,
      samples,
      stackTable,
    } = this;

    const rangeLength = rangeEnd - rangeStart;
    const xPixelsPerMs = canvasPixelWidth / rangeLength;
    const xPixel = ((time - rangeStart) * xPixelsPerMs) | 0;
    const [
      sampleRangeStart,
      sampleRangeEnd,
    ] = this._sampleRangeContributingToPixelWhenSmoothed(xPixel, xPixelsPerMs);

    const sampleContributions = [];
    for (let sample = sampleRangeStart; sample < sampleRangeEnd; sample++) {
      const stackIndex = samples.stack[sample];
      const sampleCategory =
        stackIndex !== null
          ? stackTable.category[stackIndex]
          : categories.findIndex(c => c.color === 'grey') || 0;
      if (sampleCategory === category) {
        sampleContributions.push({
          sample,
          contribution: this._smoothedContributionFromSampleToPixel(
            xPixel,
            xPixelsPerMs,
            sample
          ),
        });
      }
    }
    if (treeOrderSampleComparator) {
      sampleContributions.sort((a, b) => {
        const sampleA = a.sample;
        const sampleB = b.sample;
        return treeOrderSampleComparator(sampleA, sampleB);
      });
    }
    return sampleContributions;
  }

  _sampleRangeContributingToPixelWhenSmoothed(
    xPixel: number,
    xPixelsPerMs: number
  ): [IndexIntoSamplesTable, IndexIntoSamplesTable] {
    const { samples, rangeStart } = this;
    const contributionTimeRange = {
      start: rangeStart + (xPixel - SMOOTHING_RADIUS) / xPixelsPerMs,
      end: rangeStart + (xPixel + SMOOTHING_RADIUS) / xPixelsPerMs,
    };
    // Now find the samples where the range [mid(previousSample.time, thisSample.time), mid(thisSample.time, nextSample.time)]
    // overlaps with contributionTimeRange.
    const firstSampleAfterContributionTimeRangeStart = bisection.right(
      samples.time,
      contributionTimeRange.start
    );
    const firstSampleAfterContributionTimeRangeEnd = bisection.right(
      samples.time,
      contributionTimeRange.end
    );
    return [
      Math.max(0, firstSampleAfterContributionTimeRangeStart - 1),
      Math.min(samples.length - 1, firstSampleAfterContributionTimeRangeEnd) +
        1,
    ];
  }

  _smoothedContributionFromSampleToPixel(
    xPixel: number,
    xPixelsPerMs: number,
    sample: IndexIntoSamplesTable
  ): number {
    const { samples, rangeStart } = this;
    const kernelPos = xPixel - SMOOTHING_RADIUS;
    const pixelsAroundX = new Float32Array(SMOOTHING_KERNEL.length);
    const sampleTime = samples.time[sample];
    // xPixel in graph space maps to kernel[smoothingRadius]
    const sampleTimeRangeStart =
      sample > 0 ? (samples.time[sample - 1] + sampleTime) / 2 : -Infinity;
    const sampleTimeRangeEnd =
      sample < samples.length
        ? (samples.time[sample + 1] + sampleTime) / 2
        : Infinity;

    let pixelStart =
      (sampleTimeRangeStart - rangeStart) * xPixelsPerMs - kernelPos;
    let pixelEnd = (sampleTimeRangeEnd - rangeStart) * xPixelsPerMs - kernelPos;
    pixelStart = clamp(pixelStart, 0, SMOOTHING_KERNEL.length - 1);
    pixelEnd = clamp(pixelEnd, 0, SMOOTHING_KERNEL.length - 1);
    const intPixelStart = pixelStart | 0;
    const intPixelEnd = pixelEnd | 0;

    for (let i = intPixelStart; i <= intPixelEnd; i++) {
      pixelsAroundX[i] += 1;
    }
    pixelsAroundX[intPixelStart] -= pixelStart - intPixelStart;
    pixelsAroundX[intPixelEnd] -= 1 - (pixelEnd - intPixelEnd);

    let sum = 0;
    for (let i = 0; i < SMOOTHING_KERNEL.length; i++) {
      sum += SMOOTHING_KERNEL[i] * pixelsAroundX[i];
    }

    return sum;
  }

  drawFills() {
    const { categoryFills, ctx, canvasPixelWidth, canvasPixelHeight } = this;
    // Smooth the graphs by applying a 1D gaussian blur to the per-pixel
    // contribution of each fill.
    for (const fill of categoryFills) {
      _applyGaussianBlur1D(fill.perPixelContribution, BOX_BLUR_RADII);
    }

    let lastCumulativeArray = categoryFills[0].perPixelContribution;
    for (const { perPixelContribution } of categoryFills.slice(1)) {
      for (let i = 0; i < canvasPixelWidth; i++) {
        perPixelContribution[i] += lastCumulativeArray[i];
      }
      lastCumulativeArray = perPixelContribution;
    }

    function findNextDifferentIndex(arr1, arr2, startIndex) {
      for (let i = startIndex; i < arr1.length; i++) {
        if (arr1[i] !== arr2[i]) {
          return i;
        }
      }
      return arr1.length;
    }

    // Draw adjacent filled paths using Operator ADD and disjoint paths.
    // This avoids any bleeding and seams.
    // lighter === OP_ADD
    ctx.globalCompositeOperation = 'lighter';
    lastCumulativeArray = new Float32Array(canvasPixelWidth);
    for (const { fillStyle, perPixelContribution } of categoryFills) {
      const cumulativeArray = perPixelContribution;
      ctx.fillStyle = fillStyle;
      let lastNonZeroRangeEnd = 0;
      while (lastNonZeroRangeEnd < canvasPixelWidth) {
        const currentNonZeroRangeStart = findNextDifferentIndex(
          cumulativeArray,
          lastCumulativeArray,
          lastNonZeroRangeEnd
        );
        if (currentNonZeroRangeStart >= canvasPixelWidth) {
          break;
        }
        let currentNonZeroRangeEnd = canvasPixelWidth;
        ctx.beginPath();
        ctx.moveTo(
          currentNonZeroRangeStart,
          (1 - lastCumulativeArray[currentNonZeroRangeStart]) *
            canvasPixelHeight
        );
        for (let i = currentNonZeroRangeStart + 1; i < canvasPixelWidth; i++) {
          const lastVal = lastCumulativeArray[i];
          const thisVal = cumulativeArray[i];
          ctx.lineTo(i, (1 - lastVal) * canvasPixelHeight);
          if (lastVal === thisVal) {
            currentNonZeroRangeEnd = i;
            break;
          }
        }
        for (
          let i = currentNonZeroRangeEnd - 1;
          i >= currentNonZeroRangeStart;
          i--
        ) {
          ctx.lineTo(i, (1 - cumulativeArray[i]) * canvasPixelHeight);
        }
        ctx.closePath();
        ctx.fill();

        lastNonZeroRangeEnd = currentNonZeroRangeEnd;
      }
      lastCumulativeArray = cumulativeArray;
    }
  }

  getSampleAtClick(
    x: CssPixels,
    y: CssPixels,
    time: Milliseconds
  ): IndexIntoSamplesTable | null {
    const categoryUnderMouse = this.categoryAtPixel(x, y);
    if (categoryUnderMouse === null) {
      return null;
    }

    let offsetToCategoryStart = categoryUnderMouse.offsetToCategoryStart;
    const candidateSamples = this._orderedSmoothedSampleContributionsToPixel(
      time,
      this.canvasPixelWidth,
      categoryUnderMouse.category
    );

    for (let i = 0; i < candidateSamples.length; i++) {
      const { sample, contribution } = candidateSamples[i];
      if (offsetToCategoryStart <= contribution) {
        return sample;
      }
      offsetToCategoryStart -= contribution;
    }

    return null;
  }
}
