import { StringMap } from '../../../model/map';
import { NetworkData } from '../../../model/network';
import { PostgresqlUserData } from '../../../model/postgresql';
import { createEdgeInstanceFirewalls } from '../network/firewall';

import { createHAProxyResources } from './haproxy';
import { createEdgeInstance } from './instance';
import { createPostfixResources } from './postfix';

/**
 * Creates an edge resources.
 *
 * @param {NetworkData} network the network
 * @param {StringMap<PostgresqlUserData>} postgresqlUsers a map containing users and their passwords
 */
export const createEdgeResources = (
  network: NetworkData,
  postgresqlUsers: StringMap<PostgresqlUserData>,
) => {
  const haproxyConfig = createHAProxyResources();
  const postfixConfigs = createPostfixResources(postgresqlUsers);

  createEdgeInstance(network, postfixConfigs.concat(haproxyConfig));
  createEdgeInstanceFirewalls(network);
};
