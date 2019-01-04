import { createApp } from '../utils/app-runner';
import { merge, Observable } from 'rxjs';
import { webapp } from '../web/webapp';
import { tronWatcher } from '../services/tron-watcher';
import { info, exitWithMsg } from '../utils/scripts';

type ServiceName = 'webapp' | 'tron-watcher';
const ServiceNames: ServiceName[] = ['webapp', 'tron-watcher'];
type Service = () => Observable<any>;

let args = process.argv.slice(2);
if (args.length === 0) {
  if (process.env['SERVICES'] != null) {
    args = process.env['SERVICES']!.split(/\s+/);
  } else {
    info('no services specified. Running all services');
    args = ServiceNames;
  }
}

const servicesToRun: Service[] = Array.from(new Set(args))
  .filter((a): a is ServiceName => ServiceNames.includes(a as any))
  .map(name => {
    if (name === 'tron-watcher') {
      return tronWatcher;
    } else if (name === 'webapp') {
      return webapp;
    } else {
      throw Error(`BUG: bad name ${name}`);
    }
  });

if (args.length > servicesToRun.length) {
  exitWithMsg('Invalid service names: %s\nUse only: %o', args, ServiceNames);
}

const app = createApp({
  name: 'webapp',
  factory: async () => merge(...servicesToRun.map(s => s())),
});

app().catch(err => {
  exitWithMsg('Application Error. \n%s', err.stack);
});
