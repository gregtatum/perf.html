// @flow
import { getEmptyThread } from '../data-structures';
import type {
  Thread,
  IndexIntoFuncTable,
} from 'firefox-profiler/types/profile';

export function* itMap<T, U>(it: Iterable<T>, f: (t: T) => U): Iterable<U> {
  for (const t of it) {
    yield f(t);
  }
}

export function getOrInsert<Key, Value>(
  map: Map<Key, Value>,
  key: Key,
  fallback: (key: Key) => Value
): Value {
  let value = map.get(key);
  if (value === undefined) {
    value = fallback(key);
    map.set(key, value);
  }
  return value;
}

export type FrameInfo = {|
  key: string | number,

  // Name of the frame. May be a method name, e.g.
  // "ActiveRecord##to_hash"
  name: string,

  // File path of the code corresponding to this
  // call stack frame.
  file?: string,

  // Line in the given file where this frame occurs
  line?: number,

  // Column in the file
  col?: number,
|};

export class ThreadBuilder {
  thread: Thread = getEmptyThread();
  valueFormatter: ValueFormatter;

  setName(threadName: string) {
    this.thread.name = threadName;
  }

  setValueFormatter(f: ValueFormatter) {
    this.valueFormatter = f;
  }
}

export class StackListProfileBuilder extends ThreadBuilder {
  pendingSample: {
    stack: FrameInfo[],
    startTimestamp: number,
    centralTimestamp: number,
  } | null = null;

  nameToFuncIndex: Map<string, IndexIntoFuncTable>;

  appendSampleWithTimestamp(stack: FrameInfo[], timestamp: number) {
    for (const { key, name, file, line, col } of stack) {
      const { stringTable, funcTable, samples } = this.thread;
      const funcIndex = this.nameToFuncIndex.get(name);
      if (funcIndex == undefined) {
        funcTable.address.push(-1);
        funcTable.isJS.push(false);
        funcTable.name.push(stringTable.indexForString(name));
        funcTable.resource.push(-1);
        funcTable.relevantForJS.push(false);
        funcTable.fileName.push(file ? stringTable.indexForString(file) : null);
        funcTable.lineNumber.push();
        funcTable.columnNumber.push();
        funcTable.length++;
      }
    }
  }

  build(): Thread {
    return this.thread;
  }
}

interface ValueFormatter {
  unit: ValueUnit;
  format(v: number): string;
}

export type ValueUnit =
  | 'none'
  | 'nanoseconds'
  | 'microseconds'
  | 'milliseconds'
  | 'seconds'
  | 'bytes';

export class RawValueFormatter implements ValueFormatter {
  unit: ValueUnit = 'none';
  format(v: number) {
    return v.toLocaleString();
  }
}

export class TimeFormatter implements ValueFormatter {
  multiplier: number;
  unit: ValueUnit;

  constructor(
    unit: 'nanoseconds' | 'microseconds' | 'milliseconds' | 'seconds'
  ) {
    if (unit === 'nanoseconds') this.multiplier = 1e-9;
    else if (unit === 'microseconds') this.multiplier = 1e-6;
    else if (unit === 'milliseconds') this.multiplier = 1e-3;
    else this.multiplier = 1;
  }

  formatUnsigned(v: number) {
    const s = v * this.multiplier;

    if (s / 60 >= 1) {
      const minutes = Math.floor(s / 60);
      const seconds = Math.floor(s - minutes * 60).toString();
      return `${minutes}:${zeroPad(seconds, 2)}`;
    }
    if (s / 1 >= 1) return `${s.toFixed(2)}s`;
    if (s / 1e-3 >= 1) return `${(s / 1e-3).toFixed(2)}ms`;
    if (s / 1e-6 >= 1) return `${(s / 1e-6).toFixed(2)}µs`;
    return `${(s / 1e-9).toFixed(2)}ns`;
  }

  format(v: number) {
    return `${v < 0 ? '-' : ''}${this.formatUnsigned(Math.abs(v))}`;
  }
}

export class ByteFormatter implements ValueFormatter {
  unit: ValueUnit = 'bytes';

  format(v: number) {
    if (v < 1024) return `${v.toFixed(0)} B`;
    v /= 1024;
    if (v < 1024) return `${v.toFixed(2)} KB`;
    v /= 1024;
    if (v < 1024) return `${v.toFixed(2)} MB`;
    v /= 1024;
    return `${v.toFixed(2)} GB`;
  }
}

export function zeroPad(s: string, width: number) {
  return new Array(Math.max(width - s.length, 0) + 1).join('0') + s;
}
