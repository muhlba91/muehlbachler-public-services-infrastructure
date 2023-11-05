import { interpolate, Output } from '@pulumi/pulumi';

import { ExternalIPData } from '../../model/network';
import { mailConfig } from '../configuration';
import { createRecord } from '../google/dns/record';
import { b64encode } from '../util/base64';

/**
 * Creates the base DNS records.
 *
 * @param {ExternalIPData} externalIp the external IP of the mail server
 * @param {Output<string>} dkimPublicKey the public DKIM key
 */
export const createDNSRecords = (
  externalIp: ExternalIPData,
  dkimPublicKey: Output<string>,
) => {
  const mailserverDomain = `relay.${mailConfig.domain}`;

  // server A/AAAA records
  createRecord(
    mailserverDomain,
    mailConfig.zoneId,
    'A',
    [externalIp.ipv4.address],
    {},
  );
  if (externalIp.ipv6 != undefined) {
    createRecord(
      mailserverDomain,
      mailConfig.zoneId,
      'AAAA',
      [externalIp.ipv6?.address ?? Output.create('')],
      {},
    );
  }

  // DKIM and SPF
  createRecord(
    `_adsp._domainkey.${mailConfig.domain}`,
    mailConfig.zoneId,
    'TXT',
    ['dkim=all'],
    {},
  );
  createRecord(
    `dkim._domainkey.${mailConfig.domain}`,
    mailConfig.zoneId,
    'TXT',
    [
      interpolate`v=DKIM1; k=rsa; p=${dkimPublicKey.apply((key) =>
        b64encode(key),
      )}`.apply((entry) => splitByLength(entry, 'TXT')),
    ], // FIXME: dkim key
    {},
  );
  createRecord(
    `_dmarc.${mailConfig.domain}`,
    mailConfig.zoneId,
    'TXT',
    [splitByLength('v=DMARC1; p=quarantine; pct=100; adkim=s; aspf=s', 'TXT')],
    {},
  );
  createRecord(
    mailConfig.domain,
    mailConfig.zoneId,
    'MX',
    [`10 ${mailserverDomain}.`, `20 ${mailserverDomain}.`],
    {},
  );
  createRecord(
    mailConfig.domain,
    mailConfig.zoneId,
    'TXT',
    [
      splitByLength(
        `v=spf1 mx a:${mailserverDomain} a:${mailConfig.domain} include:${mailConfig.spfInclude} ~all`,
        'TXT',
      ),
    ],
    {},
  );
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
