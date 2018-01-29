/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow
import { storeWithProfile } from '../fixtures/stores';
import { getProfileFromTextSamples } from '../fixtures/profiles/make-profile';
import exampleSymbolTable from '../fixtures/example-symbol-table';
import { SymbolStore } from '../../profile-logic/symbol-store.js';
import * as ProfileViewSelectors from '../../reducers/profile-view';
import { resourceTypes } from '../../profile-logic/profile-data';
import { doSymbolicateProfile } from '../../actions/receive-profile';
import {
  changeSelectedCallNode,
  changeExpandedCallNodes,
} from '../../actions/profile-view';
import { formatTree } from '../fixtures/utils';
import fakeIndexedDB from 'fake-indexeddb';
import FDBKeyRange from 'fake-indexeddb/lib/FDBKeyRange';
import { TextDecoder } from 'text-encoding';

/**
 * Symbolication happens across actions and reducers, so test this functionality in
 * its own file.
 */
describe('doSymbolicateProfile', function() {
  function init() {
    const profile = _createUnsymbolicatedProfile();
    const store = storeWithProfile(profile);

    return {
      profile,
      store,
      namesAsFuncIndexes: (names: string[]) =>
        names.map(name => {
          // Get the current thread for every invocation in order to make the tests
          // easier to read.
          const thread = getThread(store.getState());
          const stringIndex = thread.stringTable.indexForString(name);
          return thread.funcTable.name.indexOf(stringIndex);
        }),
      symbolStore: new SymbolStore('test-db', {
        requestSymbolTable: () => Promise.resolve(exampleSymbolTable),
      }),
    };
  }

  const {
    getSelectedCallNodePath,
    getExpandedCallNodePaths,
    getThread,
    getCallTree,
  } = ProfileViewSelectors.selectedThreadSelectors;

  beforeAll(function() {
    window.indexedDB = fakeIndexedDB;
    window.IDBKeyRange = FDBKeyRange;
    window.TextDecoder = TextDecoder;
  });

  afterAll(function() {
    delete window.indexedDB;
    delete window.IDBKeyRange;
    delete window.TextDecoder;
  });

  describe('doSymbolicateProfile', function() {
    it('can symbolicate a profile', async () => {
      const { store: { dispatch, getState }, profile, symbolStore } = init();
      expect(formatTree(getCallTree(getState()))).toEqual([
        '- 0x000a (total: 1, self: —)',
        '  - 0x2000 (total: 1, self: 1)',
        '- 0x0000 (total: 1, self: —)',
        '  - 0x2000 (total: 1, self: 1)',
        '- 0x1a0f (total: 1, self: 1)',
        '- 0x0f0f (total: 1, self: 1)',
      ]);

      await doSymbolicateProfile(dispatch, profile, symbolStore);
      expect(formatTree(getCallTree(getState()))).toEqual([
        // 0x0000 and 0x000a get merged together.
        '- first symbol (total: 2, self: —)',
        '  - last symbol (total: 2, self: 2)',
        '- third symbol (total: 1, self: 1)',
        '- second symbol (total: 1, self: 1)',
      ]);
    });
  });

  describe('merging of functions with different memory addresses, but in the same function', () => {
    it('starts with expanded call nodes of multiple memory addresses', async function() {
      const { store: { dispatch, getState }, namesAsFuncIndexes } = init();

      const threadIndex = 0;
      const selectedCallNodePath = namesAsFuncIndexes(['0x000a', '0x2000']);
      // Both of these expanded nodes are actually in the same function, but
      // they are different memory addresses.
      const expandedCallNodePaths = [['0x000a'], ['0x0000']].map(
        namesAsFuncIndexes
      );

      dispatch(changeSelectedCallNode(threadIndex, selectedCallNodePath));
      dispatch(changeExpandedCallNodes(threadIndex, expandedCallNodePaths));

      expect(getSelectedCallNodePath(getState())).toEqual(selectedCallNodePath);
      expect(getExpandedCallNodePaths(getState())).toEqual(
        expandedCallNodePaths
      );
    });

    it('symbolicates and merges functions in the stored call node paths', async function() {
      const {
        store: { dispatch, getState },
        profile,
        symbolStore,
        namesAsFuncIndexes,
      } = init();

      const threadIndex = 0;

      dispatch(
        changeSelectedCallNode(
          threadIndex,
          namesAsFuncIndexes(['0x000a', '0x2000'])
        )
      );
      // Both of these expanded nodes are actually in the same function, but
      // they are different memory addresses. See exampleSymbolTable and
      // _createUnsymbolicatedProfile().
      dispatch(
        changeExpandedCallNodes(
          threadIndex,
          [['0x000a'], ['0x0000']].map(namesAsFuncIndexes)
        )
      );

      await doSymbolicateProfile(dispatch, profile, symbolStore);
      expect(getSelectedCallNodePath(getState())).toEqual(
        // The CallNodePath is now symbolicated.
        namesAsFuncIndexes(['first symbol', 'last symbol'])
      );

      expect(getExpandedCallNodePaths(getState())).toEqual(
        // Notice how these are duplicated, however they are equivalent.
        // See: https://github.com/devtools-html/perf.html/issues/270
        [['first symbol'], ['first symbol']].map(namesAsFuncIndexes)
      );
    });
  });
});

function _createUnsymbolicatedProfile() {
  const { profile } = getProfileFromTextSamples(
    // "0x000a" and "0x0000" are both in the first symbol, and should be merged.
    // See "exampleSymbolTable" for the actual function boundary ranges.
    `
      0x000a 0x0000 0x1a0f 0x0f0f
      0x2000 0x2000
    `
  );
  const thread = profile.threads[0];

  // Add a mock lib.
  const libIndex = 0;
  thread.libs[libIndex] = {
    start: 0,
    end: 0x4000,
    offset: 0,
    arch: '',
    name: '',
    path: '',
    debugName: '',
    debugPath: '',
    breakpadId: '',
  };

  thread.resourceTable = {
    length: 1,
    lib: [libIndex],
    name: [thread.stringTable.indexForString('example lib')],
    host: [thread.stringTable.indexForString('example host')],
    type: [resourceTypes.library],
  };
  for (let i = 0; i < thread.funcTable.length; i++) {
    thread.funcTable.resource[i] = 0;
  }
  return profile;
}
