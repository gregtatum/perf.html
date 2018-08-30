/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow

import { getTracingMarkers } from '../../profile-logic/marker-data';
import { processProfile } from '../../profile-logic/process-profile';
import { getTimeRangeIncludingAllThreads } from '../../profile-logic/profile-data';
import getGeckoProfile from '.././fixtures/profiles/gecko-profile';

describe('getTracingMarkers', function() {
  const profile = processProfile(getGeckoProfile());
  const thread = profile.threads[0];
  const rootRange = getTimeRangeIncludingAllThreads(profile);
  const tracingMarkers = getTracingMarkers(
    thread.markers,
    thread.stringTable,
    rootRange
  );

  it('creates 10 tracing markers given the test data', function() {
    expect(tracingMarkers.length).toEqual(10);
  });
  it('creates a tracing marker even if there is no start or end time', function() {
    expect(tracingMarkers[1]).toMatchObject({
      start: 2,
      duration: null,
      name: 'VsyncTimestamp',
      title: null,
    });
  });
  it('should create a tracing marker', function() {
    expect(tracingMarkers[2]).toMatchObject({
      start: 3,
      duration: 5,
      name: 'Reflow',
      title: null,
    });
  });
  it('should fold the two reflow markers into one tracing marker', function() {
    expect(tracingMarkers.length).toEqual(10);
    expect(tracingMarkers[2]).toMatchObject({
      start: 3,
      duration: 5,
      name: 'Reflow',
      title: null,
    });
  });
  it('should fold the two Rasterize markers into one tracing marker, after the reflow tracing marker', function() {
    expect(tracingMarkers[3]).toMatchObject({
      start: 4,
      duration: 1,
      name: 'Rasterize',
      title: null,
    });
  });
  it('should create a tracing marker for the MinorGC startTime/endTime marker', function() {
    expect(tracingMarkers[5]).toMatchObject({
      start: 11,
      duration: 1,
      name: 'MinorGC',
      title: null,
    });
  });
  it('should create a tracing marker for the DOMEvent marker', function() {
    expect(tracingMarkers[4]).toMatchObject({
      duration: 1,
      name: 'DOMEvent',
      start: 9,
      title: null,
    });
  });
  it('should create a tracing marker for the marker UserTiming', function() {
    expect(tracingMarkers[6]).toMatchObject({
      duration: 1,
      name: 'UserTiming',
      start: 12,
      title: null,
    });
  });
  it('should handle tracing markers without a start', function() {
    expect(tracingMarkers[0]).toMatchObject({
      start: -1,
      duration: 2, // This duration doesn't represent much and won't be displayed anyway
      name: 'Rasterize',
      title: null,
    });
  });
  it('should handle tracing markers without an end', function() {
    expect(tracingMarkers[9]).toMatchObject({
      start: 20,
      duration: Infinity,
      name: 'Rasterize',
      title: null,
    });
  });
  it('should handle nested tracing markers correctly', function() {
    expect(tracingMarkers[7]).toMatchObject({
      start: 13,
      duration: 5,
      name: 'Reflow',
      title: null,
    });
    expect(tracingMarkers[8]).toMatchObject({
      start: 14,
      duration: 1,
      name: 'Reflow',
      title: null,
    });
  });
});
