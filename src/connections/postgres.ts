import pgp from 'pg-promise';
import { postgresConfig } from '../config';
import ResourceManager from './manager';

const db = pgp()(postgresConfig());

ResourceManager.register('postgresql', () => db.$pool.end());

export default db;
