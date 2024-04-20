/**
 * Defines Google configuration.
 */
export type GoogleConfig = {
  readonly dnsProject: string;
};

/**
 * Defines Google encryption key configuration.
 */
export type GoogleEncryptionKeyConfig = {
  readonly location: string;
  readonly keyringId: string;
  readonly cryptoKeyId: string;
};

// TODO: proxmox
/**
 * Defines configuration data for GCP.
 */
export type GCPConfig = {
  readonly dnsProject: string;
  readonly encryptionKey: GCPEncryptionKeyConfig;
};

/**
 * Defines encryption key configuration data for GCP.
 */
export type GCPEncryptionKeyConfig = {
  readonly location: string;
  readonly keyringId: string;
  readonly cryptoKeyId: string;
};
