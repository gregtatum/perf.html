import React, { Component, PropTypes } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import { timeCode } from '../../common/time-code';
import { getSampleFuncStacks } from '../profile-data';

class FlameChart extends Component {

  constructor(props) {
    super(props);
    this._requestedAnimationFrame = false;
  }

  _scheduleDraw() {
    if (!this._requestedAnimationFrame) {
      this._requestedAnimationFrame = true;
      window.requestAnimationFrame(() => {
        this._requestedAnimationFrame = false;
        if (this.refs.canvas) {
          timeCode('FlameChart render', () => {
            this.drawCanvas(this.refs.canvas);
          });
        }
      });
    }
  }

  shouldComponentUpdate(nextProps, nextState) {
    return shallowCompare(this, nextProps, nextState);
  }

  /**
   * Draw the canvas.
   *
   * Note that most of the units are not absolute values, but unit intervals ranged from
   * 0 - 1. This was done to make the calculations easier for computing various zoomed
   * and translated views independent of any particular scale. See FlameChartView.js
   * for a diagram detailing the various components of this set-up.
   * @param {HTMLCanvasElement} canvas
   */
  drawCanvas(canvas) {
    const { thread, interval, rangeStart, rangeEnd, funcStackInfo,
            containerWidth, containerHeight, boundsLeft, boundsRight, maxStackDepth,
            stackTimingByDepth } = this.props;
    const { funcStackTable, stackIndexToFuncStackIndex } = funcStackInfo;
    const sampleFuncStacks = getSampleFuncStacks(thread.samples, stackIndexToFuncStackIndex);

    const ctx = prepCanvas(canvas, containerWidth, containerHeight);
    const range = [rangeStart, rangeEnd];
    const rangeLength = range[1] - range[0];
    const yPixelsPerDepth = canvas.height / maxStackDepth;
    const unitInterval = interval / rangeLength;
    const boundsUnitLength = boundsRight - boundsLeft;

    // TODO - Go through the prefixes of the leaf frames, and draw the parent frames.
    const visitedFrames = [];
    const ROW_HEIGHT = 3;
    for (let depth = 0; depth < stackTimingByDepth.length; depth++) {
      const stackTiming = stackTimingByDepth[depth];
      for (let i = 0; i < stackTiming.length; i++) {
        const unitStartTime = (stackTiming.start[i] - range[0]) / rangeLength;
        const unitEndTime = (stackTiming.end[i] - range[0]) / rangeLength;
        const stackIndex = stackTiming.stack[i];
        const funcStack = stackIndexToFuncStackIndex[stackIndex];
        // Only draw samples that are in bounds.
        // if (boundsLeft < unitEndTime && boundsRight > unitStartTime)
        {
          const funcStack = sampleFuncStacks[i];
          const x = Math.floor((unitStartTime - boundsLeft) * containerWidth / boundsUnitLength);
          const y = depth * ROW_HEIGHT;
          const w = Math.ceil((unitEndTime - unitStartTime) * containerWidth / boundsUnitLength);
          const h = ROW_HEIGHT - 1;
          ctx.fillStyle = 'rgb(255, 128, 150)';
          ctx.fillRect(x, y, w, h);
        }
      }
    }
/*
    ctx.fillStyle = 'rgba(100, 128, 150, 0.1)';
    // ctx.fillStyle = '#7990c8';
    // Draw frames
    for (let i = 0; i < sampleFuncStacks.length; i++) {
      // Unit time is relative to a sample's time in the profile current range, and is
      // independent from the viewport and total profile time.
      const unitSampleStartTime = (thread.samples.time[i] - range[0]) / rangeLength;

      // The ending sample time should be the next sample's start time, but fallback
      // to the unitInterval if it's the last sample.
      const nextSample = thread.samples.time[i + 1];
      const unitSampleEndTime = nextSample
        ? (nextSample - range[0]) / rangeLength
        : unitSampleStartTime + unitInterval;

      // Only draw samples that are in bounds.
      if (boundsLeft < unitSampleEndTime && boundsRight > unitSampleStartTime) {
        const funcStack = sampleFuncStacks[i];
        const x = Math.floor((unitSampleStartTime - boundsLeft) * containerWidth / boundsUnitLength);
        const y = 0;
        const w = Math.ceil((unitSampleEndTime - unitSampleStartTime) * containerWidth / boundsUnitLength);
        const h = funcStackTable.depth[funcStack] * yPixelsPerDepth;
        ctx.fillRect(x, y, w, h);
      }
    }*/
  }

  render() {
    this._scheduleDraw();
    return <canvas className={this.props.className} ref='canvas'/>;
  }
}

FlameChart.propTypes = {
  thread: PropTypes.shape({
    samples: PropTypes.object.isRequired,
  }).isRequired,
  interval: PropTypes.number.isRequired,
  rangeStart: PropTypes.number.isRequired,
  rangeEnd: PropTypes.number.isRequired,
  funcStackInfo: PropTypes.shape({
    funcStackTable: PropTypes.object.isRequired,
    stackIndexToFuncStackIndex: PropTypes.any.isRequired,
  }).isRequired,
  className: PropTypes.string,
  containerWidth: PropTypes.number,
  containerHeight: PropTypes.number,
  boundsLeft: PropTypes.number,
  boundsRight: PropTypes.number,
  maxStackDepth: PropTypes.number,
  stackTimingByDepth: PropTypes.array,
};

export default FlameChart;

function prepCanvas(canvas, width, height) {
  canvas.width = width * window.devicePixelRatio;
  canvas.height = height * window.devicePixelRatio;
  const ctx = canvas.getContext('2d');
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  return ctx;
}
