import * as gcp from '@pulumi/gcp';
import { all, Resource } from '@pulumi/pulumi';

import { ClusterData } from '../../../model/cluster';
import { NetworkData } from '../../../model/network';
import {
  clusterConfig,
  commonLabels,
  environment,
  globalName,
} from '../../configuration';
import { renderTemplate } from '../../util/template';

import { createNodePools } from './node_pool';

export const CLUSTER_NAME = `${globalName}-cluster-${environment}`;

/**
 * Creates a cluster.
 *
 * @param {NetworkData} network the network
 * @returns {ClusterData} the cluster
 */
export const createGoogleCluster = (network: NetworkData): ClusterData => {
  const cluster = new gcp.container.Cluster(
    'gcp-cluster',
    {
      name: CLUSTER_NAME,
      description: `${globalName}/${environment}: cluster`,
      deletionProtection: true,
      addonsConfig: {
        horizontalPodAutoscaling: {
          disabled: false,
        },
        gcePersistentDiskCsiDriverConfig: {
          enabled: true,
        },
        gcpFilestoreCsiDriverConfig: {
          enabled: true,
        },
        dnsCacheConfig: {
          enabled: false,
        },
        httpLoadBalancing: {
          disabled: false, // TODO: enableL4IlbSubsetting is not taken
        },
      },
      enableL4IlbSubsetting: true, // TODO: not applying - can't be set to false...
      binaryAuthorization: {
        evaluationMode: 'DISABLED',
      },
      clusterAutoscaling: {
        autoscalingProfile: 'OPTIMIZE_UTILIZATION',
      },
      serviceExternalIpsConfig: {
        enabled: true,
      },
      datapathProvider: 'ADVANCED_DATAPATH',
      dnsConfig: {
        clusterDns: 'CLOUD_DNS',
        clusterDnsScope: 'VPC_SCOPE',
        clusterDnsDomain: `${environment}.${globalName}.cluster`,
      },
      enableShieldedNodes: true,
      initialNodeCount: 1,
      removeDefaultNodePool: true,
      ipAllocationPolicy: {
        stackType: 'IPV4_IPV6',
      },
      location: clusterConfig.zone,
      loggingConfig: {
        enableComponents: [],
      },
      monitoringConfig: {
        enableComponents: ['SYSTEM_COMPONENTS'].concat(
          clusterConfig.monitoringComponents ?? [],
        ),
        managedPrometheus: {
          enabled: true,
        },
      },
      network: network.resource.id,
      subnetwork: network.subnets[clusterConfig.subnet].id,
      networkingMode: 'VPC_NATIVE',
      releaseChannel: {
        channel: clusterConfig.releaseChannel,
      },
      resourceLabels: {
        ...commonLabels,
        cluster: CLUSTER_NAME,
      },
      securityPostureConfig: clusterConfig.enableSecurityPosture
        ? {
            mode: 'BASIC',
            vulnerabilityMode: 'VULNERABILITY_DISABLED',
          }
        : undefined,
      workloadIdentityConfig: {
        workloadPool: `${gcp.config.project}.svc.id.goog`,
      },
    },
    {
      dependsOn: [network.resource as Resource].concat(
        Object.values(network.subnets),
      ),
      ignoreChanges: ['nodePools', 'nodeConfig'],
    },
  );

  createNodePools(cluster);

  return {
    resource: cluster,
    kubeconfig: all([
      cluster.endpoint,
      cluster.masterAuth.clusterCaCertificate,
    ]).apply(([endpoint, certificateAuthority]) =>
      renderTemplate('./assets/kubeconfig.j2', {
        name: CLUSTER_NAME,
        certificateAuthority: certificateAuthority,
        endpoint: endpoint,
      }),
    ),
    servers: {},
    rolesToNodes: {},
    nodeLabels: {},
  };
};
