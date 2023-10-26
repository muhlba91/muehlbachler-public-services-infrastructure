import * as kubernetes from '@pulumi/kubernetes';

import { createArgoResources } from './lib/argocd';
import { createCertManagerResources } from './lib/cert_manager';
import { edgeInstanceConfig } from './lib/configuration';
import { createExternalDNSResources } from './lib/external_dns';
import { createFluxResources } from './lib/flux';
import { createCluster } from './lib/google/cluster/create';
import { createEdgeResources } from './lib/google/edge';
import { createNetwork } from './lib/google/network/network';
import { createPostgresql } from './lib/postgresql';
import { createDir } from './lib/util/create_dir';
import { writeFilePulumiAndUploadToS3 } from './lib/util/storage';

export = async () => {
  createDir('outputs');

  // network
  const network = createNetwork();

  // database
  createPostgresql();

  // cluster
  const cluster = createCluster(network);
  writeFilePulumiAndUploadToS3('admin.conf', cluster.kubeconfig, {});
  const kubernetesProvider = new kubernetes.Provider(
    'gke-cluster',
    {
      kubeconfig: cluster.kubeconfig,
    },
    {
      dependsOn: [cluster.resource],
    },
  );

  // cluster resources
  const externalDnsServiceAccount = createExternalDNSResources();
  const certManagerServiceAccount = createCertManagerResources();
  const argocdPassword = await createArgoResources(cluster, kubernetesProvider);
  const fluxServiceAccount = createFluxResources();

  // edge instance
  createEdgeResources(network);

  return {
    cluster: {
      configuration: {
        endpoint: cluster.resource.endpoint,
        certificateAuthority: cluster.resource.masterAuth.clusterCaCertificate,
        kubeconfig: cluster.kubeconfig,
      },
      argocd: {
        password: argocdPassword.password,
      },
      fluxcd: {
        serviceAccount: fluxServiceAccount.email,
      },
      certManager: {
        serviceAccount: certManagerServiceAccount.email,
      },
      externalDns: {
        serviceAccount: externalDnsServiceAccount.email,
      },
    },
    edge: {
      ip: {
        ipv4: network.externalIPs[edgeInstanceConfig.network.externalIp].ipv4
          .address,
        ipv6: network.externalIPs[edgeInstanceConfig.network.externalIp].ipv6
          ?.address,
      },
    },
  };
};
