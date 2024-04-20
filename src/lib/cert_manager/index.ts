import * as gcp from '@pulumi/gcp';
import { interpolate } from '@pulumi/pulumi';

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
 * Creates the cert-manager resources.
 *
 * @returns {gcp.serviceaccount.Account} the Google Cloud service account
 */
export const createGoogleCertManagerResources =
  (): gcp.serviceaccount.Account => {
    const roles = ['roles/dns.admin'];
    const name = 'cert-manager';

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
 * Creates the cert-manager resources.
 */
export const createCertManagerResources = () => {
  const roles = ['roles/dns.admin'];
  const iam = createGCPServiceAccountAndKey('cert-manager', {});
  createIAMMember(
    `cert-manager-${globalName}-${environment}`,
    interpolate`serviceAccount:${iam.serviceAccount.email}`,
    roles,
    {
      project: gcpConfig.dnsProject,
    },
  );

  writeToDoppler(
    'GCP_CREDENTIALS',
    iam.key.privateKey,
    `${globalName}-cluster-cert-manager`,
  );

  writeToVault(
    'cert-manager-google-cloud',
    iam.key.privateKey.apply((key) => JSON.stringify({ credentials: key })),
    `kubernetes-${globalName}-cluster`,
  );
};
