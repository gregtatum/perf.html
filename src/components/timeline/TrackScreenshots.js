/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow

import React, { PureComponent } from 'react';
import { createPortal } from 'react-dom';
import explicitConnect from '../../utils/connect';
import {
  selectorsForThread,
  getCommittedRange,
  getPreviewSelection,
} from '../../reducers/profile-view';
import { withSize, type SizeProps } from '../shared/WithSize';

import type {
  ThreadIndex,
  Thread,
  MarkersTableWithPayload,
} from '../../types/profile';
import type { ScreenshotPayload } from '../../types/markers';
import type { Milliseconds } from '../../types/units';
import type {
  ExplicitConnectOptions,
  ConnectedProps,
} from '../../utils/connect';

import { ensureExists } from '../../utils/flow';
import './TrackScreenshots.css';

type OwnProps = {|
  +threadIndex: ThreadIndex,
  +screenshotId: string,
  ...SizeProps,
|};
type StateProps = {|
  +thread: Thread,
  +rangeStart: Milliseconds,
  +rangeEnd: Milliseconds,
  +screenshots: MarkersTableWithPayload<ScreenshotPayload>,
  +threadName: string,
  +isMakingPreviewSelection: boolean,
|};
type DispatchProps = {||};
type Props = ConnectedProps<OwnProps, StateProps, DispatchProps>;
type State = {|
  offsetX: null | number,
  pageX: null | number,
  containerTop: null | number,
|};

const TRACK_HEIGHT = 50;
const HOVER_HEIGHT = 100;
const HOVER_MAX_WIDTH_RATIO = 1.75;
const IMAGE_CONTAINER_WIDTH = TRACK_HEIGHT * 0.75;

class Screenshots extends PureComponent<Props, State> {
  state = {
    offsetX: null,
    pageX: null,
    containerTop: null,
  };

  _overlayElement = ensureExists(
    document.querySelector('#root-overlay'),
    'Expected to find a root overlay element.'
  );

  findScreenshotAtMouse(offsetX: number): number | null {
    const { width, rangeStart, rangeEnd, screenshots } = this.props;
    const rangeLength = rangeEnd - rangeStart;
    const mouseTime = offsetX / width * rangeLength + rangeStart;
    if (mouseTime < screenshots.time[0]) {
      // Only show a screenshot for the first time we know of.
      return null;
    }
    for (let i = 0; i < screenshots.length; i++) {
      const time = screenshots.time[i];
      if (time >= mouseTime) {
        return i;
      }
    }
    return null;
  }

  renderScreenshotStrip() {
    const {
      thread,
      width: outerContainerWidth,
      rangeStart,
      rangeEnd,
      screenshots,
    } = this.props;
    const images = [];
    let lastRight = 0;
    const rangeLength = rangeEnd - rangeStart;
    const pixelLefts = screenshots.time.map(
      time => outerContainerWidth * (time - rangeStart) / rangeLength
    );
    for (let i = 0; i < screenshots.length; i++) {
      // This strategy is to lay out an image into the next fully available space.
      // This leaves some gaps in the images. It would probably be better to find the
      // next available image that fits, then put the previous image in seamlessly.
      // This way there would be no gaps. Also the images don't really seem to line
      // up correctly right now to the data in the timeline, so perhaps there is some
      // error in the math.
      const { url, windowWidth, windowHeight } = screenshots.data[i];
      const scaledImageWidth = TRACK_HEIGHT * windowWidth / windowHeight;
      const thisLeft = pixelLefts[i];
      const nextLeft = pixelLefts[i + 1];
      if (thisLeft >= lastRight || nextLeft > lastRight) {
        const left = Math.max(thisLeft, lastRight);
        const availableWidth = nextLeft - left;
        const imageContainerWidth = Math.max(
          availableWidth,
          IMAGE_CONTAINER_WIDTH
        );
        const justifyContent =
          imageContainerWidth > scaledImageWidth ? 'left' : 'center';

        images.push(
          <div
            className="timelineTrackScreenshotImgContainer"
            style={{ left, width: imageContainerWidth, justifyContent }}
          >
            <img
              className="timelineTrackScreenshotImg"
              key={i}
              src={thread.stringTable.getString(url)}
              style={{
                width: scaledImageWidth,
                height: TRACK_HEIGHT,
              }}
            />
          </div>
        );
        lastRight = left + imageContainerWidth;
      }
    }
    return images;
  }

