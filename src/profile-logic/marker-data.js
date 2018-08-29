/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow

import type {
  MarkerSlug,
  BailoutPayload,
  VsyncTimestampPayload_Gecko,
  VsyncTimestampPayload,
} from '../types/markers';
import type {
  UnmatchedMarkersTable,
  IndexIntoStringTable,
  IndexIntoMarkersTable,
  Thread,
} from '../types/profile';
import type {
  MarkersTableByType,
  MarkersTable,
} from '../types/profile-derived';
import type { Milliseconds, StartEndRange } from '../types/units';
import type { UniqueStringArray } from '../utils/unique-string-array';

import { sortDataTable } from '../utils/data-table-utils';
import { getNumberPropertyOrNull } from '../utils/flow';

export function filterMarkersToType<T: MarkerSlug, Payload: { +type: T }>(
  markers: MarkersTable,
  type: T
): MarkersTableByType<Payload> {
  const newMarkers: MarkersTableByType<Payload> = {
    startTime: [],
    endTime: [],
    duration: [],
    type: [],
    name: [],
    title: [],
    data: [],
    length: 0,
  };

  for (let markerIndex = 0; markerIndex < markers.length; markerIndex++) {
    if (markers.type[markerIndex] === type) {
      // Flow isn't really able to refine this better, so help it along.
      const data = ((markers.data[markerIndex]: any): Payload);
      newMarkers.data.push(data);

      // Add the remaining information.
      newMarkers.startTime.push(markers.startTime[markerIndex]);
      newMarkers.endTime.push(markers.endTime[markerIndex]);
      newMarkers.duration.push(markers.duration[markerIndex]);
      newMarkers.type.push(markers.type[markerIndex]);
      newMarkers.name.push(markers.name[markerIndex]);
      newMarkers.title.push(markers.title[markerIndex]);
      newMarkers.length++;
    }
  }
  return newMarkers;
}

export function filterMarkersForMarkerChart(
  markers: MarkersTable
): MarkersTableByType<*> {
  const newMarkers: MarkersTableByType<*> = {
    startTime: [],
    endTime: [],
    duration: [],
    type: [],
    name: [],
    title: [],
    data: [],
    length: 0,
  };

  for (let markerIndex = 0; markerIndex < markers.length; markerIndex++) {
    if (markers.type[markerIndex] !== 'Network') {
      newMarkers.startTime.push(markers.startTime[markerIndex]);
      newMarkers.endTime.push(markers.endTime[markerIndex]);
      newMarkers.duration.push(markers.duration[markerIndex]);
      newMarkers.type.push(markers.type[markerIndex]);
      newMarkers.name.push(markers.name[markerIndex]);
      newMarkers.title.push(markers.title[markerIndex]);
      newMarkers.data.push(markers.data[markerIndex]);
      newMarkers.length++;
    }
  }
  return newMarkers;
}

export function filterMarkersForHeader(
  markers: MarkersTable
): MarkersTableByType<*> {
  const newMarkers: MarkersTableByType<*> = {
    startTime: [],
    endTime: [],
    duration: [],
    type: [],
    name: [],
    title: [],
    data: [],
    length: 0,
  };

  for (let markerIndex = 0; markerIndex < markers.length; markerIndex++) {
    const name = markers.name[markerIndex];
    const type = markers.type[markerIndex];
    if (
      name !== 'GCMajor' &&
      name !== 'BHR-detected hang' &&
      type === 'Network'
    ) {
      newMarkers.startTime.push(markers.startTime[markerIndex]);
      newMarkers.endTime.push(markers.endTime[markerIndex]);
      newMarkers.duration.push(markers.duration[markerIndex]);
      newMarkers.type.push(markers.type[markerIndex]);
      newMarkers.name.push(markers.name[markerIndex]);
      newMarkers.title.push(markers.title[markerIndex]);
      newMarkers.data.push(markers.data[markerIndex]);
      newMarkers.length++;
    }
  }
  return newMarkers;
}

