import { StringMap } from '../map';

import { ClusterNodeConfig } from './cluster/node';
import { GoogleEncryptionKeyConfig } from './google';

/**
 * Defines cluster configuration.
 */
export type ClusterConfig = {
  readonly zone: string;
  readonly subnet: string;
  readonly releaseChannel: string;
  readonly monitoringComponents?: readonly string[];
  readonly enableSecurityPosture?: boolean;
  readonly nodePools: StringMap<ClusterNodePoolConfig>;
  readonly accessConfiguration: ClusterAccessConfig;
  // TODO: proxmox
  readonly nodes: StringMap<ClusterNodeConfig>;
  readonly featureGates?: readonly string[];
};

/**
 * Defines cluster node pool configuration.
 */
export type ClusterNodePoolConfig = {
  readonly enabled?: boolean;
  readonly minCount: number;
  readonly maxCount: number;
  readonly initialNodeCount: number;
  readonly diskSize: number;
  readonly machineType: string;
  readonly spot?: boolean;
  readonly labels?: StringMap<string>;
  readonly taints?: readonly ClusterNodePoolTaintConfig[];
};

/**
 * Defines cluster node pool taint configuration.
 */
export type ClusterNodePoolTaintConfig = {
  readonly key: string;
  readonly value: string;
  readonly effect: string;
};

/**
 * Defines cluster access configuration.
 */
export type ClusterAccessConfig = {
  readonly encryptionKey: GoogleEncryptionKeyConfig;
  readonly projects?: readonly string[];
};
