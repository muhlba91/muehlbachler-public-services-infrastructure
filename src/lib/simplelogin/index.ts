import { Output } from '@pulumi/pulumi';

import { ExternalIPData } from '../../model/network';

import { createAWSResources } from './aws';
import { createDKIMKey } from './dkim';
import { createFlaskSecret } from './flask';
import { createDNSRecords } from './record';

/**
 * Creates the SimpleLogin resources.
 *
 * @param {ExternalIPData} externalIp the external IP of the server
 * @returns {Output<string>} the dkim public key
 */
export const createSimpleloginResources = (
  externalIp: ExternalIPData,
): Output<string> => {
  createFlaskSecret();

  createAWSResources();

  const dkimKey = createDKIMKey();
  createDNSRecords(externalIp, dkimKey.publicKeyPem);

  return dkimKey.publicKeyPem;
};
