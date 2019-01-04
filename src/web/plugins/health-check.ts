import { FastifyInstance } from 'fastify';

export default async function setup(fastify: FastifyInstance) {
  //Something should be return on / for load balancer besides live and ready probes
  //As explained here: https://stackoverflow.com/questions/39294305/kubernetes-unhealthy-ingress-backend
  fastify.get('/', async (req, reply) => {
    return { version: '1.0.0' };
  });

  fastify.get('/health-check', async (req, reply) => {
    return { status: 'ok' };
  });
}