export function filterMarkersToRange<Payload>(
  markers: MarkersTableByType<Payload>,
  rangeStart: Milliseconds,
  rangeEnd: Milliseconds
): MarkersTableByType<Payload> {
  const newMarkers: MarkersTableByType<*> = {
    startTime: [],
    endTime: [],
    duration: [],
    type: [],
    name: [],
    title: [],
    data: [],
    length: 0,
  };

  for (let markerIndex = 0; markerIndex < markers.length; markerIndex++) {
    const startTime = markers.startTime[markerIndex];
    let endTime = markers.endTime[markerIndex];
    if (endTime === null) {
      endTime = startTime;
    }

    if (startTime < rangeEnd && endTime >= rangeStart) {
      newMarkers.startTime.push(markers.startTime[markerIndex]);
      newMarkers.endTime.push(markers.endTime[markerIndex]);
      newMarkers.duration.push(markers.duration[markerIndex]);
      newMarkers.type.push(markers.type[markerIndex]);
      newMarkers.name.push(markers.name[markerIndex]);
      newMarkers.title.push(markers.title[markerIndex]);
      newMarkers.data.push(markers.data[markerIndex]);
      newMarkers.length++;
    }
  }
  return newMarkers;
}

export function matchStartAndEndMarkers(
  unmatchedMarkers: UnmatchedMarkersTable,
  stringTable: UniqueStringArray,
  rootRange: StartEndRange
): MarkersTable {
  const matchedMarkers: MarkersTable = {
    startTime: [],
    endTime: [],
    duration: [],
    type: [],
    name: [],
    title: [],
    data: [],
    length: 0,
  };

  // This map is used to match up start and end markers by name. The
  // IndexIntoMarkersTable references the new marker table. And the IndexIntoStringTable
  // references the name field.
  const openMarkers: Map<
    IndexIntoStringTable,
    IndexIntoMarkersTable[]
  > = new Map();
  for (
    let unmatchedMarkerIndex = 0;
    unmatchedMarkerIndex < unmatchedMarkers.length;
    unmatchedMarkerIndex++
  ) {
    const data = unmatchedMarkers.data[unmatchedMarkerIndex];
    const time = unmatchedMarkers.time[unmatchedMarkerIndex];
    const nameStringIndex = unmatchedMarkers.name[unmatchedMarkerIndex];
    if (!data) {
      // Add a marker with a zero duration
      matchedMarkers.startTime.push(
        unmatchedMarkers.time[unmatchedMarkerIndex]
      );
      matchedMarkers.endTime.push(null);
      matchedMarkers.duration.push(null);
      matchedMarkers.type.push('unknown');
      matchedMarkers.name.push(
        stringTable.getString(unmatchedMarkers.name[unmatchedMarkerIndex])
      );
      matchedMarkers.title.push(null);
      matchedMarkers.data.push(null);
      matchedMarkers.length++;
    } else if (data.type === 'tracing') {
      // Tracing markers are created from two distinct markers that are created at
      // the start and end of whatever code that is running that we care about.
      // This is implemented by AutoProfilerTracing in Gecko.
      //
      // In this function we convert both of these raw markers into a single
      // tracing marker with a non-null duration.
      //
      // We also handle nested markers by assuming markers of the same type are
      // never interwoven: given input markers startA, startB, endC, endD, we'll
      // get 2 markers A-D and B-C.
      if (data.interval === 'start') {
        let markerBucket = openMarkers.get(nameStringIndex);
        if (markerBucket === undefined) {
          markerBucket = [];
          openMarkers.set(nameStringIndex, markerBucket);
        }
        // Add the new marker index to the marker bucket, to try and match up.
        markerBucket.push(matchedMarkers.length);

        // Go ahead and add this marker, even though we haven't found a match yet.
        matchedMarkers.startTime.push(time);
        matchedMarkers.endTime.push(rootRange.end);
        matchedMarkers.duration.push(null);
        matchedMarkers.type.push(data.type);
        matchedMarkers.name.push(stringTable.getString(nameStringIndex));
        matchedMarkers.title.push(null);
        matchedMarkers.data.push(data);
        matchedMarkers.length++;
      } else if (data.interval === 'end') {
        const markerBucket = openMarkers.get(nameStringIndex);
        if (markerBucket && markerBucket.length) {
          // We already encountered a matching "start" marker for this "end".
          const markerIndex = markerBucket.pop();
          matchedMarkers.endTime[markerIndex] = time;
          matchedMarkers.duration[markerIndex] =
            time - matchedMarkers.startTime[markerIndex];
        } else {
          // No matching "start" marker has been encountered before this "end",
          // this means it was issued before the capture started. Here we create
          // a fake "start" marker to create the final tracing marker.
          // Note we won't have additional data (eg the cause stack) for this
          // marker because that data is contained in the "start" marker.

          const nameStringIndex = unmatchedMarkers.name[unmatchedMarkerIndex];

          // Set the startTime to the start of the rootRange, since it is unknown.
          matchedMarkers.startTime.push(rootRange.start);
          matchedMarkers.endTime.push(time);
          matchedMarkers.duration.push(null);
          matchedMarkers.type.push(data.type);
          matchedMarkers.name.push(stringTable.getString(nameStringIndex));
          matchedMarkers.title.push(null);
          matchedMarkers.data.push(data);
          matchedMarkers.length++;
        }
      }
    } else {
      // `data` here is a union of different shaped objects, that may or not have
      // certain properties. Flow doesn't like us arbitrarily accessing properties
      // that may not exist, so use a utility function to generically get the data out.
      const startTime = getNumberPropertyOrNull(data, 'startTime');
      const endTime = getNumberPropertyOrNull(data, 'endTime');

      matchedMarkers.type.push(data.type);
      matchedMarkers.name.push(stringTable.getString(nameStringIndex));
      matchedMarkers.title.push(null);
      matchedMarkers.data.push(data);
      matchedMarkers.length++;

      // Now construct a tracing marker if these properties existed.
      if (startTime !== null && endTime !== null) {
        const duration = endTime - startTime;
        matchedMarkers.startTime.push(startTime);
        matchedMarkers.endTime.push(endTime);
        matchedMarkers.duration.push(duration);
      } else {
        matchedMarkers.startTime.push(time);
        matchedMarkers.endTime.push(null);
        matchedMarkers.duration.push(null);
      }
    }
  }
  // Mutate the table to sort it.
  sortDataTable(matchedMarkers, matchedMarkers.startTime, (a, b) => a - b);

  return matchedMarkers;
}

