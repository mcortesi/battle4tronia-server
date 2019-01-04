import Logger from 'bunyan';
import { createStream } from 'bunyan-gke-stackdriver';
import assert from 'assert';

function createLogger(serviceName: string) {
  if (process.env.NODE_ENV === 'production') {
    return Logger.createLogger({
      name: serviceName,
      streams: [createStream()],
    });
  } else {
    return Logger.createLogger({ name: serviceName });
  }
}

export { Logger };
export const logger: Logger = createLogger('battlefortronia');

// export function initLogger(serviceName: string) {
//   assert.ok(logger == null, `initLogger() called twice. rootLogger can only be initialized one!`);
//   logger = createLogger(serviceName);
// }
