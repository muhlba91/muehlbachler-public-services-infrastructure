import * as gcp from '@pulumi/gcp';
import { interpolate } from '@pulumi/pulumi';

import { ServiceAccountData } from '../../model/google/service_account_data';
import {
  clusterConfig,
  environment,
  gcpConfig,
  globalName,
} from '../configuration';
import { createIAMMember } from '../google/iam/member';
import { createServiceAccount } from '../google/iam/service_account';
import { createWorkloadIdentityUserBinding } from '../google/iam/workload_identity_user';
import { writeToDoppler } from '../util/doppler/secret';
import { getProject } from '../util/google';
import { createGCPServiceAccountAndKey } from '../util/google/service_account_user';
import { writeToVault } from '../util/vault/secret';

/**
 * Creates the external-dns resources.
 *
 * @returns {gcp.serviceaccount.Account} the Google Cloud service account
 */
export const createGoogleExternalDNSResources =
  (): gcp.serviceaccount.Account => {
    const roles = ['roles/dns.admin'];
    const name = 'external-dns';

    const serviceAccount = createServiceAccount(name, {});

    [getProject()]
      .concat(clusterConfig.accessConfiguration.projects ?? [])
      .forEach((project) =>
        createIAMMember(
          name,
          interpolate`serviceAccount:${serviceAccount.email}`,
          roles,
          {
            project: project,
          },
        ),
      );

    createWorkloadIdentityUserBinding(serviceAccount.id, name, name);

    return serviceAccount;
  };

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
