/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow
import fakeIndexedDB from 'fake-indexeddb';
import FDBKeyRange from 'fake-indexeddb/lib/FDBKeyRange';

function _deleteDatabase(dbName: string) {
  return new Promise((resolve, reject) => {
    const req = fakeIndexedDB.deleteDatabase(dbName);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * This function mocks out the indexedDB as an in-memory database while fn is running.
 */
export default function withMockDatabase<T: Function>(dbName: string, fn: T) {
  return async () => {
    if (window.indexedDB) {
      throw new Error(
        'Attempting to mock indexedDB, but found an existing value on window.indexedDB.'
      );
    }
    window.indexedDB = fakeIndexedDB;
    if (window.IDBKeyRange) {
      throw new Error(
        'Attempting to mock IDBKeyRange, but found an existing value on window.IDBKeyRange.'
      );
    }
    window.IDBKeyRange = FDBKeyRange;

    const response = await fn();

    delete window.indexedDB;
    delete window.IDBKeyRange;
    await _deleteDatabase(dbName);

    return response;
  };
}
