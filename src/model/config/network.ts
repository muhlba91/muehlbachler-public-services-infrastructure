import { StringMap } from '../map';

/**
 * Defines network configuration.
 */
export type NetworkConfig = {
  readonly subnet: StringMap<SubnetworkConfig>;
  readonly externalIp: StringMap<ExternalIpConfig>;
  readonly internalIp: StringMap<InternalIpConfig>;
  readonly tier: string;
  // TODO: proxmox
  readonly nameservers: readonly string[];
  readonly domain: string;
  readonly externalDomain: NetworkExternalDomainConfig;
  readonly ipv4: NetworkIPConfig;
  readonly ipv6: NetworkIPConfig;
};

/**
 * Defines subnetwork configuration.
 */
export type SubnetworkConfig = {
  readonly region: string;
  readonly cidr: string;
};

/**
 * Defines external IP address configuration.
 */
export type ExternalIpConfig = {
  readonly subnet: string;
  readonly tier?: string;
  readonly ipv6?: boolean;
};

/**
 * Defines internal IP address configuration.
 */
export type InternalIpConfig = {
  readonly subnet: string;
  readonly ipv6?: boolean;
};

// TODO: proxmox
/**
 * Defines IPv network configuration.
 */
export type NetworkIPConfig = {
  readonly enabled: boolean;
  readonly cidrMask: string;
  readonly gateway: string;
  readonly external: string;
};

/**
 * Defines external domain configuration.
 */
export type NetworkExternalDomainConfig = {
  readonly domain: string;
  readonly zoneId: string;
};
