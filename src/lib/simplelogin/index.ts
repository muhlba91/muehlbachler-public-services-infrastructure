import { Output } from '@pulumi/pulumi';

import { NetworkData, NetworkIPData } from '../../model/network';
import { globalName } from '../configuration';
import { createSimpleloginFirewalls } from '../google/network/firewall';
import { writeToDoppler } from '../util/doppler/secret';
import { writeToVault } from '../util/vault/secret';

import { createAWSResources } from './aws';
import { createDKIMKey } from './dkim';
import { createFlaskSecret } from './flask';
import { createDNSRecords } from './record';

/**
 * Creates the SimpleLogin resources.
 *
 * @param {NetworkIPData} externalIp the external IP of the server
 * @param {NetworkIPData} internalIp the internal IP of the server
 * @param {NetworkData} network the network
 * @returns {Output<string>} the dkim public key
 */
export const createSimpleloginResources = (
  externalIp: NetworkIPData,
  internalIp: NetworkIPData,
  network: NetworkData,
): Output<string> => {
  createFlaskSecret();

  createAWSResources();

  const dkimKey = createDKIMKey();
  createDNSRecords(externalIp, dkimKey);

  writeToDoppler(
    'PUBLIC_SERVICES_MAIL_RELAY_POSTFIX_SERVER',
    internalIp.ipv4.address,
    `${globalName}-cluster-mail-relay`,
  );

  writeToVault(
    'mail-relay-postfix-server',
    internalIp.ipv4.address.apply((ip) => JSON.stringify({ ipv4: ip })),
    `kubernetes-${globalName}-cluster`,
  );

  createSimpleloginFirewalls(network);

  return dkimKey;
};
