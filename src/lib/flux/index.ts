import * as gcp from '@pulumi/gcp';
import * as kubernetes from '@pulumi/kubernetes';

import { deploySecrets } from './secrets';
import { createFluxServiceAccount } from './service_account';
import { createFluxWorkloadIdentity } from './workload_identity';

/**
 * Creates the FluxCD resources.
 *
 * @returns {gcp.serviceaccount.Account} the Google Cloud service account
 */
export const createGoogleFluxResources = (): gcp.serviceaccount.Account =>
  createFluxWorkloadIdentity();

/**
 * Creates the FluxCD resources.
 *
 * @param {kubernetes.Provider} provider the Kubernetes provider
 */
export const createFluxResources = (provider: kubernetes.Provider) => {
  const serviceAccountKey = createFluxServiceAccount();
  deploySecrets(serviceAccountKey, provider);
};
