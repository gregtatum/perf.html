/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow

let _generation = 0;
export function uploadBinaryProfileData(): * {
  const xhr = new XMLHttpRequest();
  const generation = _generation++;
  let isAborted = false;

  return {
    abortFunction: (): void => {
      isAborted = true;
      console.log(`!!! ${generation} xhr.onload, status:`, xhr);
      xhr.abort();
    },
    startUpload: (
      data: $TypedArray,
      progressChangeCallback?: number => mixed
    ): Promise<string> =>
      new Promise((resolve, reject) => {
        if (isAborted) {
          reject(new Error('The request was already aborted.'));
          return;
        }

        xhr.onload = () => {
          console.log(`!!! ${generation} xhr.onload, status:`, xhr);
          if (xhr.status === 200) {
            resolve(xhr.responseText);
          } else {
            reject(
              new Error(
                `xhr onload with status != 200, xhr.statusText: ${
                  xhr.statusText
                }`
              )
            );
          }
        };

        xhr.onerror = () => {
          console.log(`!!! ${generation} xhr.onload, error:`, xhr);

          reject(
            new Error(
              `xhr onerror was called, xhr.statusText: ${xhr.statusText}`
            )
          );
        };

        xhr.upload.onprogress = e => {
          if (progressChangeCallback && e.lengthComputable) {
            progressChangeCallback(e.loaded / e.total);
          }
        };

        xhr.open('POST', 'https://profile-store.appspot.com/compressed-store');
        xhr.send(data);
      }),
  };
}