/**
 * This function takes a marker that packs in a marker payload into the string of the
 * name. This extracts that and turns it into a payload.
 */
export function extractMarkerDataFromName({
  stringTable,
  markers,
}: Thread): UnmatchedMarkersTable {
  const newMarkers: UnmatchedMarkersTable = {
    data: markers.data.slice(),
    name: markers.name.slice(),
    time: markers.time.slice(),
    length: markers.length,
  };

  // Match: "Bailout_MonitorTypes after add on line 1013 of self-hosted:1008"
  // Match: "Bailout_TypeBarrierO at jumptarget on line 1490 of resource://devtools/shared/base-loader.js -> resource://devtools/client/shared/vendor/immutable.js:1484"
  const bailoutRegex =
    // Capture groups:
    //       type   afterAt    where        bailoutLine  script functionLine
    //        ↓     ↓          ↓                  ↓        ↓    ↓
    /^Bailout_(\w+) (after|at) ([\w _-]+) on line (\d+) of (.*):(\d+)$/;

  // Match: "Invalidate resource://devtools/shared/base-loader.js -> resource://devtools/client/shared/vendor/immutable.js:3662"
  // Match: "Invalidate self-hosted:4032"
  const invalidateRegex =
    // Capture groups:
    //         url    line
    //           ↓    ↓
    /^Invalidate (.*):(\d+)$/;

  const bailoutStringIndex = stringTable.indexForString('Bailout');
  const invalidationStringIndex = stringTable.indexForString('Invalidate');
  for (let markerIndex = 0; markerIndex < markers.length; markerIndex++) {
    const nameIndex = markers.name[markerIndex];
    const time = markers.time[markerIndex];
    const name = stringTable.getString(nameIndex);
    let matchFound = false;
    if (name.startsWith('Bailout_')) {
      matchFound = true;
      const match = name.match(bailoutRegex);
      if (!match) {
        console.error(`Could not match regex for bailout: "${name}"`);
      } else {
        const [
          ,
          type,
          afterAt,
          where,
          bailoutLine,
          script,
          functionLine,
        ] = match;
        newMarkers.name[markerIndex] = bailoutStringIndex;
        newMarkers.data[markerIndex] = ({
          type: 'Bailout',
          bailoutType: type,
          where: afterAt + ' ' + where,
          script: script,
          bailoutLine: +bailoutLine,
          functionLine: +functionLine,
          startTime: time,
          endTime: time,
        }: BailoutPayload);
      }
    } else if (name.startsWith('Invalidate ')) {
      matchFound = true;
      const match = name.match(invalidateRegex);
      if (!match) {
        console.error(`Could not match regex for bailout: "${name}"`);
      } else {
        const [, url, line] = match;
        newMarkers.name[markerIndex] = invalidationStringIndex;
        newMarkers.data[markerIndex] = {
          type: 'Invalidation',
          url,
          line,
          startTime: time,
          endTime: time,
        };
      }
    }
    if (matchFound && markers.data[markerIndex]) {
      console.error(
        "A marker's payload was rewritten based off the text content of the marker. " +
          "perf.html assumed that the payload was empty, but it turns out it wasn't. " +
          'This is most likely an error and should be fixed. The marker name is:',
        name
      );
    }
  }

  return newMarkers;
}

