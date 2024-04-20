import * as fs from 'fs';
import { setTimeout } from 'timers/promises';

import * as kubernetes from '@pulumi/kubernetes';
import { all } from '@pulumi/pulumi';
import { parse } from 'yaml';

import {
  createCertManagerResources,
  createGoogleCertManagerResources,
} from './lib/cert_manager';
import { deployCilium } from './lib/cilium';
import { createClusterResources } from './lib/cluster';
import { createCluster } from './lib/cluster/k0sctl';
import {
  clusterConfig,
  edgeInstanceConfig,
  environment,
  globalName,
  k0sConfig,
  username,
} from './lib/configuration';
import {
  createExternalDNSResources,
  createGoogleExternalDNSResources,
} from './lib/external_dns';
import { createFluxResources, createGoogleFluxResources } from './lib/flux';
import { createGoogleCluster } from './lib/google/cluster/create';
import { createEdgeResources } from './lib/google/edge';
import { createNetwork } from './lib/google/network/network';
import { createPostgresql } from './lib/postgresql';
import { createSimpleloginResources } from './lib/simplelogin';
import { createDir } from './lib/util/create_dir';
import { readFileContents } from './lib/util/file';
import { createRandomPassword } from './lib/util/random';
import { sortedServerData } from './lib/util/sort';
import { createSSHKey } from './lib/util/ssh_key';
import { writeFilePulumiAndUploadToS3 } from './lib/util/storage';
import { renderTemplate } from './lib/util/template';

export = async () => {
  createDir('outputs');

  // network
  const network = createNetwork();

  // database
  const postgresqlUsers = createPostgresql();

  // cluster
  const cluster = createGoogleCluster(network);
  writeFilePulumiAndUploadToS3('admin-gke.conf', cluster.kubeconfig, {});

  // cluster resources
  const externalDnsServiceAccount = createGoogleExternalDNSResources();
  const certManagerServiceAccount = createGoogleCertManagerResources();
  const fluxServiceAccount = createGoogleFluxResources();

  // simplelogin resources
  const dkimPublicKey = createSimpleloginResources(
    network.externalIPs[edgeInstanceConfig.network.externalIp],
    network.internalIPs[edgeInstanceConfig.network.internalIp],
    network,
  );

  // edge instance
  createEdgeResources(network, postgresqlUsers);

  // TODO: proxmox
  // Servers
  const userPassword = createRandomPassword('server', { special: false });
  const sshKey = createSSHKey('public-services', {});
  const clusterData = all([
    userPassword.password,
    sshKey.publicKeyOpenssh,
  ]).apply(([userPasswordPlain, sshPublicKey]) =>
    createClusterResources(
      clusterConfig,
      userPasswordPlain,
      sshPublicKey.trim(),
    ),
  );

  // Write output files for the cluster
  writeFilePulumiAndUploadToS3('ssh.key', sshKey.privateKeyPem, {
    permissions: '0600',
  });
  writeFilePulumiAndUploadToS3(
    'k0sctl.yml',
    all([
      clusterData.servers,
      clusterData.rolesToNodes,
      clusterData.nodeLabels,
    ]).apply(([servers, rolesToNodes, nodeLabels]) =>
      renderTemplate('assets/k0sctl/k0sctl.yml.j2', {
        environment: environment,
        clusterName: globalName,
        k0s: k0sConfig,
        username: username,
        clusterNodes: sortedServerData(Object.values(servers)),
        clusterRoles: rolesToNodes,
        nodeLabels: nodeLabels,
        featureGates: clusterConfig.featureGates,
      }),
    ),
    {},
  );

  // // Kubernetes cloud resources
  createExternalDNSResources();
  createCertManagerResources();

  // k0sctl cluster creation
  // eslint-disable-next-line functional/no-loop-statements
  while (!fs.existsSync('./outputs/k0sctl.yml')) {
    await setTimeout(1000);
  }
  const k0sVersion = parse(readFileContents('./outputs/k0sctl.yml'))['spec'][
    'k0s'
  ]['version'];
  const kubeConfig = clusterData.servers.apply((servers) =>
    createCluster(k0sVersion, Object.values(servers), {}),
  );
  clusterData.servers.apply((servers) => {
    const kubernetesProvider = new kubernetes.Provider(
      `${globalName}-cluster`,
      {
        kubeconfig: kubeConfig,
      },
    );

    deployCilium({
      pulumiOptions: {
        dependsOn: Object.values(servers).map((server) => server.resource),
      },
    });

    createFluxResources(kubernetesProvider);
  });
  writeFilePulumiAndUploadToS3('admin.conf', kubeConfig, {});

  return {
    cluster: {
      configuration: {
        endpoint: cluster.resource?.endpoint,
        certificateAuthority: cluster.resource?.masterAuth.clusterCaCertificate,
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
