import * as fs from 'fs';
import { setTimeout } from 'timers/promises';

import * as kubernetes from '@pulumi/kubernetes';
import { all, Output } from '@pulumi/pulumi';
import { parse } from 'yaml';

import { createCertManagerResources } from './lib/cert_manager';
import { deployCilium } from './lib/cilium';
import { createClusterResources } from './lib/cluster';
import { createCluster } from './lib/cluster/k0sctl';
import {
  clusterConfig,
  environment,
  globalName,
  k0sConfig,
  username,
} from './lib/configuration';
import { createExternalDNSResources } from './lib/external_dns';
import { createFluxResources } from './lib/flux';
import { createMailResources } from './lib/mail';
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

  // server authentication
  const userPassword = createRandomPassword('server', { special: false });
  const sshKey = createSSHKey('public-services', {});

  // database
  const postgresqlUsers = createPostgresql();

  // simplelogin resources
  const dkimPublicKey = createSimpleloginResources();

  // // Kubernetes cloud resources
  createExternalDNSResources();
  createCertManagerResources();

  // mail server
  all([userPassword.password, sshKey.publicKeyOpenssh]).apply(
    ([userPasswordPlain, sshPublicKey]) =>
      createMailResources(
        userPasswordPlain,
        sshPublicKey.trim(),
        postgresqlUsers,
      ),
  );

  // cluster servers
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

  // write output files for the cluster
  writeFilePulumiAndUploadToS3('ssh.key', sshKey.privateKeyPem, {
    permissions: '0600',
  });
  const k0sctl = writeFilePulumiAndUploadToS3(
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

  // k0sctl cluster creation
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const kubeConfig = k0sctl.apply(async (_) => {
    // eslint-disable-next-line functional/no-loop-statements
    while (!fs.existsSync('./outputs/k0sctl.yml')) {
      await setTimeout(1000);
    }
    const k0sVersion = parse(readFileContents('./outputs/k0sctl.yml'))['spec'][
      'k0s'
    ]['version'];
    return clusterData.servers.apply((servers) =>
      createCluster(k0sVersion, Object.values(servers), {}),
    );
  }) as unknown as Output<string>;
  all([clusterData.servers]).apply(([servers]) => {
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
  writeFilePulumiAndUploadToS3(
    'admin.conf',
    kubeConfig as unknown as Output<string>,
    {},
  );

  return {
    cluster: {
      configuration: {
        kubeconfig: kubeConfig,
      },
    },
    mail: {
      dkim: {
        publicKey: dkimPublicKey,
      },
    },
  };
};
