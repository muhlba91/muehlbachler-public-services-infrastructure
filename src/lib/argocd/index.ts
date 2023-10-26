import * as kubernetes from '@pulumi/kubernetes';

import { ClusterData } from '../../model/cluster';
import { RandomPasswordData } from '../../model/random';
import { commonLabels } from '../configuration';
import { createRandomPassword } from '../util/random';

import { deployArgo } from './deployment';
import { deploySecrets } from './secrets';
import { createArgoWorkloadIdentity } from './workload_identity';

/**
 * Creates the ArgoCD resources.
 *
 * @param {ClusterData} cluster the cluster
 * @param {kubernetes.Provider} kubernetesProvider the Kubernetes provider
 * @returns {Promise<RandomPasswordData>} the admin password
 */
export const createArgoResources = async (
  cluster: ClusterData,
  kubernetesProvider: kubernetes.Provider,
): Promise<RandomPasswordData> => {
  const adminPassword = createRandomPassword('argocd-admin', {});

  const namespaceName = 'argocd';
  const namespace = new kubernetes.core.v1.Namespace(
    `k8s-namespace-${namespaceName}`,
    {
      metadata: {
        name: namespaceName,
        labels: commonLabels,
      },
    },
    {
      provider: kubernetesProvider,
      dependsOn: [cluster.resource],
    },
  );

  const serviceAccount = createArgoWorkloadIdentity();

  adminPassword.password.apply(async (password) => {
    await deploySecrets(password, namespace, cluster, kubernetesProvider);
    await deployArgo(password, namespace, serviceAccount, cluster);
  });

  return adminPassword;
};
