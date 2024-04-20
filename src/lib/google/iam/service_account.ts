import * as gcp from '@pulumi/gcp';
import { CustomResourceOptions, interpolate } from '@pulumi/pulumi';

import { environment, globalName, globalShortName } from '../../configuration';

import { createIAMMember } from './member';

/**
 * Creates a new service account.
 *
 * @param {string} name the name
 * @param {string[]} roles the roles to add (optional)
 * @returns {gcp.serviceaccount.Account} the service account
 */
export const createServiceAccount = (
  name: string,
  {
    roles,
    pulumiOptions,
    serviceAccountName, // FIXME: remove
  }: {
    readonly roles?: readonly string[];
    readonly pulumiOptions?: CustomResourceOptions;
    readonly serviceAccountName?: string; // FIXME: remove
  },
): gcp.serviceaccount.Account => {
  const accountName =
    serviceAccountName ?? `${globalShortName}-${name}-${environment}`;

  const serviceAccount = new gcp.serviceaccount.Account(
    `gcp-sa-${accountName}`,
    {
      accountId: accountName,
      displayName: `${globalName}/${environment}: ${name}`,
      description: `${globalName}/${environment}: Service Account for ${name}`,
    },
    pulumiOptions,
  );

  if (roles) {
    createIAMMember(
      name,
      interpolate`serviceAccount:${serviceAccount.email}`,
      roles,
      {
        pulumiOptions: pulumiOptions,
      },
    );
  }

  return serviceAccount;
};
