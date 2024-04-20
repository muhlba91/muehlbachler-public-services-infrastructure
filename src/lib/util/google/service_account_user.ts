import { ServiceAccountData } from '../../../model/google/service_account_data';
import { environment, globalShortName } from '../../configuration';
import { createKey } from '../../google/iam/key';
import { createServiceAccount } from '../../google/iam/service_account';

/**
 * Creates a new service account and key.
 *
 * @param {string} name the name
 * @param {string[]} roles the roles to add (optional)
 * @returns {ServiceAccountData} the user data
 */
export const createGCPServiceAccountAndKey = (
  name: string,
  {
    roles,
  }: {
    readonly roles?: readonly string[];
  },
): ServiceAccountData => {
  const accountName = `${name}-${globalShortName}-${environment}`;
  const serviceAccount = createServiceAccount(accountName, {
    roles: roles,
    serviceAccountName: accountName, // FIXME: remove
  });
  const key = createKey(accountName, serviceAccount.name, [serviceAccount]);
  return {
    serviceAccount: serviceAccount,
    key: key,
  };
};