/**
 * This function ensures that all known markers have types, and does some other small
 * cleanups.
 */
export function cleanupPayloadInformation(
  markers: UnmatchedMarkersTable
): UnmatchedMarkersTable {
  return {
    ...markers,
    data: markers.data.map((data: any) => {
      if (data.category === 'VsyncTimestamp') {
        const payload: VsyncTimestampPayload_Gecko = data;
        return ({
          type: 'VsyncTimestamp',
          vsync: payload.vsync,
        }: VsyncTimestampPayload);
      }
      return data;
    }),
  };
}

export function filterMarkersBySearchString(
  markers: MarkersTable,
  searchString: string
): MarkersTable {
  if (!searchString) {
    return markers;
  }
  const lowerCaseSearchString = searchString.toLowerCase();
  const newMarkersTable: MarkersTable = {
    startTime: [],
    endTime: [],
    duration: [],
    type: [],
    name: [],
    title: [],
    data: [],
    length: 0,
  };
  function addMarker(markerIndex: IndexIntoMarkersTable) {
    newMarkersTable.startTime.push(markers.startTime[markerIndex]);
    newMarkersTable.endTime.push(markers.endTime[markerIndex]);
    newMarkersTable.duration.push(markers.duration[markerIndex]);
    newMarkersTable.type.push(markers.type[markerIndex]);
    newMarkersTable.name.push(markers.name[markerIndex]);
    newMarkersTable.title.push(markers.title[markerIndex]);
    newMarkersTable.data.push(markers.data[markerIndex]);
  }
  for (let markerIndex = 0; markerIndex < markers.length; markerIndex++) {
    const name = markers.name[markerIndex];
    const lowerCaseName = name.toLowerCase();
    if (lowerCaseName.includes(lowerCaseSearchString)) {
      addMarker(markerIndex);
      continue;
    }
    const data = markers.data[markerIndex];
    if (data && typeof data === 'object') {
      if (
        typeof data.eventType === 'string' &&
        data.eventType.toLowerCase().includes(lowerCaseSearchString)
      ) {
        // Match DOMevents data.eventType
        addMarker(markerIndex);
        continue;
      }
      if (
        typeof data.name === 'string' &&
        data.name.toLowerCase().includes(lowerCaseSearchString)
      ) {
        // Match UserTiming's name.
        addMarker(markerIndex);
        continue;
      }
      if (
        typeof data.category === 'string' &&
        data.category.toLowerCase().includes(lowerCaseSearchString)
      ) {
        // Match UserTiming's name.
        addMarker(markerIndex);
        continue;
      }
    }
  }
  return newMarkersTable;
}
