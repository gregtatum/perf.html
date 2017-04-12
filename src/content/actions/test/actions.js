import { describe, it } from 'mocha';
import { assert } from 'chai';
import * as ProfileViewSelectors from '../../reducers/profile-view';
import * as TimelineSelectors from '../../reducers/timeline-view';
import { storeWithProfile } from './fixtures/stores';
import {
  changeTimelineExpandedThread,
} from '../timeline';

const { selectedThreadSelectors } = ProfileViewSelectors;
const profile = require('../../../common/test/fixtures/profile-2d-canvas.json');

function diffInMilliseconds(start) {
  const hrTime = process.hrtime(start);
  return (hrTime[0] * 1e9 + hrTime[1]) / 1e6;
}

const allStart = process.hrtime();

describe('actions/changeTimelineExpandedThread', function () {
  it('can set one timeline thread as expanded', function () {
    const start = process.hrtime();
    const store = storeWithProfile();
    const threads = ProfileViewSelectors.getThreads(store.getState());

    function isExpanded(thread, threadIndex) {
      return TimelineSelectors.getIsThreadExpanded(store.getState(), threadIndex);
    }

    assert.deepEqual(threads.map(isExpanded), [false, false, false]);

    store.dispatch(changeTimelineExpandedThread(1, true));
    assert.deepEqual(threads.map(isExpanded), [false, true, false]);

    store.dispatch(changeTimelineExpandedThread(2, true));
    assert.deepEqual(threads.map(isExpanded), [false, false, true]);

    store.dispatch(changeTimelineExpandedThread(2, false));
    assert.deepEqual(threads.map(isExpanded), [false, false, false]);

    console.log(`actions/changeTimelineExpandedThread test took ${diffInMilliseconds(start)} milliseconds`);
    console.log(`actions complete test took ${diffInMilliseconds(start)} milliseconds`);
  });
});
