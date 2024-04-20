import * as gcp from '@pulumi/gcp';
import { Output } from '@pulumi/pulumi';

import { StringMap } from './map';
import { ServerData } from './server';

/**
 * Defines a cluster.
 */
export type ClusterData = {
  readonly resource?: gcp.container.Cluster;
  readonly kubeconfig: Output<string>;
  // TODO: proxmox
  readonly servers: StringMap<ServerData>;
  readonly rolesToNodes: StringMap<readonly string[]>;
  readonly nodeLabels: StringMap<string>;
};
