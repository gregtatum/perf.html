import React, { PureComponent } from 'react';

require('./Tooltip.css');

type Props = {
  mouseX: CssPixels,
  mouseY: CssPixels,
  offsetParent: HTMLElement,
  boundedAtBottom: boolean,
}

export default class Tooltip extends PureComponent {
  state: {
    interiorElement: ?HTMLElement,
  }

  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    // Use offset values rather than getBoundingClientRect because sub-pixel accuracy
    // isn't needed.
    const { children, mouseX, mouseY, offsetParent, boundedAtBottom } = this.props;
    const { offsetWidth, offsetHeight, offsetTop } = offsetParent;

    const style = {
      width: offsetWidth / 2,
    };

    if (mouseX > offsetWidth / 2) {
      style.right = offsetWidth - mouseX;
      style.textAlign = 'right';
    } else {
      style.left = mouseX;
    }

    const { interiorElement } = this.state;

    if (
      boundedAtBottom &&
      interiorElement &&
      mouseY + interiorElement.offsetHeight + 15 > offsetHeight + offsetTop
    ) {
      style.bottom = 0;
      style.height = interiorElement.offsetHeight;
    } else {
      style.top = mouseY;
    }

    return (
      <div className='tooltip' style={style}>
        <div className='tooltipInterior'
             ref={el => this.setState({ interiorElement: el })}>
          {children}
        </div>
      </div>
    );
  }
}
