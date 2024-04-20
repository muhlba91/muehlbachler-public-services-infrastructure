import * as gcp from '@pulumi/gcp';

/**
 * Defines data for an service account.
 */
export type ServiceAccountData = {
  readonly serviceAccount: gcp.serviceaccount.Account;
  readonly key: gcp.serviceaccount.Key;
};
