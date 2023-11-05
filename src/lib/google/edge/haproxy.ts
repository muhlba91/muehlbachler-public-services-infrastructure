import * as gcp from '@pulumi/gcp';
import { Output } from '@pulumi/pulumi';

import { environment, globalName, ingressConfig } from '../../configuration';
import { getOrDefault } from '../../util/get_or_default';
import { writeFilePulumiAndUploadToS3 } from '../../util/storage';
import { renderTemplate } from '../../util/template';

/**
 * Creates HAProxy resouces.
 *
 * @returns {Output<gcp.storage.BucketObject>} the config object
 */
export const createHAProxyResources = (): Output<gcp.storage.BucketObject> =>
  writeFilePulumiAndUploadToS3(
    'haproxy.cfg',
    Output.create(
      renderTemplate('./assets/edge/haproxy/haproxy.cfg.j2', {
        proxies: Object.entries(ingressConfig.service)
          .filter(
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            ([_, config]) =>
              config.target != undefined && getOrDefault(config.exposed, true),
          )
          .map(([name, config]) => ({
            name: name,
            port: config.port,
            target: `${config.target?.service}.svc.${environment}.${globalName}.cluster:${config.target?.port}`,
          })),
      }),
    ),
    {
      s3SubPath: 'haproxy/',
    },
  );
