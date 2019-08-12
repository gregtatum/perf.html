/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow
import React from 'react';
import { Provider } from 'react-redux';
import { render } from 'react-testing-library';
import { storeWithProfile } from '../fixtures/stores';
import { getProfileFromTextSamples } from '../fixtures/profiles/processed-profile';
import { changeSelectedCallNode } from '../../actions/profile-view';
import { TooltipCallNode } from '../../components/tooltip/CallNode';
import { ensureExists } from '../../utils/flow';
import { selectedThreadSelectors } from '../../selectors/per-thread';
import { getTimingsForCallNodeIndex } from '../../profile-logic/profile-data';
import type { Thread } from '../../types/profile';

/**
 * Test the logic of the TooltipCallNode. Note that this test is not using a connected
 * component, and is manually connected to the store. The FlameGraph and StackChart
 * each implement the tooltip slightly differently using component state. This
 * makes it a bit hard to test in those components, especially as they are canvas
 * chart based.
 */
describe('TooltipCallNode', function() {
  const textSamples = `
    A[cat:DOM]       A[cat:DOM]       A[cat:DOM]
    B[cat:DOM]       B[cat:DOM]       B[cat:DOM]
    C[cat:Graphics]  C[cat:Graphics]
    D[cat:Graphics]  F[cat:Graphics]
    E[cat:Graphics]  G[cat:Graphics]
  `;
  it('matches the snapshot', function() {
    const { container } = setup({
      textSamples,
      callNodePath: ['A', 'B'],
    });
    expect(container).toMatchSnapshot();
  });

  it('has the category DOM', function() {
    const { matchAdjacentTextElements } = setup({
      textSamples,
      callNodePath: ['A', 'B'],
    });
    matchAdjacentTextElements('Category:', 'DOM');
  });

  it('can also view the category Graphics', function() {
    const { matchAdjacentTextElements } = setup({
      textSamples,
      callNodePath: ['A', 'B', 'C'],
    });
    matchAdjacentTextElements('Category:', 'Graphics');
  });

  it('shows duration information about the function', function() {
    const { matchAdjacentTextElements } = setup({
      textSamples,
      callNodePath: ['A', 'B'],
    });
    matchAdjacentTextElements('Fake Duration 33%', 'B');
  });

  it('shows the stack type', function() {
    const { matchAdjacentTextElements } = setup({
      textSamples,
      callNodePath: ['A', 'B'],
    });
    matchAdjacentTextElements('Stack Type:', 'Label');
  });

  it('shows the file path', function() {
    const { matchAdjacentTextElements } = setup({
      textSamples,
      callNodePath: ['A', 'B'],
    });
    matchAdjacentTextElements('File:', 'path/to/file:11:101');
  });

  fdescribe('stack types', function() {
    it('shows a native stack label', function() {
      const { getStackTypeLabel } = setup({
        textSamples: 'MyFuncName[lib:libxul]',
        callNodePath: ['MyFuncName'],
      });
      expect(getStackTypeLabel()).toEqual('Native');
    });

    it('shows JS stack types', function() {
      const { getStackTypeLabel } = setup({
        textSamples: 'MyFuncName.js',
        callNodePath: ['MyFuncName.js'],
      });
      expect(getStackTypeLabel()).toEqual('JavaScript');
    });

    it('shows frame label stack types', function() {
      const { getStackTypeLabel } = setup({
        modifyThread: thread => {
          // Frames labels do not have addresses.
          thread.funcTable.address[0] = -1;
        },
        textSamples: 'MyFuncName[cat:Graphics]',
        callNodePath: ['MyFuncName'],
      });

      expect(getStackTypeLabel()).toEqual('Label');
    });

    it('shows frame label stack types', function() {
      const { getStackTypeLabel } = setup({
        modifyThread: thread => {
          // JIT frames do not have the address filled in, and they do not have
          // a category.
          thread.funcTable.address[0] = -1;
          thread.frameTable.category[0] = null;
        },
        textSamples: 'OxFFFFFF',
        callNodePath: ['OxFFFFFF'],
      });

      expect(getStackTypeLabel()).toEqual(
        'Unsymbolicated or generated JIT instructions'
      );
    });

    it('the (root) frame label does not have a category, still treat it as a frame label.', function() {
      const { getStackTypeLabel } = setup({
        modifyThread: thread => {
          // This looks like the Unsymbolicated stack type, but instead is still a frame
          // label. This is the one special case for frame labels.
          thread.funcTable.address[0] = -1;
          thread.frameTable.category[0] = null;
        },
        textSamples: '(root)',
        callNodePath: ['(root)'],
      });

      expect(getStackTypeLabel()).toEqual('Label');
    });
  });
});

