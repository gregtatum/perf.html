/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow
import * as React from 'react';
import FlameGraph from '../../components/flame-graph';
import { Provider } from 'react-redux';
import mockCanvasContext from '../fixtures/mocks/canvas-context';
import { storeWithProfile } from '../fixtures/stores';
import {
  getBoundingBox,
  addRootOverlayElement,
  removeRootOverlayElement,
  polyfillMouseEvent,
} from '../fixtures/utils';
import { getProfileFromTextSamples } from '../fixtures/profiles/processed-profile';
import { changeInvertCallstack } from '../../actions/profile-view';
import mockRaf from '../fixtures/mocks/request-animation-frame';
import { render, cleanup, fireEvent } from 'react-testing-library';
import { getInvertCallstack } from '../../selectors/url-state';
import { ensureExists } from '../../utils/flow';

const GRAPH_WIDTH = 200;
const GRAPH_HEIGHT = 300;

describe('FlameGraph', function() {
  afterEach(cleanup);
  afterEach(removeRootOverlayElement);
  beforeEach(addRootOverlayElement);
  polyfillMouseEvent();

  it('matches the snapshot', () => {
    const { ctx, container } = setupFlameGraph();
    const drawCalls = ctx.__flushDrawLog();

    expect(container.firstChild).toMatchSnapshot();
    expect(drawCalls).toMatchSnapshot();
  });

  it('renders a message instead of the graph when call stack is inverted', () => {
    const { getByText, dispatch } = setupFlameGraph();
    dispatch(changeInvertCallstack(true));
    expect(getByText(/The Flame Graph is not available/)).toBeDefined();
  });

  it('switches back to uninverted mode when clicking the button', () => {
    const { getByText, dispatch, getState } = setupFlameGraph();
    dispatch(changeInvertCallstack(true));
    expect(getInvertCallstack(getState())).toBe(true);
    fireEvent.click(getByText(/Switch to the normal call stack/));
    expect(getInvertCallstack(getState())).toBe(false);
  });

  it('shows a tooltip when hovering', () => {
    const { container, getTooltip } = setupFlameGraph();

    expect(getTooltip()).toBe(null);

    const canvas = ensureExists(container.querySelector('canvas'));
    fireEvent.mouseMove(canvas, {
      clientX: GRAPH_WIDTH * 0.5,
      clientY: GRAPH_HEIGHT - 3,
    });

    expect(getTooltip()).toBeTruthy();
  });

  it('has a tooltip that matches the screenshot', () => {
    const { container, getTooltip } = setupFlameGraph();

    const canvas = ensureExists(container.querySelector('canvas'));
    fireEvent.mouseMove(canvas, {
      clientX: GRAPH_WIDTH * 0.5,
      clientY: GRAPH_HEIGHT - 3,
    });

    expect(getTooltip()).toMatchSnapshot();
  });
});

function setupFlameGraph() {
  const flushRafCalls = mockRaf();
  const ctx = mockCanvasContext();

  jest
    .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
    .mockImplementation(() => getBoundingBox(GRAPH_WIDTH, GRAPH_HEIGHT));

  jest
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockImplementation(() => ctx);

  const { profile } = getProfileFromTextSamples(`
    A[cat:DOM]       A[cat:DOM]       A[cat:DOM]
    B[cat:DOM]       B[cat:DOM]       B[cat:DOM]
    C[cat:Graphics]  C[cat:Graphics]  H[cat:Network]
    D[cat:Graphics]  F[cat:Graphics]  I[cat:Network]
    E[cat:Graphics]  G[cat:Graphics]
  `);

  const store = storeWithProfile(profile);

  const renderResult = render(
    <Provider store={store}>
      <FlameGraph />
    </Provider>
  );

  flushRafCalls();

  /**
   * The tooltip is in a portal, and created in the root overlay elements.
   */
  function getTooltip() {
    return document.querySelector('#root-overlay .tooltip');
  }

  return { ...renderResult, ...store, ctx, getTooltip };
}
