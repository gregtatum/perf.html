import startApp from './app';
import startWorkers from './profile-logic/summary-worker';

const isWorkerEnvironment = typeof self.importScripts === 'function';

if (isWorkerEnvironment) {
  debugger;
  if (process.env.NODE_ENV === 'test') {
    // startMockWorkerInterface();
  } else {
    startWorkers();
  }
} else {
  startApp();
}
