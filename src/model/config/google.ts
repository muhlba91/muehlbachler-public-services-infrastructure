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