type TestArgs = {|
  +textSamples: string,
  +callNodePath: string[],
  +modifyThread?: Thread => void,
|};

function setup({ callNodePath, textSamples, modifyThread }: TestArgs): * {
  const {
    profile,
    funcNamesPerThread: [funcNames],
    funcNamesDictPerThread: [funcNamesDict],
  } = getProfileFromTextSamples(textSamples);

  // Add some file and line number to the profile so that tooltips generate
  // an interesting snapshot.
  const thread = profile.threads[0];
  const { funcTable, stringTable } = thread;
  for (let funcIndex = 0; funcIndex < funcTable.length; funcIndex++) {
    funcTable.lineNumber[funcIndex] = funcIndex + 10;
    funcTable.columnNumber[funcIndex] = funcIndex + 100;
    funcTable.fileName[funcIndex] = stringTable.indexForString('path/to/file');
  }
  if (modifyThread) {
    modifyThread(thread);
  }

  const store = storeWithProfile(profile);
  const { dispatch, getState } = store;
  dispatch(
    changeSelectedCallNode(
      0,
      callNodePath.map(funcName => funcNamesDict[funcName])
    )
  );

  const interval = 1;
  const callNodeIndex = ensureExists(
    selectedThreadSelectors.getSelectedCallNodeIndex(getState()),
    'The test assumes there will be a selected call node index'
  );
  const callNodeInfo = selectedThreadSelectors.getCallNodeInfo(getState());

  // It's really not ideal to have this manually connected using OwnProps, but the
  // FlameGraph and StackChart each control tooltips by not using the store.
  const renderResult = render(
    <Provider store={store}>
      <TooltipCallNode
        thread={selectedThreadSelectors.getFilteredThread(getState())}
        interval={1}
        callNodeIndex={callNodeIndex}
        callNodeInfo={callNodeInfo}
        categories={profile.meta.categories}
        durationText="Fake Duration 33%"
        callTree={selectedThreadSelectors.getCallTree(getState())}
        timings={getTimingsForCallNodeIndex(
          callNodeIndex,
          callNodeInfo,
          interval,
          false, // isInverted
          selectedThreadSelectors.getFilteredThread(getState()),
          profile.meta.categories
        )}
      />
    </Provider>
  );

  function matchAdjacentTextElements(...textsToMatch: string[]) {
    let indexToMatch = 0;
    try {
      renderResult.getByText(text => {
        const textToMatch = textsToMatch[indexToMatch];
        const currentMatches = textToMatch === text;
        if (currentMatches) {
          indexToMatch++;
          if (indexToMatch === textsToMatch.length) {
            return true;
          }
        } else {
          // Reset the matching index.
          indexToMatch = 0;
        }
        return false;
      });
    } catch (error) {
      renderResult.debug();
      const text = JSON.stringify(textsToMatch);
      throw new Error(`Could not find adjacent elements that match: ${text}`);
    }
  }

  // This helper gets text element after 'Stack Type:'.
  function getStackTypeLabel() {
    let stackTypeFound = false;
    return renderResult.getByText(text => {
      if (stackTypeFound) {
        return true;
      }
      if (text === 'Stack Type:') {
        stackTypeFound = true;
      }
      return false;
    }).innerHTML;
  }

  return {
    ...store,
    ...renderResult,
    thread,
    funcNames,
    matchAdjacentTextElements,
    getStackTypeLabel,
  };
}
