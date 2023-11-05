import { PrivateKey } from '@pulumi/tls';

import { globalName } from '../configuration';
import { writeToDoppler } from '../util/doppler';
import { createRSAkey } from '../util/rsa_key';

/**
 * Creates the SimpleLogin DKIM key.
 *
 * @returns {PrivateKey} the DKIM key
 */
export const createDKIMKey = (): PrivateKey => {
  const dkimKey = createRSAkey('dkim-mail-relay', { rsaBits: 2048 });

  writeToDoppler(
    'PUBLIC_SERVICES_MAIL_RELAY_DKIM_PRIVATE_KEY',
    dkimKey.privateKeyPem,
    `${globalName}-cluster-mail-relay`,
  );
  writeToDoppler(
    'PUBLIC_SERVICES_MAIL_RELAY_DKIM_PUBLIC_KEY',
    dkimKey.publicKeyPem,
    `${globalName}-cluster-mail-relay`,
  );

  return dkimKey;
};
