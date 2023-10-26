import * as gcp from '@pulumi/gcp';

import { createFluxWorkloadIdentity } from './workload_identity';

/**
 * Creates the FluxCD resources.
 *
 * @returns {gcp.serviceaccount.Account} the Google Cloud service account
 */
export const createFluxResources = (): gcp.serviceaccount.Account =>
  createFluxWorkloadIdentity();
