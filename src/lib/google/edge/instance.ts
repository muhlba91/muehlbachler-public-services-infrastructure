import * as gcp from '@pulumi/gcp';
import { all, interpolate, Output, Resource } from '@pulumi/pulumi';

import { NetworkData } from '../../../model/network';
import {
  bucketId,
  commonLabels,
  edgeInstanceConfig,
  environment,
  globalName,
  googleConfig,
  mailConfig,
} from '../../configuration';
import { BUCKET_PATH } from '../../util/storage';
import { renderTemplate } from '../../util/template';
import { createIAMMember } from '../iam/member';
import { createServiceAccount } from '../iam/service_account';

import { createEdgePtrRecord } from './record';

export const INSTANCE_NAME = `${globalName}-edge-${environment}`;

/**
 * Creates an edge instance.
 *
 * @param {NetworkData} network the network
 * @param {Output<gcp.storage.BucketObject>[]} configs the configurations
 */
export const createEdgeInstance = (
  network: NetworkData,
  configs: readonly Output<gcp.storage.BucketObject>[],
) => {
  const md5ConfigHashes = all(configs.map((file) => file.detectMd5hash)).apply(
    (hashes) => hashes.join(','),
  );

  const serviceAccount = createServiceAccount('edge-ingress', {
    roles: ['roles/storage.objectUser'],
  });
  createIAMMember(
    'edge-ingress',
    interpolate`serviceAccount:${serviceAccount.email}`,
    ['roles/dns.admin'],
    { project: googleConfig.dnsProject },
  );

  const subnetworkId = network.subnets[edgeInstanceConfig.network.subnet].id;
  const hasIPv6 =
    network.externalIPs[edgeInstanceConfig.network.externalIp].ipv6 !=
    undefined;

  const instanceTemplate = new gcp.compute.InstanceTemplate(
    'gcp-instance-template-edge-instance',
    {
      namePrefix: `${INSTANCE_NAME}-`,
      description: `${globalName}/${environment}: edge instance`,
      instanceDescription: `${globalName}/${environment}: edge instance`,
      guestAccelerators: [],
      disks: [
        {
          autoDelete: true,
          boot: true,
          diskSizeGb: edgeInstanceConfig.diskSize,
          diskType: 'pd-standard',
          labels: {
            ...commonLabels,
            instance: INSTANCE_NAME,
          },
          sourceImage: edgeInstanceConfig.sourceImage,
          type: 'PERSISTENT',
        },
      ],
      serviceAccount: {
        email: serviceAccount.email,
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      },
      machineType: edgeInstanceConfig.machineType,
      labels: {
        ...commonLabels,
        instance: INSTANCE_NAME,
      },
      networkInterfaces: [
        {
          subnetwork: subnetworkId,
        },
      ],
      metadata: md5ConfigHashes.apply((md5ConfigHash) => ({
        'startup-script': renderTemplate('./assets/edge/startup.sh.j2', {
          bucket: {
            id: bucketId,
            path: BUCKET_PATH,
          },
          acme: {
            email: mailConfig.acmeEmail,
            domain: mailConfig.domain,
            project: googleConfig.dnsProject,
          },
          hash: md5ConfigHash,
        }),
      })),
      scheduling: {
        automaticRestart: true,
        onHostMaintenance: 'MIGRATE',
        provisioningModel: 'STANDARD',
        preemptible: false,
      },
      shieldedInstanceConfig: {
        enableIntegrityMonitoring: true,
        enableVtpm: true,
      },
      tags: [INSTANCE_NAME],
    },
    {
      dependsOn: Output.create(configs.map((file) => file)),
    },
  );

  const edgeRecords = edgeInstanceConfig.network.ptrRecords
    ? createEdgePtrRecord(
        network.externalIPs[edgeInstanceConfig.network.externalIp],
      )
    : [];
  new gcp.compute.InstanceFromTemplate(
    'gcp-instance-edge-instance',
    {
      sourceInstanceTemplate: instanceTemplate.id,
      allowStoppingForUpdate: true,
      desiredStatus: 'RUNNING',
      hostname: edgeInstanceConfig.hostname,
      zone: edgeInstanceConfig.zone,
      project: instanceTemplate.project,
      networkInterfaces: [
        {
          network: network.resource.id,
          networkIp:
            network.internalIPs[edgeInstanceConfig.network.internalIp].ipv4
              .address,
          accessConfigs: [
            {
              networkTier:
                network.externalIPs[edgeInstanceConfig.network.externalIp].ipv4
                  .networkTier,
              publicPtrDomainName: edgeInstanceConfig.network.ptrRecords
                ? `${edgeInstanceConfig.hostname}.`
                : undefined,
              natIp:
                network.externalIPs[edgeInstanceConfig.network.externalIp].ipv4
                  .address,
            },
          ],
          ipv6AccessConfigs: hasIPv6
            ? [
                {
                  name: 'External IPv6',
                  networkTier:
                    network.externalIPs[edgeInstanceConfig.network.externalIp]
                      ?.ipv6?.networkTier ?? 'STANDARD',
                  publicPtrDomainName: edgeInstanceConfig.network.ptrRecords
                    ? `${edgeInstanceConfig.hostname}.`
                    : undefined,
                  externalIpv6:
                    network.externalIPs[edgeInstanceConfig.network.externalIp]
                      ?.ipv6?.address,
                  externalIpv6PrefixLength: network.externalIPs[
                    edgeInstanceConfig.network.externalIp
                  ]?.ipv6?.prefixLength?.apply((length) => length.toString()),
                },
              ]
            : [],
          stackType: hasIPv6 ? 'IPV4_IPV6' : 'IPV4_ONLY',
          subnetwork: subnetworkId,
        },
      ],
    },
    {
      deleteBeforeReplace: true,
      dependsOn: configs
        .map((file) => file as Output<Resource>)
        .concat(edgeRecords.map((record) => Output.create(record))),
      ignoreChanges: ['metadata', 'metadataFingerprint'],
    },
  );
};
