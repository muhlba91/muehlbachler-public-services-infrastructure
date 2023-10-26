import * as kubernetes from '@pulumi/kubernetes';

import { ClusterData } from '../../model/cluster';
import { argocdConfig } from '../configuration';
import { b64encode } from '../util/base64';
import { getGitHubRepository } from '../util/github';

/**
 * Creates the ArgoCD secrets.
 *
 * @param {string} argocdAdminPassword the argocd admin password
 * @param {ClusterData} cluster the cluster
 * @param {k8s.Provider} provider the kubernetes provider
 */
export const deploySecrets = async (
  argocdAdminPassword: string,
  namespace: kubernetes.core.v1.Namespace,
  cluster: ClusterData,
  provider: kubernetes.Provider,
) => {
  deployAdminPasswordSecrets(argocdAdminPassword, cluster, namespace, provider);
  await deployRepositorySecrets(cluster, namespace, provider);
};

/**
 * Creates the ArgoCD admin password secrets.
 *
 * @param {string} argocdAdminPassword the argocd admin password
 * @param {ClusterData} cluster the cluster
 * @param {k8s.Provider} provider the kubernetes provider
 */
const deployAdminPasswordSecrets = (
  argocdAdminPassword: string,
  cluster: ClusterData,
  namespace: kubernetes.core.v1.Namespace,
  provider: kubernetes.Provider,
) => {
  new kubernetes.core.v1.Secret(
    'k8s-secret-argocd-admin-password',
    {
      metadata: {
        name: 'argocd-admin-password',
        namespace: 'argocd',
      },
      data: {
        password: b64encode(argocdAdminPassword),
      },
    },
    {
      provider: provider,
      dependsOn: [cluster.resource, namespace],
      deleteBeforeReplace: true,
    },
  );
};

/**
 * Creates the ArgoCD repository secrets.
 *
 * @param {ClusterData} cluster the cluster
 * @param {k8s.Provider} provider the kubernetes provider
 */
export const deployRepositorySecrets = async (
  cluster: ClusterData,
  namespace: kubernetes.core.v1.Namespace,
  provider: kubernetes.Provider,
) => {
  const applicationsRepository = (
    await getGitHubRepository(argocdConfig.applicationsRepository.repository)
  ).httpCloneUrl;
  new kubernetes.core.v1.Secret(
    'k8s-secret-argocd-repository-applications',
    {
      metadata: {
        name: 'argocd-repository-applications',
        namespace: 'argocd',
        labels: {
          'argocd.argoproj.io/secret-type': 'repository',
        },
      },
      data: {
        url: b64encode(applicationsRepository),
      },
    },
    {
      provider: provider,
      dependsOn: [cluster.resource, namespace],
      deleteBeforeReplace: true,
    },
  );
};
