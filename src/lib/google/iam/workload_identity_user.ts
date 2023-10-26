import { all, Output } from '@pulumi/pulumi';

import { getProject } from '../../util/google';

import { createIAMBinding } from './binding';

/**
 * Creates a workload identity user binding.
 *
 * @param {Output<string>} serviceAccount the service account id
 * @param {string} namespace the namespace name
 * @param {string} kubernetesServiceAccount the kubernetes service account in the namespace
 */
export const createWorkloadIdentityUserBinding = (
  serviceAccount: Output<string>,
  namespace: string,
  kubernetesServiceAccount: string,
) => {
  all([serviceAccount, namespace, kubernetesServiceAccount]).apply(
    ([accountId, k8sNamespace, k8sServiceAccount]) =>
      createIAMBinding(
        accountId,
        'roles/iam.workloadIdentityUser',
        `serviceAccount:${getProject()}.svc.id.goog[${k8sNamespace}/${k8sServiceAccount}]`,
      ),
  );
};
