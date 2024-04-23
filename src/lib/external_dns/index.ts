import { interpolate } from '@pulumi/pulumi';

import { ServiceAccountData } from '../../model/google/service_account_data';
import { environment, gcpConfig, globalName } from '../configuration';
import { createIAMMember } from '../google/iam/member';
import { writeToDoppler } from '../util/doppler/secret';
import { createGCPServiceAccountAndKey } from '../util/google/service_account_user';
import { writeToVault } from '../util/vault/secret';

/**
 * Creates the external-dns resources.
 *
 * @returns {ServiceAccountData} the service account data
 */
export const createExternalDNSResources = (): ServiceAccountData => {
  const roles = ['roles/dns.admin'];
  const iam = createGCPServiceAccountAndKey('external-dns', {});

  createIAMMember(
    `external-dns-${globalName}-${environment}`,
    interpolate`serviceAccount:${iam.serviceAccount.email}`,
    roles,
    {
      project: gcpConfig.dnsProject,
    },
  );

  writeToDoppler(
    'GCP_CREDENTIALS',
    iam.key.privateKey,
    `${globalName}-cluster-external-dns`,
  );

  writeToVault(
    'external-dns-google-cloud',
    iam.key.privateKey.apply((key) => JSON.stringify({ credentials: key })),
    `kubernetes-${globalName}-cluster`,
  );

  return iam;
};
