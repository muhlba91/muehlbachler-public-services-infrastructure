import { local } from '@pulumi/command';
import * as gcp from '@pulumi/gcp';
import { Resource } from '@pulumi/pulumi';

import { ClusterData } from '../../model/cluster';
import { argocdConfig, environment } from '../configuration';
import { writeFileContents } from '../util/file';
import { getOrDefault } from '../util/get_or_default';
import { getGitHubRepository } from '../util/github';
import { renderTemplate } from '../util/template';

/**
 * Deploys ArgoCD.
 *
 * @param {string} argocdAdminPassword the argocd admin password
 * @param {gcp.serviceaccount.Account} serviceAccount the service account
 * @param {ClusterData} cluster the cluster
 * @param {kubernetes.Provider} provider the kubernetes provider
 */
export const deployArgo = async (
  argocdAdminPassword: string,
  serviceAccount: gcp.serviceaccount.Account,
  cluster: ClusterData,
) => {
  writeFileContents(
    'outputs/values-argocd-prod.yml',
    renderTemplate('assets/helm/argocd.yml.j2', {
      environment: environment,
      argocdAdminPassword: argocdAdminPassword,
    }),
    {},
  );
  const helmInstall = new local.Command(
    'helm-argocd',
    {
      create: './assets/helm/install.sh',
      environment: {
        DEPLOYMENT_ID: `argocd-${environment}`,
        DEPLOYMENT_NAMESPACE: 'argocd',
        HELM_REPO: 'https://argoproj.github.io/argo-helm',
        HELM_CHART_NAME: 'argo-cd',
      },
    },
    {
      dependsOn: [serviceAccount, cluster.resource],
    },
  );

  deployAppOfApps(helmInstall, cluster);
};

/**
 * Deploys the ArgoCD app-of-apps.
 *
 * @param {Resource} helmInstall the helm install resource
 * @param {ClusterData} cluster the cluster
 */
const deployAppOfApps = async (helmInstall: Resource, cluster: ClusterData) => {
  const applicationsRepositoryUrl = (
    await getGitHubRepository(argocdConfig.applicationsRepository.repository)
  ).httpCloneUrl;

  writeFileContents(
    'outputs/values-argocd-cluster-applications.yml',
    renderTemplate('assets/helm/argocd-apps.yml.j2', {
      environment: environment,
      applicationsRepository: {
        url: applicationsRepositoryUrl,
        branch: argocdConfig.applicationsRepository.branch,
      },
      appsAutosync: getOrDefault(argocdConfig.appsAutosync, false),
    }),
    {},
  );
  new local.Command(
    'helm-argocd-app-of-apps',
    {
      create: './assets/helm/install.sh',
      environment: {
        DEPLOYMENT_ID: 'argocd-cluster-applications',
        DEPLOYMENT_NAMESPACE: 'argocd',
        HELM_REPO: 'https://argoproj.github.io/argo-helm',
        HELM_CHART_NAME: 'argocd-apps',
      },
    },
    {
      dependsOn: [helmInstall, cluster.resource],
    },
  );
};
