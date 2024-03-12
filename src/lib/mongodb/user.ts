import * as mongodbatlas from '@pulumi/mongodbatlas';
import { all, interpolate, Output } from '@pulumi/pulumi';

import { MongoDBUserData } from '../../model/mongodb';
import {
  commonLabels,
  globalName,
  mongodbClusterConfig,
} from '../configuration';
import { writeToDoppler } from '../util/doppler';
import { createRandomPassword } from '../util/random';

/**
 * Creates the MongoDB user.
 *
 * @param {string} user the user name
 * @returns {Output<MongoDBUserData>} the user
 */
export const createUser = (user: string): Output<MongoDBUserData> =>
  all([
    mongodbClusterConfig.clusterName,
    mongodbClusterConfig.projectId,
    mongodbClusterConfig.endpoint,
  ]).apply(([clusterName, projectId, endpoint]) => {
    const password = createRandomPassword(clusterName + '-' + user, {
      length: 32,
      special: false,
    });

    const dbUser = new mongodbatlas.DatabaseUser(
      clusterName + '-' + user,
      {
        projectId: projectId,
        username: user,
        password: password.password,
        authDatabaseName: 'admin',
        roles: [
          {
            roleName: 'readAnyDatabase',
            databaseName: 'admin',
          },
          {
            roleName: 'readWrite',
            databaseName: user,
          },
        ],
        scopes: [
          {
            type: 'CLUSTER',
            name: clusterName,
          },
        ],
        labels: Object.entries(commonLabels).map(([key, value]) => ({
          key: key,
          value: value,
        })),
      },
      {},
    );

    writeToDoppler(
      `PUBLIC_SERVICES_MONGODB_${user.toUpperCase()}_USERNAME`,
      dbUser.username,
      `${globalName}-cluster-librechat`,
    );

    writeToDoppler(
      `PUBLIC_SERVICES_MONGODB_${user.toUpperCase()}_PASSWORD`,
      password.password,
      `${globalName}-cluster-librechat`,
    );

    const connectionString = endpoint.replace('mongodb://', '').split('/?');
    const dbUri = interpolate`mongodb://${dbUser.username}:${dbUser.password}@${connectionString[0]}/${user}?${connectionString[1]}`;
    writeToDoppler(
      `PUBLIC_SERVICES_MONGODB_${user.toUpperCase()}_URI`,
      dbUri,
      `${globalName}-cluster-librechat`,
    );

    return {
      user: dbUser,
      password: password.password,
    };
  });
