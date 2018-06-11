/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow

import React, { PureComponent } from 'react';
import bisection from 'bisection';
import { withSize } from '../shared/WithSize';
import explicitConnect from '../../utils/connect';
import {
  selectorsForThread,
  getDisplayRange,
  getProfileInterval,
} from '../../reducers/profile-view';
import MemoryTracingMarkerOverview from './MemoryTracingMarkerOverview';

import type { Thread, ThreadIndex } from '../../types/profile';
import type {} from '../../types/markers';
import type { Milliseconds } from '../../types/units';
import type { SizeProps } from '../shared/WithSize';
import type {
  ExplicitConnectOptions,
  ConnectedProps,
} from '../../utils/connect';

import './Memory.css';

type OwnProps = {|
  +threadIndex: ThreadIndex,
  ...SizeProps,
|};

type StateProps = {|
  +thread: Thread,
  +rangeStart: Milliseconds,
  +rangeEnd: Milliseconds,
  +threadName: string,
  +interval: number,
|};
type DispatchProps = {||};
type Props = ConnectedProps<OwnProps, StateProps, DispatchProps>;
type State = void;

const HEIGHT = 30;

class Memory extends PureComponent<Props, State> {
  _canvas: null | HTMLCanvasElement;
  _requestedAnimationFrame: boolean;
  _resizeListener: () => void;
  _takeCanvasRef = (canvas: HTMLCanvasElement | null) =>
    (this._canvas = canvas);

  constructor(props: Props) {
    super(props);
    this._resizeListener = () => this.forceUpdate();
    this._requestedAnimationFrame = false;
    this._canvas = null;
  }

  _scheduleDraw() {
    if (!this._requestedAnimationFrame) {
      this._requestedAnimationFrame = true;
      window.requestAnimationFrame(() => {
        this._requestedAnimationFrame = false;
        const canvas = this._canvas;
        if (canvas) {
          this.drawCanvas(canvas);
        }
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

  drawCanvas(canvas: HTMLCanvasElement) {
    const {
      rangeStart,
      rangeEnd,
      interval,
      width: containerWidth,
      thread: { samples },
    } = this.props;

    // Setup the canvas.
    const devicePixelRatio = window.devicePixelRatio;
    canvas.width = Math.round(containerWidth * devicePixelRatio);
    canvas.height = Math.round(HEIGHT * devicePixelRatio);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'red';
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Compute the largest memory size.
    let maxMemory = 0;
    for (let i = 0; i < samples.length; i++) {
      if (samples.rss[i] !== null && samples.rss[i] > maxMemory) {
        maxMemory = samples.rss[i];
      }
    }

    const rangeLength = rangeEnd - rangeStart;
    const xPixelsPerMs = canvas.width / rangeLength;
    const yPixelsPerMemory = canvas.height / maxMemory;
    const trueIntervalPixelWidth = interval * xPixelsPerMs;
    const multiplier = trueIntervalPixelWidth < 2.0 ? 1.2 : 1.0;
    const drawnIntervalWidth = Math.max(
      0.8,
      trueIntervalPixelWidth * multiplier
    );

    const firstDrawnSampleTime = rangeStart - drawnIntervalWidth / xPixelsPerMs;
    const lastDrawnSampleTime = rangeEnd;

    const firstDrawnSampleIndex = bisection.right(
      samples.time,
      firstDrawnSampleTime
    );
    const afterLastDrawnSampleIndex = bisection.right(
      samples.time,
      lastDrawnSampleTime,
      firstDrawnSampleIndex
    );

    // Enforce a minimum distance so that we don't draw more than 4 samples per
    // pixel.
    const minGapMs = 0.25 / xPixelsPerMs;
    ctx.fillStyle = '#ddd';
    let nextMinTime = -Infinity;
    for (let i = firstDrawnSampleIndex; i < afterLastDrawnSampleIndex; i++) {
      const sampleTime = samples.time[i];
      if (sampleTime < nextMinTime) {
        continue;
      }
      const rssMemory = samples.rss[i];
      if (rssMemory === null) {
        continue;
      }
      const height = rssMemory * yPixelsPerMemory;
      const xPos = (sampleTime - rangeStart) * xPixelsPerMs;
      // draw
      ctx.fillRect(xPos, canvas.height - height, drawnIntervalWidth, height);
      nextMinTime = sampleTime + minGapMs;
    }
  }

  render() {
    const { rangeStart, rangeEnd, threadIndex, thread } = this.props;
    // Only display a memory graph if there is memory to show.
    if (thread.samples.length === 0 || thread.samples.rss[0] === null) {
      return null;
    }
    this._scheduleDraw();

    return (
      <div className="headerMemory">
        <li className="profileThreadHeaderBar">
          <div title="Memory" className="profileThreadHeaderBarThreadLabel">
            <h1 className="profileThreadHeaderBarThreadName">Memory</h1>
          </div>
          <div className="headerMemoryDetails">
            <MemoryTracingMarkerOverview
              className="headerMemoryIntervalMarkerOverview"
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              threadIndex={threadIndex}
              // TODO
              // eslint-disable-next-line react/jsx-no-bind
              onSelect={() => {}}
              // TODO
              isModifyingSelection={false}
            />
            <div
              className="headerMemoryCanvasContainer"
              style={{
                height: HEIGHT,
              }}
            >
              <canvas
                className="headerMemoryCanvas"
                ref={this._takeCanvasRef}
              />
            </div>
          </div>
        </li>
      </div>
    );
  }
}

const options: ExplicitConnectOptions<OwnProps, StateProps, DispatchProps> = {
  mapStateToProps: (state, ownProps) => {
    const { threadIndex } = ownProps;
    const selectors = selectorsForThread(threadIndex);
    const { start, end } = getDisplayRange(state);
    return {
      thread: selectors.getFilteredThread(state),
      threadName: selectors.getFriendlyThreadName(state),
      rangeStart: start,
      rangeEnd: end,
      interval: getProfileInterval(state),
    };
  },
  // mapDispatchToProps: {},
  component: Memory,
};

export default withSize(explicitConnect(options));
