/**
 * Defines mail configuration.
 */
export type MailConfig = {
  readonly domain: string;
  readonly zoneId: string;
  readonly spfInclude: string;
  readonly acmeEmail: string;
  readonly relay: MailRelayConfig;
};

/**
 * Defines mail relay configuration.
 */
export type MailRelayConfig = {
  readonly host: string;
  readonly port: number;
  readonly username: string;
  readonly password: string;
};
