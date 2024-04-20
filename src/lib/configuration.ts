import {
  Config,
  getOrganization,
  getStack,
  StackReference,
} from '@pulumi/pulumi';

import { ClusterConfig } from '../model/config/cluster';
import { DatabaseConfig } from '../model/config/database';
import { EdgeInstanceConfig } from '../model/config/edge_instance';
import { GCPConfig, GoogleConfig } from '../model/config/google';
import { IngressConfig } from '../model/config/ingress';
import { K0sConfig } from '../model/config/k0s';
import { MailConfig } from '../model/config/mail';
import { NetworkConfig } from '../model/config/network';
import { ProxmoxConfig } from '../model/config/proxmox';
import { SecretStoresConfig } from '../model/config/secret_stores';

export const environment = getStack();

const config = new Config();
export const bucketId = config.require('bucketId');
export const googleConfig = config.requireObject<GoogleConfig>('google');
export const networkConfig = config.requireObject<NetworkConfig>('network');
export const clusterConfig = config.requireObject<ClusterConfig>('cluster');
export const k0sConfig = config.requireObject<K0sConfig>('k0s');
export const edgeInstanceConfig =
  config.requireObject<EdgeInstanceConfig>('edgeInstance');
export const ingressConfig = config.requireObject<IngressConfig>('ingress');
export const databaseConfig = config.requireObject<DatabaseConfig>('database');
export const mailConfig = config.requireObject<MailConfig>('mail');
export const secretStoresConfig =
  config.requireObject<SecretStoresConfig>('secretStores');
export const username = config.require<string>('username');
export const gcpConfig = config.requireObject<GCPConfig>('gcp');
export const pveConfig = config.requireObject<ProxmoxConfig>('pve');

const sharedServicesStack = new StackReference(
  `${getOrganization()}/muehlbachler-shared-services/${environment}`,
);
const sharedServicesStackAws = sharedServicesStack.requireOutput('aws');
export const postgresqlConfig = sharedServicesStackAws.apply((output) => ({
  address: output.postgresql.address as string,
  port: output.postgresql.port as number,
  username: output.postgresql.username as string,
  password: output.postgresql.password as string,
}));
const sharedServicesStackMongoDb = sharedServicesStack.requireOutput('mongodb');
export const mongodbClusterConfig = sharedServicesStackMongoDb.apply(
  (output) => ({
    clusterName: output.atlas.clusterName as string,
    projectId: output.atlas.projectId as string,
    endpoint: output.atlas.endpoint as string,
  }),
);

export const globalName = 'public-services';
export const globalShortName = 'pub-svcs';

export const awsDefaultRegion = 'eu-west-1';

export const commonLabels = {
  environment: environment,
  purpose: globalName,
};
