import { globalName } from '../configuration';
import { writeToDoppler } from '../util/doppler/secret';
import { createRandomPassword } from '../util/random';
import { writeToVault } from '../util/vault/secret';

/**
 * Creates the SimpleLogin Flask secret.
 */
export const createFlaskSecret = (): void => {
  const flaskSecret = createRandomPassword('simplelogin-flask-secret', {
    length: 32,
    special: false,
  });

  writeToDoppler(
    'PUBLIC_SERVICES_MAIL_RELAY_FLASK_SECRET',
    flaskSecret.password,
    `${globalName}-cluster-mail-relay`,
  );

  writeToVault(
    'simplelogin-flask-secret',
    flaskSecret.password.apply((secret) => JSON.stringify({ secret: secret })),
    `kubernetes-${globalName}-cluster`,
  );
};
