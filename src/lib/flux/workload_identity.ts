import * as gcp from '@pulumi/gcp';

import { clusterConfig } from '../configuration';
import { createCryptoKeyIAMMember } from '../google/crypto_key/member';
import { createServiceAccount } from '../google/iam/service_account';
import { createWorkloadIdentityUserBinding } from '../google/iam/workload_identity_user';

/**
 * Creates the FluxCD Google service account and workload identity.
 *
 * @returns {gcp.serviceaccount.Account} the service account
 */
export const createFluxWorkloadIdentity = (): gcp.serviceaccount.Account => {
  const serviceAccount = createServiceAccount('flux', {});

  serviceAccount.email.apply((email) =>
    createCryptoKeyIAMMember(
      `${clusterConfig.accessConfiguration.encryptionKey.location}/${clusterConfig.accessConfiguration.encryptionKey.keyringId}/${clusterConfig.accessConfiguration.encryptionKey.cryptoKeyId}`,
      `serviceAccount:${email}`,
      ['roles/cloudkms.cryptoKeyEncrypterDecrypter'],
      {},
    ),
  );

  createWorkloadIdentityUserBinding(
    serviceAccount.id,
    'flux-system',
    'kustomize-controller',
  );

  return serviceAccount;
};