  renderHoverPreview() {
    const { pageX, offsetX, containerTop } = this.state;
    const { screenshots, thread, isMakingPreviewSelection, width } = this.props;
    if (isMakingPreviewSelection || offsetX === null || pageX === null) {
      return null;
    }
    const screenshotIndex = this.findScreenshotAtMouse(offsetX);
    if (screenshotIndex === null) {
      return null;
    }
    const { url, windowWidth, windowHeight } = screenshots.data[
      screenshotIndex
    ];

    // Compute the hover image's thumbnail size.
    let hoverHeight = HOVER_HEIGHT;
    let hoverWidth = HOVER_HEIGHT / windowHeight * windowWidth;

    if (hoverWidth > HOVER_HEIGHT * HOVER_MAX_WIDTH_RATIO) {
      // This is a really wide image, limit the height so it lays out reasonably.
      hoverWidth = HOVER_HEIGHT * HOVER_MAX_WIDTH_RATIO;
      hoverHeight = hoverWidth / windowWidth * windowHeight;
    }
    // Set the top so it centers around the track.
    const top = containerTop + (TRACK_HEIGHT - hoverHeight) * 0.5;
    const left =
      offsetX + hoverWidth * 0.5 > width
        ? // Stick the hover image on to the right side of the container.
          pageX - offsetX + width - hoverWidth * 0.5
        : // Center the hover image around the mouse.
          pageX;

    return createPortal(
      <div className="timelineTrackScreenshotHover" style={{ left, top }}>
        <img
          className="timelineTrackScreenshotHoverImg"
          src={thread.stringTable.getString(url)}
          style={{
            height: hoverHeight,
            width: hoverWidth,
          }}
        />
      </div>,
      this._overlayElement
    );
  }

  _handleMouseOut = () => {
    this.setState({
      offsetX: null,
      pageX: null,
      containerTop: null,
    });
  };

  _handleMouseMove = (event: SyntheticMouseEvent<HTMLDivElement>) => {
    const { top, left } = event.currentTarget.getBoundingClientRect();
    this.setState({
      pageX: event.pageX,
      offsetX: event.pageX - left,
      containerTop: top,
    });
  };

  render() {
    return (
      <div
        className="timelineTrackScreenshot"
        style={{ height: TRACK_HEIGHT }}
        onMouseOut={this._handleMouseOut}
        onMouseMove={this._handleMouseMove}
      >
        {this.renderScreenshotStrip()}
        {this.renderHoverPreview()}
      </div>
    );
  }
}

const options: ExplicitConnectOptions<OwnProps, StateProps, DispatchProps> = {
  mapStateToProps: (state, ownProps) => {
    const { threadIndex, screenshotId } = ownProps;
    const selectors = selectorsForThread(threadIndex);
    const { start, end } = getCommittedRange(state);
    const previewSelection = getPreviewSelection(state);
    return {
      thread: selectors.getRangeFilteredThread(state),
      screenshots: ensureExists(
        selectors.getScreenshotMarkersById(state).get(screenshotId),
        'Expected to find screenshots for the given pid'
      ),
      threadName: selectors.getFriendlyThreadName(state),
      rangeStart: start,
      rangeEnd: end,
      isMakingPreviewSelection:
        previewSelection.hasSelection && previewSelection.isModifying,
    };
  },
  // mapDispatchToProps: {},
  component: Screenshots,
};

export default withSize(explicitConnect(options));
