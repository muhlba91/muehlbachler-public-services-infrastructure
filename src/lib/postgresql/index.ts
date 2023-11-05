import * as pg from '@pulumi/postgresql';

import { StringMap } from '../../model/map';
import { PostgresqlUserData } from '../../model/postgresql';
import { globalName, postgresqlConfig } from '../configuration';
import { writeToDoppler } from '../util/doppler';

import { createDatabases } from './database';
import { createUsers } from './user';

/**
 * Creates the Postgresql databases and users.
 *
 * @returns {StringMap<PostgresqlUserData>} a map containing users and their passwords
 */
export const createPostgresql = (): StringMap<PostgresqlUserData> => {
  const pgProvider = new pg.Provider(
    'postgresql',
    {
      host: postgresqlConfig.address,
      port: postgresqlConfig.port,
      username: postgresqlConfig.username,
      password: postgresqlConfig.password,
      superuser: false,
    },
    {},
  );

  writeToDoppler(
    'PUBLIC_SERVICES_CLUSTER_POSTGRESQL_HOST',
    postgresqlConfig.address,
    `${globalName}-cluster-database`,
  );

  writeToDoppler(
    'PUBLIC_SERVICES_CLUSTER_POSTGRESQL_PORT',
    postgresqlConfig.port.apply((port) => port.toString()),
    `${globalName}-cluster-database`,
  );

  const users = createUsers(pgProvider);
  createDatabases(users, pgProvider);
  return users;
};
