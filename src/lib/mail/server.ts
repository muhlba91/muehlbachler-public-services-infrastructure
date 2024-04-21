import { createHash } from 'crypto';

import { all } from '@pulumi/pulumi';

import { StringMap } from '../../model/map';
import { PostgresqlUserData } from '../../model/postgresql';
import { ServerData } from '../../model/server';
import {
  bucketId,
  gcpConfig,
  globalName,
  mailConfig,
  networkConfig,
  postgresqlConfig,
} from '../configuration';
import { createServer } from '../proxmox/create';
import { b64decode } from '../util/base64';
import { readFileContents } from '../util/file';
import { BUCKET_PATH } from '../util/storage';
import { renderTemplate } from '../util/template';

import { createServiceAccount } from './service_account';

/**
 * Creates the mail server
 *
 * @param {string} userPassword the user's password
 * @param {string} sshPublicKey the SSH public key (OpenSSH)
 * @param {StringMap<PostgresqlUserData>} postgresqlUsers a map containing users and their passwords
 * @returns {ServerData} the generated server
 */
export const createMailServer = (
  userPassword: string,
  sshPublicKey: string,
  postgresqlUsers: StringMap<PostgresqlUserData>,
): ServerData => {
  const database = all([
    postgresqlUsers['simplelogin'].password,
    postgresqlConfig.address,
    postgresqlConfig.port,
  ]).apply(([password, address, port]) => ({
    host: address,
    port: port,
    database: 'simplelogin',
    user: 'simplelogin',
    password: password,
  }));

  const iam = createServiceAccount();

  const vendorConfigData = all([database, iam.key.privateKey]).apply(
    ([db, serviceAccountKey]) =>
      renderTemplate('assets/vendor-config/mail.yml', {
        credentials: b64decode(serviceAccountKey),
        acme: {
          cron: renderTemplate('./assets/mail/acme/cron.j2', {
            project: gcpConfig.dnsProject,
          }),
          reload: renderTemplate('./assets/mail/acme/reload-acme-cert.j2', {
            bucket: {
              id: bucketId,
              path: BUCKET_PATH,
            },
          }),
          configure: renderTemplate('./assets/mail/acme/configure-acme.sh.j2', {
            bucket: {
              id: bucketId,
              path: BUCKET_PATH,
            },
            acme: {
              email: mailConfig.acmeEmail,
              domain: mailConfig.domain,
              project: gcpConfig.dnsProject,
            },
          }),
        },
        postfix: {
          bodyChecks: readFileContents(
            './assets/mail/postfix/body_checks.pcre',
          ),
          clientHeaders: readFileContents(
            './assets/mail/postfix/client_headers.pcre',
          ),
          main: renderTemplate('./assets/mail/postfix/main.cf.j2', {
            baseDomain: mailConfig.domain,
            hostname: networkConfig.domain,
            mailRelay: mailConfig.relay,
          }),
          master: readFileContents('./assets/mail/postfix/master.cf'),
          pgsqlRelayDomains: renderTemplate(
            './assets/mail/postfix/pgsql-relay-domains.cf.j2',
            {
              database: db,
              baseDomain: mailConfig.domain,
            },
          ),
          pgsqlTransportMaps: renderTemplate(
            './assets/mail/postfix/pgsql-transport-maps.cf.j2',
            {
              database: db,
              handlerDomain: mailConfig.handler,
              baseDomain: mailConfig.domain,
            },
          ),
          saslPasswd: renderTemplate('./assets/mail/postfix/sasl_passwd.j2', {
            mailRelay: mailConfig.relay,
          }),
        },
      }),
  );

  const hostname = `${globalName}-mail`;
  return createServer(
    globalName,
    hostname,
    userPassword,
    sshPublicKey,
    mailConfig.server,
    vendorConfigData,
    vendorConfigData.apply((data) =>
      createHash('sha256').update(data).digest('hex'),
    ),
    [hostname],
  );
};
