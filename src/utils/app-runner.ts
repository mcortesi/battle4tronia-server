import { Observable, Subscription } from 'rxjs';
import { retryWhen, tap, repeat } from 'rxjs/operators';
import ResourceManager from '../connections/manager';
import Logger from 'bunyan';
import { logger } from './logger';

export interface App {
  (): Promise<void>;
}
export interface AppOptions {
  factory: (logger: Logger) => Promise<Observable<any>>;
  name: string;
  restartOnError?: boolean;
  repeat?: boolean;
}
export function createApp(options: AppOptions) {
  return async () => {
    let appObs: Observable<any>;
    let appSub: Subscription;

    process.on('SIGTERM', () => {
      logger.info('Got SIGTERM, closing');
      gracefulShutdown(0);
    });

    process.on('unhandledRejection', err => {
      logger.error(err, 'UnhandledRejectection');
      gracefulShutdown(1);
    });

    function gracefulShutdown(status: number = 0) {
      // wait because unsubscribe can take a while but won't tell
      setTimeout(() => process.exit(status), 500);
      appSub.unsubscribe();
    }

    try {
      appObs = await options.factory(logger);
    } catch (err) {
      logger.error(err, 'Error creating app');
      await ResourceManager.shutdownAll();
      return;
    }

    if (options.restartOnError) {
      appObs = appObs.pipe(
        retryWhen(notif =>
          notif.pipe(
            tap(err => {
              logger.error(err, 'Error on application. Restart!');
            })
          )
        )
      );
    }

    if (options.repeat) {
      appObs = appObs.pipe(repeat());
    }

    appSub = appObs.subscribe({
      error: error => {
        logger.error(error, `Error on application. Shuting down!`);
        ResourceManager.shutdownAll();
      },
      complete: () => {
        logger.info('finished!');
        ResourceManager.shutdownAll();
      },
    });
  };
}
