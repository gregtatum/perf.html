/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow

import { getZippedProfiles } from '../fixtures/profiles/zip-file';
import * as ProfileViewSelectors from '../../reducers/profile-view';
import * as ZippedProfilesSelectors from '../../reducers/zipped-profiles';
import createStore from '../../create-store';
import { mockConsoleError } from '../fixtures/mocks/console-error';
import { waitUntilState } from '../fixtures/utils';
import JSZip from 'jszip';

import * as ZippedProfilesActions from '../../actions/zipped-profiles';
import * as ReceiveProfileActions from '../../actions/receive-profile';
import type { ZipFileTable } from '../../profile-logic/zip-files';

describe('zipFile', function() {
  /**
   * Transform the zip file data structure into a human readable string to easily
   * assert the tree structure of the table.
   */
  function formatZipFileTable(zipFileTable: ZipFileTable): string[] {
    if (!zipFileTable) {
      return [];
    }
    // Remember a computed depth, given an index.
    const indexToDepth = new Map();
    // If no prefix, start at -1, so that the next depth gets computed to 0.
    indexToDepth.set(null, -1);
    const result = [];
    for (let i = 0; i < zipFileTable.length; i++) {
      // Pull out the values
      const prefix = zipFileTable.prefix[i];
      const partName = zipFileTable.partName[i];
      const type = zipFileTable.file[i] ? 'file' : 'dir';

      // Compute the depth and whitespace
      const prefixDepth = indexToDepth.get(prefix);
      const depth = prefixDepth + 1;
      const whitespace = Array(depth * 2 + 1).join(' ');

      // Remember the depth.
      indexToDepth.set(i, depth);
      result.push(`${whitespace}${partName} (${type})`);
    }
    return result;
  }

  async function storeWithZipFile() {
    const store = createStore();
    const zippedProfiles = getZippedProfiles();
    store.dispatch(ReceiveProfileActions.receiveZipFile(zippedProfiles));
    return {
      store,
      dispatch: store.dispatch,
      getState: store.getState,
      zippedProfiles,
    };
  }

  it('can store the zip file in the reducer', async function() {
    const { zippedProfiles } = await storeWithZipFile();
    expect(zippedProfiles).toBe(zippedProfiles);
  });

  it('can load a profile from the zip file', async function() {
    const { store, dispatch, getState } = await storeWithZipFile();
    expect(ProfileViewSelectors.getProfileOrNull(getState())).toEqual(null);

    dispatch(
      ZippedProfilesActions.viewProfileFromZipFilePath('foo/bar/profile1.json')
    );

    await waitUntilState(
      store,
      state =>
        ZippedProfilesSelectors.getZipFileState(state).phase ===
        'VIEW_PROFILE_IN_ZIP_FILE'
    );

    const profile1 = ProfileViewSelectors.getProfile(getState());

    expect(profile1).toBeTruthy();
  });

  it('will fail when trying to load an invalid profile', async function() {
    const store = createStore();
    const { getState, dispatch } = store;
    const zip = new JSZip();
    zip.file('not-a-profile.json', 'not a profile');
    dispatch(ReceiveProfileActions.receiveZipFile(zip));

    const clearMock = mockConsoleError();
    dispatch(
      ZippedProfilesActions.viewProfileFromZipFilePath('not-a-profile.json')
    );

    await waitUntilState(
      store,
      state =>
        ZippedProfilesSelectors.getZipFileState(state).phase ===
        'FAILED_TO_PROCESS_PROFILE_FROM_ZIP_FILE'
    );

    expect(ZippedProfilesSelectors.getZipFileState(getState()).phase).toEqual(
      'FAILED_TO_PROCESS_PROFILE_FROM_ZIP_FILE'
    );
    // console error was called.
    expect(console.error.mock.calls.length >= 1).toEqual(true);
    expect(console.error.mock.calls).toMatchSnapshot();
    clearMock();
  });

  it('will fail when not finding a profile', async function() {
    const store = createStore();
    const { getState, dispatch } = store;
    dispatch(ReceiveProfileActions.receiveZipFile(new JSZip()));
    dispatch(
      ZippedProfilesActions.viewProfileFromZipFilePath('nothing-here.json')
    );

    expect(ZippedProfilesSelectors.getZipFileState(getState()).phase).toEqual(
      'FILE_NOT_FOUND_IN_ZIP_FILE'
    );
  });

  it('can compute a ZipFileTable', async function() {
    const { getState } = await storeWithZipFile();
    const zipFileTable = ZippedProfilesSelectors.getZipFileTable(getState());
    expect(formatZipFileTable(zipFileTable)).toEqual([
      'foo (dir)',
      '  bar (dir)',
      '    profile1.json (file)',
      '  profile2.json (file)',
      '  profile3.json (file)',
      '  profile4.json (file)',
      'baz (dir)',
      '  profile5.json (file)',
    ]);
  });

  it('computes the zip file max depth', async function() {
    const { getState } = await storeWithZipFile();
    expect(ZippedProfilesSelectors.getZipFileMaxDepth(getState())).toEqual(2);
  });

  describe('ZipFileTree', function() {
    async function initStoreAndZipFileTree() {
      const { getState } = await storeWithZipFile();

      const zipFileTree = ZippedProfilesSelectors.getZipFileTree(getState());
      const zipFileTable = ZippedProfilesSelectors.getZipFileTable(getState());

      const indexesToPartName = indexes =>
        indexes.map(index => {
          return zipFileTable.partName[index];
        });
      return {
        getState,
        zipFileTree,
        zipFileTable,
        indexesToPartName,
      };
    }

    it('can get the tree roots', async function() {
      const {
        zipFileTree,
        indexesToPartName,
      } = await initStoreAndZipFileTree();
      expect(indexesToPartName(zipFileTree.getRoots())).toEqual(['foo', 'baz']);
    });

    it('can get children', async function() {
      const {
        zipFileTree,
        indexesToPartName,
      } = await initStoreAndZipFileTree();
      const [fooIndex, bazIndex] = zipFileTree.getRoots();
      const fooChildren = indexesToPartName(zipFileTree.getChildren(fooIndex));
      const bazChildren = indexesToPartName(zipFileTree.getChildren(bazIndex));

      expect(fooChildren).toEqual([
        'bar',
        'profile2.json',
        'profile3.json',
        'profile4.json',
      ]);
      expect(bazChildren).toEqual(['profile5.json']);
    });

    it('can see if a node has children', async function() {
      const { zipFileTree } = await initStoreAndZipFileTree();
      const [fooIndex, bazIndex] = zipFileTree.getRoots();
      const [barIndex, profile2Index, profile3Index] = zipFileTree.getChildren(
        fooIndex
      );

      expect(zipFileTree.hasChildren(fooIndex)).toBe(true);
      expect(zipFileTree.hasChildren(bazIndex)).toBe(true);
      expect(zipFileTree.hasChildren(barIndex)).toBe(true);
      expect(zipFileTree.hasChildren(profile2Index)).toBe(false);
      expect(zipFileTree.hasChildren(profile3Index)).toBe(false);
    });

    it('can get all descendants', async function() {
      const {
        zipFileTree,
        indexesToPartName,
      } = await initStoreAndZipFileTree();
      const [fooIndex] = zipFileTree.getRoots();
      const descendantsOfFoo = indexesToPartName([
        ...zipFileTree.getAllDescendants(fooIndex),
      ]);
      expect(descendantsOfFoo).toEqual([
        'bar',
        'profile1.json',
        'profile2.json',
        'profile3.json',
        'profile4.json',
      ]);
    });

    it('can see if a node has parents', async function() {
      const { zipFileTree } = await initStoreAndZipFileTree();
      const [fooIndex, bazIndex] = zipFileTree.getRoots();
      const [barIndex, profile2Index, profile3Index] = zipFileTree.getChildren(
        fooIndex
      );

      expect(zipFileTree.getParent(fooIndex)).toBe(-1);
      expect(zipFileTree.getParent(bazIndex)).toBe(-1);
      expect(zipFileTree.getParent(barIndex)).toBe(fooIndex);
      expect(zipFileTree.getParent(profile2Index)).toBe(fooIndex);
      expect(zipFileTree.getParent(profile3Index)).toBe(fooIndex);
    });

    it('can get the depth of a node', async function() {
      const { zipFileTree } = await initStoreAndZipFileTree();
      const [fooIndex, bazIndex] = zipFileTree.getRoots();
      const [barIndex, profile2Index, profile3Index] = zipFileTree.getChildren(
        fooIndex
      );

      expect(zipFileTree.getDepth(fooIndex)).toBe(0);
      expect(zipFileTree.getDepth(bazIndex)).toBe(0);
      expect(zipFileTree.getDepth(barIndex)).toBe(1);
      expect(zipFileTree.getDepth(profile2Index)).toBe(1);
      expect(zipFileTree.getDepth(profile3Index)).toBe(1);
    });

    it('can get compute display data', async function() {
      const { zipFileTree } = await initStoreAndZipFileTree();
      const [fooIndex, bazIndex] = zipFileTree.getRoots();
      const [barIndex, profile2Index, profile3Index] = zipFileTree.getChildren(
        fooIndex
      );

      expect(zipFileTree.getDisplayData(fooIndex)).toMatchSnapshot();
      expect(zipFileTree.getDisplayData(bazIndex)).toMatchSnapshot();
      expect(zipFileTree.getDisplayData(barIndex)).toMatchSnapshot();
      expect(zipFileTree.getDisplayData(profile2Index)).toMatchSnapshot();
      expect(zipFileTree.getDisplayData(profile3Index)).toMatchSnapshot();
    });
  });
});
