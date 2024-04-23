import { ServerConfig } from './server';

/**
 * Defines mail configuration.
 */
export type MailConfig = {
  readonly domain: string;
  readonly zoneId: string;
  readonly spfInclude: string;
  readonly acmeEmail: string;
  readonly relay: MailRelayConfig;
  readonly handler: string;
  readonly publicIPv4Address: string;
  readonly server: ServerConfig;
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
