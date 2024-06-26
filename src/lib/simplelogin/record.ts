import { interpolate, Output } from '@pulumi/pulumi';

import { mailConfig, networkConfig } from '../configuration';
import { createRecord } from '../google/dns/record';

export const MAILSERVER_DOMAIN = `relay.${mailConfig.domain}`;

/**
 * Creates the base DNS records.
 *
 * @param {Output<string>} dkimPublicKey the public DKIM key
 */
export const createDNSRecords = (dkimPublicKey: Output<string>) => {
  // server A/AAAA records
  createRecord(
    MAILSERVER_DOMAIN,
    mailConfig.zoneId,
    'A',
    [mailConfig.publicIPv4Address],
    {},
  );
  createRecord(
    MAILSERVER_DOMAIN,
    mailConfig.zoneId,
    'AAAA',
    [Output.create(mailConfig.server.ipv6Address)],
    {},
  );
  // needed for reverse lookup
  createRecord(
    networkConfig.domain,
    networkConfig.externalDomain.zoneId,
    'A',
    [mailConfig.publicIPv4Address],
    {},
  );
  createRecord(
    networkConfig.domain,
    networkConfig.externalDomain.zoneId,
    'AAAA',
    [Output.create(mailConfig.server.ipv6Address)],
    {},
  );

  createRecord(
    `dkim._domainkey.${mailConfig.domain}`,
    mailConfig.zoneId,
    'TXT',
    [
      interpolate`v=DKIM1; k=rsa; p=${dkimPublicKey}`.apply((entry) =>
        splitByLength(entry, 'TXT'),
      ),
    ],
    {},
  );
  createRecord(
    `dkim02._domainkey.${mailConfig.domain}`,
    mailConfig.zoneId,
    'TXT',
    [
      interpolate`v=DKIM1; k=rsa; p=${dkimPublicKey}`.apply((entry) =>
        splitByLength(entry, 'TXT'),
      ),
    ],
    {},
  );
  createRecord(
    `dkim03._domainkey.${mailConfig.domain}`,
    mailConfig.zoneId,
    'TXT',
    [
      interpolate`v=DKIM1; k=rsa; p=${dkimPublicKey}`.apply((entry) =>
        splitByLength(entry, 'TXT'),
      ),
    ],
    {},
  );
  createRecord(
    mailConfig.domain,
    mailConfig.zoneId,
    'TXT',
    [
      splitByLength(
        `v=spf1 mx a:${MAILSERVER_DOMAIN} a:${mailConfig.domain} include:${mailConfig.spfInclude} ~all`,
        'TXT',
      ),
    ],
    {},
  );

  createMailDNSRecords(mailConfig.domain, { isSubdomain: false });
  createMailDNSRecords(MAILSERVER_DOMAIN, { isSubdomain: true });
};

/**
 * Creates the mail DNS records.
 *
 * @param {string} domain the domain
 * @param {boolean} isSubdomain provision a subdomain (default: true)
 */
export const createMailDNSRecords = (
  domain: string,
  {
    isSubdomain = true,
  }: {
    readonly isSubdomain?: boolean;
  },
) => {
  createRecord(
    `_adsp._domainkey.${domain}`,
    mailConfig.zoneId,
    'TXT',
    ['dkim=all'],
    {},
  );
  createRecord(
    `_dmarc.${domain}`,
    mailConfig.zoneId,
    'TXT',
    [splitByLength('v=DMARC1; p=quarantine; pct=100; adkim=s; aspf=s', 'TXT')],
    {},
  );

  createRecord(
    domain,
    mailConfig.zoneId,
    'MX',
    [`10 ${MAILSERVER_DOMAIN}.`, `20 ${MAILSERVER_DOMAIN}.`],
    {},
  );

  if (isSubdomain) {
    createRecord(
      `dkim._domainkey.${domain}`,
      mailConfig.zoneId,
      'CNAME',
      [`dkim._domainkey.${mailConfig.domain}.`],
      {},
    );
    createRecord(
      `dkim02._domainkey.${domain}`,
      mailConfig.zoneId,
      'CNAME',
      [`dkim02._domainkey.${mailConfig.domain}.`],
      {},
    );
    createRecord(
      `dkim03._domainkey.${domain}`,
      mailConfig.zoneId,
      'CNAME',
      [`dkim03._domainkey.${mailConfig.domain}.`],
      {},
    );

    createRecord(
      domain,
      mailConfig.zoneId,
      'TXT',
      [splitByLength(`v=spf1 include:${mailConfig.domain} -all`, 'TXT')],
      {},
    );
  }
};

/**
 * Splits the value by the allowed maximum length.
 *
 * @param {string} value the value
 * @param {string} type the entry type
 * @returns
 */
const splitByLength = (value: string, type: string) => {
  const split = value.split(/(.{200})/).filter((x) => x.length > 0);

  return split.length > 1 || type == 'TXT'
    ? `"${split.join('" "')}"`
    : split.join();
};
