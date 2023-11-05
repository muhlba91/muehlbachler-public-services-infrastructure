import * as gcp from '@pulumi/gcp';
import { all, Output } from '@pulumi/pulumi';

import { StringMap } from '../../../model/map';
import { PostgresqlUserData } from '../../../model/postgresql';
import {
  environment,
  globalName,
  mailConfig,
  postgresqlConfig,
} from '../../configuration';
import { readFileContents } from '../../util/file';
import { writeFilePulumiAndUploadToS3 } from '../../util/storage';
import { renderTemplate } from '../../util/template';

/**
 * Creates Postfix resouces.
 *
 * @param {StringMap<PostgresqlUserData>} postgresqlUsers a map containing users and their passwords
 * @returns {Output<gcp.storage.BucketObject>[]} the config objects
 */
export const createPostfixResources = (
  postgresqlUsers: StringMap<PostgresqlUserData>,
): Output<gcp.storage.BucketObject>[] => {
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

  const files = [
    writeFilePulumiAndUploadToS3(
      'body_checks.pcre',
      Output.create(readFileContents('./assets/edge/postfix/body_checks.pcre')),
      {
        s3SubPath: 'postfix/',
      },
    ),
    writeFilePulumiAndUploadToS3(
      'client_headers.pcre',
      Output.create(
        readFileContents('./assets/edge/postfix/client_headers.pcre'),
      ),
      {
        s3SubPath: 'postfix/',
      },
    ),
    writeFilePulumiAndUploadToS3(
      'master.cf',
      Output.create(readFileContents('./assets/edge/postfix/master.cf')),
      {
        s3SubPath: 'postfix/',
      },
    ),
    database.apply((db) =>
      writeFilePulumiAndUploadToS3(
        'pgsql-relay-domains.cf',
        Output.create(
          renderTemplate('./assets/edge/postfix/pgsql-relay-domains.cf.j2', {
            database: db,
            baseDomain: mailConfig.domain,
          }),
        ),
        {
          s3SubPath: 'postfix/',
        },
      ),
    ),
    database.apply((db) =>
      writeFilePulumiAndUploadToS3(
        'pgsql-transport-maps.cf',
        Output.create(
          renderTemplate('./assets/edge/postfix/pgsql-transport-maps.cf.j2', {
            database: db,
            clusterDnsDomain: `${environment}.${globalName}.cluster`,
            baseDomain: mailConfig.domain,
          }),
        ),
        {
          s3SubPath: 'postfix/',
        },
      ),
    ),
    writeFilePulumiAndUploadToS3(
      'sasl_passwd',
      Output.create(
        renderTemplate('./assets/edge/postfix/sasl_passwd.j2', {
          mailRelay: mailConfig.relay,
        }),
      ),
      {
        s3SubPath: 'postfix/',
      },
    ),
    writeFilePulumiAndUploadToS3(
      'main.cf',
      Output.create(
        renderTemplate('./assets/edge/postfix/main.cf.j2', {
          baseDomain: mailConfig.domain,
          mailRelay: mailConfig.relay,
        }),
      ),
      {
        s3SubPath: 'postfix/',
      },
    ),
  ];

  return files;
};
