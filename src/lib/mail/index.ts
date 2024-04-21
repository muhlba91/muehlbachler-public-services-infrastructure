import { StringMap } from '../../model/map';
import { PostgresqlUserData } from '../../model/postgresql';
import { ServerData } from '../../model/server';

import { createMailServer } from './server';

/**
 * Creates an mail resources.
 *
 * @param {string} userPassword the user's password
 * @param {string} sshPublicKey the SSH public key (OpenSSH)
 * @param {StringMap<PostgresqlUserData>} postgresqlUsers a map containing users and their passwords
 * @returns {ServerData} the generated server
 */
export const createMailResources = (
  userPassword: string,
  sshPublicKey: string,
  postgresqlUsers: StringMap<PostgresqlUserData>,
): ServerData => {
  const server = createMailServer(userPassword, sshPublicKey, postgresqlUsers);
  return server;
};
