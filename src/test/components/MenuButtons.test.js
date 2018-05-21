/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow
import * as React from 'react';
import MenuButtons from '../../components/app/MenuButtons';
import renderer from 'react-test-renderer';
import { Provider } from 'react-redux';
import { storeWithProfile } from '../fixtures/stores';
import {
  startSymbolicating,
  doneSymbolicating,
} from '../../actions/receive-profile';

describe('app/MenuButtons', function() {
  it('renders the MenuButtons buttons', () => {
    /**
     * Mock out any created refs for the components with relevant information.
     */
    function createNodeMock(element) {
      if (element.type === 'input') {
        return {
          focus() {},
          select() {},
          blur() {},
        };
      }
      return null;
    }

    const store = storeWithProfile();
    store.dispatch(startSymbolicating());

    const profileSharing = renderer.create(
      <Provider store={store}>
        <MenuButtons />
      </Provider>,
      { createNodeMock }
    );

    expect(profileSharing).toMatchSnapshot();

    store.dispatch(doneSymbolicating());
    expect(profileSharing).toMatchSnapshot();
  });
});
