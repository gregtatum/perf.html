/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import 'babel-polyfill';
import { SymbolStore } from '../../profile-logic/symbol-store';
import exampleSymbolTable from '../fixtures/example-symbol-table';
import withMockDatabase from '../fixtures/mocks/indexeddb';
import withMockTextDecoder from '../fixtures/mocks/text-decoder';

describe('SymbolStore', function() {
  const symbolStoreName = 'perf-html-async-storage';
  // Compose the mock functions.
  const withMocks = fn => {
    return withMockTextDecoder(() => {
      return withMockDatabase(`${symbolStoreName}-symbol-tables`, fn);
    });
  };

  function createSymbolStore() {
    const symbolProvider = {
      requestSymbolTable: jest.fn(() => Promise.resolve(exampleSymbolTable)),
    };
    const symbolStore = new SymbolStore(symbolStoreName, symbolProvider);
    return { symbolProvider, symbolStore };
  }

  it(
    'should only request symbols from the symbol provider once per library',
    withMocks(async function() {
      const { symbolProvider, symbolStore } = createSymbolStore();
      expect(symbolProvider.requestSymbolTable).not.toHaveBeenCalled();

      const lib1 = { debugName: 'firefox', breakpadId: 'dont-care' };
      const addrsForLib1 = await symbolStore.getFuncAddressTableForLib(lib1);
      expect(symbolProvider.requestSymbolTable).toHaveBeenCalledTimes(1);
      expect(Array.from(addrsForLib1)).toEqual([0, 0xf00, 0x1a00, 0x2000]);

      const secondAndThirdSymbol = await symbolStore.getSymbolsForAddressesInLib(
        [1, 2],
        lib1
      );
      expect(symbolProvider.requestSymbolTable).toHaveBeenCalledTimes(1);
      expect(secondAndThirdSymbol).toEqual(['second symbol', 'third symbol']);

      const lib2 = { debugName: 'firefox2', breakpadId: 'dont-care2' };
      const addrsForLib2 = await symbolStore.getFuncAddressTableForLib(lib2);
      expect(symbolProvider.requestSymbolTable).toHaveBeenCalledTimes(2);
      expect(Array.from(addrsForLib2)).toEqual([0, 0xf00, 0x1a00, 0x2000]);

      const firstAndLastSymbol = await symbolStore.getSymbolsForAddressesInLib(
        [0, 3],
        lib2
      );
      expect(symbolProvider.requestSymbolTable).toHaveBeenCalledTimes(2);
      expect(firstAndLastSymbol).toEqual(['first symbol', 'last symbol']);

      const addrsForLib1AfterTheSecondTime = await symbolStore.getFuncAddressTableForLib(
        lib1
      );
      expect(symbolProvider.requestSymbolTable).toHaveBeenCalledTimes(2);
      expect(addrsForLib1).toEqual(addrsForLib1AfterTheSecondTime);
    })
  );

  it(
    'should persist in DB',
    withMocks(async function() {
      const { symbolProvider, symbolStore } = createSymbolStore();
      const lib = { debugName: 'firefox', breakpadId: 'dont-care' };
      const addrsForLib1 = await symbolStore.getFuncAddressTableForLib(lib);

      // Using another symbol store simulates a page reload
      // Due to https://github.com/dumbmatter/fakeIndexedDB/issues/22 we need to
      // take care to sequence the DB open requests.
      const symbolStore2 = new SymbolStore(symbolStoreName, symbolProvider);

      const addrsForLib2 = await symbolStore2.getFuncAddressTableForLib(lib);

      expect(symbolProvider.requestSymbolTable).toHaveBeenCalledTimes(1);
      expect(addrsForLib2).toEqual(addrsForLib1);
    })
  );
});
