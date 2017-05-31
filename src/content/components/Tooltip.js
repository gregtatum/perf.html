/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow
import React, { PureComponent } from 'react';
import ReactDOM from 'react-dom';
import type { CssPixels } from '../../common/types/units';

require('./Tooltip.css');

type Props = {
  mouseX: CssPixels,
  mouseY: CssPixels,
  children?: React$Element<*>,
}

export default class Tooltip extends PureComponent {
  props: Props;

  state: {
    interiorElement: HTMLElement | null,
    interiorElementRAF: HTMLElement | null,
  };

  _mountElement: ?HTMLElement;

  constructor(props: Props) {
    super(props);
    (this: any)._getMountElement = this._getMountElement.bind(this);
    this.state = {
      interiorElement: null,
      interiorElementRAF: null,
    };
  }

  _getMountElement(el: HTMLElement) {
    this.setState({ interiorElement: el });
  }

  componentDidMount() {
    // Create a DOM node outside of the normal heirarchy.
    const el = document.createElement('div');
    el.className = 'tooltipMount';

    // Satisfy flow null checks.
    if (!document.body) {
      throw new Error('No document body was found to append to.');
    }
    document.body.appendChild(el);
    this._mountElement = el;
    this._renderTooltipContents();
  }

  componentWillUnmount() {
    ReactDOM.unmountComponentAtNode(this._mountElement);
    // Satisfy flow null checks.
    if (this._mountElement) {
      this._mountElement.remove();
    }
  }

  componentWillReceiveProps(nextProps: Props) {
    if (nextProps.children !== this.props.children) {
      this.setState({interiorElementRAF: null });
      this._allowInteriorElementLayout();
    }
  }

  componentDidUpdate() {
    this._allowInteriorElementLayout();
    this._renderTooltipContents();
  }

  _allowInteriorElementLayout() {
    const { interiorElement, interiorElementRAF } = this.state;
    if (interiorElement && !interiorElementRAF) {
      // Allow the interior element to fully lay out, then update the sizing.
      requestAnimationFrame(() => {
        this.setState({ interiorElementRAF: interiorElement });
      });
    }
  }

  /**
   * This is really ugly, but the tooltip needs to be outside of the normal
   * DOM heirarchy so it isn't clipped by some arbitrary stacking context.
   */
  _renderTooltipContents() {
    const { children, mouseX, mouseY } = this.props;
    const { interiorElement } = this.state;

    const offsetX = interiorElement
      ? Math.max(0, (mouseX + interiorElement.offsetWidth) - window.innerWidth)
      : 0;

    const offsetY = interiorElement
      ? Math.max(0, (mouseY + interiorElement.offsetHeight + 15) - window.innerHeight)
      : 0;

    const style = {
      left: mouseX - offsetX,
      top: mouseY - offsetY,
    };

    ReactDOM.render(
        <div className='tooltip' style={style} ref={this._getMountElement}>
          {children}
        </div>,
      this._mountElement
    );
  }

  render() {
    return null;
  }
}
