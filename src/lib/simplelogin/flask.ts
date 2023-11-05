import { globalName } from '../configuration';
import { writeToDoppler } from '../util/doppler';
import { createRandomPassword } from '../util/random';

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
};
