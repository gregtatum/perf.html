/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow
import { UniqueStringArray } from './unique-string-array';
import { getEmptyProfile, getEmptyThread } from './profile-data';

import type { Profile, Thread } from '../common/types/profile';

type Entry = {
  // Process ID
  pid: number,
  // Thread ID
  tid: number,
  // Timestamp
  ts: number,
  ph: string,
  cat: string,
  name: string,
  dur: number,
  tdur: number,
  tts: number,
  args: any,
};

type ChromeProfile = Array<Entry>;

type NodeIndex = number;
type CpuProfile = {
  startTime: number,
  endTime: number,
  nodes: Array<{
    callFrame: {
      columnNumber: number,
      functionName: string,
      lineNumber: number,
      scriptId: string,
      url: string,
    },
    children: NodeIndex[],
    hitCount: number,
    id: NodeIndex,
  }>,
  samples: NodeIndex[],
  timeDeltas: number[],
}

type CpuProfileEntry = Entry & {
  args: {
    data: CpuProfile,
  },
};

type ChromeProfileByName = {[name: string]: CpuProfileEntry | Object};

fetch('./profile.json')
  .then(profile => profile.json())
  .then(attemptToUnserializeChromeProfileFormat);

export function attemptToUnserializeChromeProfileFormat(
  profile: ChromeProfile
): Profile | null {
  if (!Array.isArray(profile)) {
    return null;
  }

  const profileByName: ChromeProfileByName = {};
  for (const row of profile) {
    if (typeof row !== 'object') {
      return null;
    }
    profileByName[row.name] = null;
  }

  Object.keys(profileByName).forEach(n => {
    profileByName[n] = profile.filter(({name}) => n === name);
  });

  if (!profileByName.CpuProfile) {
    return null;
  }
  const cpuProfileEntries: CpuProfileEntry[] = profileByName.CpuProfile;

  const processedProfile = getEmptyProfile();

  // TODO - The current interval is just a wild guess.
  processedProfile.meta.interval = 1;
  processedProfile.meta.product = 'Chrome';
  processedProfile.meta.startTime = getLowestProfileStartTime(profileByName);
  processedProfile.threads = cpuProfileEntries.map(entry => processCpuProfile(entry, profileByName));

  return processedProfile;
}

function getLowestProfileStartTime(profileByName): number {
  const startTime = (cpuProfile: CpuProfile) => cpuProfile.args.data.cpuProfile.startTime;
  const firstProfile = profileByName.CpuProfile.reduce((a, b) => Math.min(startTime(a), startTime(b)));
  return startTime(firstProfile);
}

function processCpuProfile(entry: CpuProfileEntry, profileByName): Thread {
  const cpuProfile: CpuProfile = entry.args.data.cpuProfile;
  const {startTime, timeDeltas, samples, nodes} = cpuProfile;
  const thread = getEmptyThread();
  thread.name = 'cpuProfile';
  thread.tid = entry.tid;
  thread.pid = entry.pid;
  thread.name = getThreadName(profileByName, entry.tid);
  const nodeIdToFrameId = {};
  const nodesById = {};
  const nodeIdToStackId = {};
  const stringTableIndexToNewFuncIndex = new Map();

  let timeAccumulation = startTime;
  const accumulatedTimeDeltas = timeDeltas.map(delta => {
    timeAccumulation += delta;
    return timeAccumulation;
  });

  nodes.forEach(node => {
    nodesById[node.id] = node;

    const funcNameIndex = thread.stringTable.indexForString(node.callFrame.functionName);
    let funcIndex = stringTableIndexToNewFuncIndex.get(funcNameIndex);
    if (funcIndex === undefined) {
      funcIndex = thread.funcTable.length;
      thread.funcTable.name.push(funcNameIndex);
      thread.funcTable.length++;
      thread.funcTable.resource.push(-1);
      thread.funcTable.address.push(undefined);
      thread.funcTable.isJS.push(true);
    }

    const frameIndex = thread.frameTable.length;
    nodeIdToFrameId[node.id] = frameIndex;
    thread.frameTable.length++;
    thread.frameTable.implementation.push(undefined);
    thread.frameTable.optimizations.push(undefined);
    thread.frameTable.line.push(node.callFrame.lineNumber);
    // thread.frameTable.column.push(node.callFrame.columnNumber)
    thread.frameTable.category.push(undefined);
    thread.frameTable.func.push(funcIndex);
    thread.frameTable.address.push(undefined);
  });

  nodes.forEach((node, i) => {
    let frameIndex = nodeIdToFrameId[node.id];
    nodeIdToStackId[node.id] = thread.stackTable.length;
    if (!node.children) {
      thread.stackTable.length++;
      thread.stackTable.prefix.push(undefined);
      thread.stackTable.frame.push(frameIndex);
      return;
    }
    for (let i = 0; i <= node.children.length; i++) {
      const nextNodeId = node.children[i];
      const prefix = nextNodeId === undefined
        ? undefined
        : nodeIdToFrameId[nextNodeId];

      thread.stackTable.length++;
      thread.stackTable.prefix.push(prefix);
      thread.stackTable.frame.push(frameIndex);
      frameIndex = prefix;
    }
  });

  samples.forEach((sampleIndex, i) => {
    const node = nodesById[sampleIndex];

    thread.samples.length++;
    thread.samples.time.push(accumulatedTimeDeltas[i]);
    thread.samples.stack.push(nodeIdToStackId[node.id]);
    thread.samples.responsiveness.push(timeDeltas[i]);
    thread.samples.rss.push(undefined);
    thread.samples.uss.push(undefined);
    thread.samples.frameNumber.push(nodeIdToFrameId[node.id]);
    thread.samples.power.push(undefined);
  });
  return thread;
}

function getThreadName(profileByName, tid) {
  const thread_name = profileByName.thread_name.find(row => row.tid === tid);
  return thread_name ? thread_name.args.name : 'Unknown';
}

function getProcessLabels(profileByName, pid) {
  const process_labels = profileByName.process_labels.find(row => row.pid === pid);
  return process_labels ? process_labels.args.labels : 'Unknown';
}
