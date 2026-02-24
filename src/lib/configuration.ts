import { Config, getStack } from '@pulumi/pulumi';

import { ClusterConfig } from '../model/config/cluster/cluster';
import { GCPConfig } from '../model/config/google';
import { K0sConfig } from '../model/config/k0s';
import { NetworkConfig } from '../model/config/network';
import { ProxmoxConfig } from '../model/config/proxmox';
import { SecretStoresConfig } from '../model/config/secret_stores';

export const environment = getStack();

const config = new Config();
export const bucketId = config.require('bucketId');
export const networkConfig = config.requireObject<NetworkConfig>('network');
export const clusterConfig = config.requireObject<ClusterConfig>('cluster');
export const k0sConfig = config.requireObject<K0sConfig>('k0s');
export const secretStoresConfig =
  config.requireObject<SecretStoresConfig>('secretStores');
export const username = config.require<string>('username');
export const gcpConfig = config.requireObject<GCPConfig>('gcp');
export const pveConfig = config.requireObject<ProxmoxConfig>('pve');

export const globalName = 'public-services';
export const globalShortName = 'pub-svcs';

export const commonLabels = {
  environment: environment,
  purpose: globalName,
};
