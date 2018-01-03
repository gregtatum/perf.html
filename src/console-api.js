/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow
import { unserializeProfileOfArbitraryFormat } from './profile-logic/process-profile';
import { getCallTree, CallTree } from './profile-logic/call-tree';
import {
  getCallNodeInfo,
  getFriendlyThreadName,
} from './profile-logic/profile-data';

import type { Profile, Thread } from './types/profile';
import type { CallNodeInfo } from './types/profile-derived';
import type { ImplementationFilter } from './types/actions';

const help: { [string]: string } = {};

type CallTreeOptions = {
  invert?: boolean,
  callNodeInfo?: CallNodeInfo,
  implementationFilter?: ImplementationFilter,
};

function getCallTreePublic(
  profile: Profile,
  thread: Thread,
  options?: CallTreeOptions = {}
): CallTree {
  return getCallTree(
    thread,
    profile.meta.interval,
    options.callNodeInfo ||
      getCallNodeInfo(thread.stackTable, thread.frameTable, thread.funcTable),
    options.implementationFilter || 'combined',
    options.invert || false
  );
}

help.getCallTree = `perf.getCallTree(profile, thread, options)
  Description:
    Get a call tree.
    See: https://github.com/devtools-html/perf.html/blob/master/src/profile-logic/call-tree.js

  Args:
    profile: A profile.
    thread: The thread to analyze, e.g. profile.threads[0]
    options: An optional configuration object
      invert: boolean - Set to true to invert the call tree
      callNodeInfo: Use a pre-computed CallNodeInfo,
      implementationFilter: 'combined', 'js', or 'cpp'

  Example:

`;

help.processProfile = `perf.processProfile(arbitraryProfileFormat)
  Description:

  Args:
    arbitraryProfileFormat:

  Example:
    const pastedProfile = { threads: { ... } };
    const profile = perf.processProfile(pastedProfile);
`;

function getFriendlyThreadNames(profile: Profile) {
  return profile.threads.map(thread =>
    getFriendlyThreadName(profile.threads, thread)
  );
}

help.getFriendlyThreadNames = `perf.getFriendlyThreadNames(profile)
  Description:
    Get the names of the threads as used in the perf.html interface.

  Args:
    profile: A full processed profile

  Returns:
    An array of thread names.

  Example:
    const threadNames = perf.getFriendlyThreadNames(window.profile)
    > ["Main Thread", "Content (1 of 2)", "Content (2 of 2)", "Compositor"]

    const compositorThread = profile.threads[
      threadNames.indexOf("Compositor")
    ]
`;

(window: Object).perf = {
  processProfile: unserializeProfileOfArbitraryFormat,
  getCallTree: getCallTreePublic,
  getFriendlyThreadNames,
  help: (functionName: string) => {
    const text = help[functionName];
    if (text) {
      console.log(text);
    } else {
      if (text) {
        console.log("That function doesn't exist.");
      }
      console.log(`Available functions: ${Object.keys(help).join(', ')}`);
    }
  },
};

console.log(`perf.html console API
---------------------
The full profile is available at:
  window.profile

The current filtered profile is available at:
  window.filteredProfile

A perf API is exposed to help do some quick analysis from the console:
  perf.help(functionName)

The profile can be analyzed with the following functions:
  perf.${Object.keys(help).join('  perf.\n')}
`);
