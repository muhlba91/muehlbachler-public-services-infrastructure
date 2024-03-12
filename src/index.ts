import { createCertManagerResources } from './lib/cert_manager';
import { edgeInstanceConfig } from './lib/configuration';
import { createExternalDNSResources } from './lib/external_dns';
import { createFluxResources } from './lib/flux';
import { createCluster } from './lib/google/cluster/create';
import { createEdgeResources } from './lib/google/edge';
import { createNetwork } from './lib/google/network/network';
import { createPostgresql } from './lib/postgresql';
import { createSimpleloginResources } from './lib/simplelogin';
import { createDir } from './lib/util/create_dir';
import { writeFilePulumiAndUploadToS3 } from './lib/util/storage';

export = async () => {
  createDir('outputs');

  // network
  const network = createNetwork();

  // database
  const postgresqlUsers = createPostgresql();

  // cluster
  const cluster = createCluster(network);
  writeFilePulumiAndUploadToS3('admin.conf', cluster.kubeconfig, {});

  // cluster resources
  const externalDnsServiceAccount = createExternalDNSResources();
  const certManagerServiceAccount = createCertManagerResources();
  const fluxServiceAccount = createFluxResources();

  // simplelogin resources
  const dkimPublicKey = createSimpleloginResources(
    network.externalIPs[edgeInstanceConfig.network.externalIp],
    network.internalIPs[edgeInstanceConfig.network.internalIp],
    network,
  );

  // edge instance
  createEdgeResources(network, postgresqlUsers);

  return {
    cluster: {
      configuration: {
        endpoint: cluster.resource.endpoint,
        certificateAuthority: cluster.resource.masterAuth.clusterCaCertificate,
        kubeconfig: cluster.kubeconfig,
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
    mail: {
      dkim: {
        publicKey: dkimPublicKey,
      },
    },
  };
};
