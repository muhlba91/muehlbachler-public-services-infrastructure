import * as gcp from '@pulumi/gcp';
import { interpolate } from '@pulumi/pulumi';

import { clusterConfig } from '../configuration';
import { createIAMMember } from '../google/iam/member';
import { createServiceAccount } from '../google/iam/service_account';
import { createWorkloadIdentityUserBinding } from '../google/iam/workload_identity_user';
import { getProject } from '../util/google';

/**
 * Creates the cert-manager resources.
 *
 * @returns {gcp.serviceaccount.Account} the Google Cloud service account
 */
export const createCertManagerResources = (): gcp.serviceaccount.Account => {
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
