import { all, Output } from '@pulumi/pulumi';

import { globalName } from '../configuration';
import { writeToDoppler } from '../util/doppler/secret';
import { createRSAkey } from '../util/rsa_key';
import { writeToVault } from '../util/vault/secret';

/**
 * Creates the SimpleLogin DKIM key.
 *
 * @returns {Output<string>} the DKIM key
 */
export const createDKIMKey = (): Output<string> => {
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

  writeToVault(
    'mail-relay-dkim',
    all([dkimKey.privateKeyPem, dkimKey.publicKeyPem]).apply(
      ([privateKey, publicKey]) =>
        JSON.stringify({ private_key: privateKey, public_key: publicKey }),
    ),
    `kubernetes-${globalName}-cluster`,
  );

  return dkimKey.publicKeyPem.apply((key) =>
    key
      .replace('-----BEGIN PUBLIC KEY-----\n', '')
      .replace('-----END PUBLIC KEY-----', '')
      .trim()
      .split('\n')
      .join(''),
  );
};
