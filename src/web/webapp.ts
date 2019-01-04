import cors from 'cors';
import fastifyFactory from 'fastify';
import httpRoutes from './plugins/http-routes';
import healthCheck from './plugins/health-check';
import { logger as rootLooger } from '../utils/logger';
import { Observable, Observer } from 'rxjs';

export function webapp(): Observable<any> {
  const logger = rootLooger.child({ srv: 'webapp' });
  const fastify = fastifyFactory({
    logger: logger as any,
  });

  fastify.register(require('fastify-helmet'));
  // @ts-ignore
  fastify.use(cors());
  fastify.register(httpRoutes, { prefix: '/api/v1' });
  fastify.register(healthCheck);

  return Observable.create((observer: Observer<any>) => {
    fastify
      .listen(8000, '0.0.0.0')
      .then(() => {
        fastify.log.info('SERVER Started: %o', fastify.server.address());
      })
      .catch(err => {
        fastify.log.error(err);
        observer.error(err);
      });

    return () => {
      fastify.close(() => {
        logger.info('WebServer closed');
      });
    };
  });
}
