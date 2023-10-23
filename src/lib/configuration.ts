import {
  Config,
  getOrganization,
  getStack,
  StackReference,
} from '@pulumi/pulumi';

import { ArgocdConfig } from '../model/config/argocd';
import { ClusterConfig } from '../model/config/cluster';
import { DatabaseConfig } from '../model/config/database';
import { EdgeInstanceConfig } from '../model/config/edge_instance';
import { IngressConfig } from '../model/config/ingress';
import { NetworkConfig } from '../model/config/network';

export const environment = getStack();

const config = new Config();
export const bucketId = config.require('bucketId');
export const networkConfig = config.requireObject<NetworkConfig>('network');
export const clusterConfig = config.requireObject<ClusterConfig>('cluster');
export const edgeInstanceConfig =
  config.requireObject<EdgeInstanceConfig>('edgeInstance');
export const ingressConfig = config.requireObject<IngressConfig>('ingress');
export const databaseConfig = config.requireObject<DatabaseConfig>('database');
export const argocdConfig = config.requireObject<ArgocdConfig>('argocd');

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

export const globalName = 'public-services';
export const globalShortName = 'pub-svcs';

export const commonLabels = {
  environment: environment,
  purpose: globalName,
};
