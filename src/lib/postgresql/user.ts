import * as pg from '@pulumi/postgresql';

import { databaseConfig, globalName } from '../configuration';
import { writeToDoppler } from '../util/doppler';
import { createRandomPassword } from '../util/random';

/**
 * Creates the users.
 *
 * @param {pg.Provider} provider the database provider
 */
export const createUsers = (provider: pg.Provider) => {
  databaseConfig.users.forEach((user) => {
    const password = createRandomPassword(`pg-user-${user}`, {
      length: 32,
      special: false,
    });
    const pgUser = new pg.Role(
      `pg-db-user-${user}`,
      {
        name: user,
        password: password.password,
        createDatabase: false,
        createRole: false,
        login: true,
      },
      { provider: provider },
    );
    writeToDoppler(
      'PUBLIC_SERVICES_CLUSTER_POSTGRESQL_USER_' + user.toUpperCase(),
      pgUser.name,
      `${globalName}-cluster-database`,
    );
    writeToDoppler(
      'PUBLIC_SERVICES_CLUSTER_POSTGRESQL_PASSWORD_' + user.toUpperCase(),
      password.password,
      `${globalName}-cluster-database`,
    );
  });
};
