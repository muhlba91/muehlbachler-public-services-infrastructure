import * as proxmox from '@muhlba91/pulumi-proxmoxve';
import { interpolate, Output } from '@pulumi/pulumi';

import { ServerConfig } from '../../model/config/server';
import { ServerData } from '../../model/server';
import {
  environment,
  networkConfig,
  pveConfig,
  username,
} from '../configuration';

// FIXME: https://github.com/muhlba91/pulumi-proxmoxve/issues/2
const provider = new proxmox.Provider('proxmoxve', {
  endpoint: process.env.PROXMOX_VE_ENDPOINT,
  insecure: true,
  username: process.env.PROXMOX_VE_USERNAME,
  password: process.env.PROXMOX_VE_PASSWORD,
});

/**
 * Creates a server.
 *
 * @param {string} prefix the prefix for the Pulumi resource
 * @param {string} hostname the server's hostname
 * @param {string} userPassword the user's password
 * @param {string} sshPublicKey the SSH public key (OpenSSH)
 * @param {ServerConfig} server the data for the server
 * @param {Output<string>} vendorConfigData the vendor configuration data
 * @param {Output<string>} vendorConfigDataHash the hash of the vendor configuration data
 * @param {string[]} extraTags the extra tags
 * @returns {ServerData} the generated server
 */
export const createServer = (
  prefix: string,
  hostname: string,
  userPassword: string,
  sshPublicKey: string,
  server: ServerConfig,
  vendorConfigData: Output<string>,
  vendorConfigDataHash: Output<string>,
  extraTags: string[],
): ServerData => {
  const vendorConfig = new proxmox.storage.File(
    `vendor-config-${prefix}-${hostname}-${environment}`,
    {
      contentType: 'snippets',
      datastoreId: pveConfig.localStoragePool,
      nodeName: server.host,
      sourceRaw: {
        data: vendorConfigData,
        fileName: interpolate`vendor-config-${prefix}-${hostname}-${environment}-${vendorConfigDataHash}.yml`,
      },
    },
    {
      provider: provider,
    },
  );

  const machine = new proxmox.vm.VirtualMachine(
    `vm-${prefix}-${hostname}-${environment}`,
    {
      nodeName: server.host,
      agent: {
        enabled: true, // toggles checking for ip addresses through qemu-guest-agent
        trim: true,
        type: 'virtio',
        timeout: '20m',
      },
      bios: 'seabios',
      cpu: {
        cores: server.cpu,
        sockets: server.sockets ?? 1,
        type: server.cpuType ?? pveConfig.cpuType,
      },
      disks: [
        {
          interface: 'scsi0',
          datastoreId: pveConfig.storagePool,
          fileId: pveConfig.imageName,
          size: server.diskSize,
          fileFormat: 'raw',
          ssd: true,
          iothread: true,
          discard: 'on',
        },
      ],
      efiDisk: {
        datastoreId: pveConfig.storagePool,
        preEnrolledKeys: false,
        fileFormat: 'raw',
        type: '4m',
      },
      scsiHardware: 'virtio-scsi-single',
      memory: {
        dedicated: server.memory.max,
        floating: server.memory.min,
      },
      name: hostname,
      networkDevices: [
        {
          bridge: pveConfig.networkBridge,
          model: 'virtio',
        },
      ],
      usbs: server.usbPassthrough?.map((usb) => ({
        host: usb.host,
        usb3: usb.usb3,
      })),
      onBoot: true,
      startup: {
        order: server.startupOrder,
      },
      operatingSystem: {
        type: 'l26',
      },
      initialization: {
        type: 'nocloud',
        datastoreId: pveConfig.storagePool,
        vendorDataFileId: vendorConfig.id,
        interface: 'ide2',
        dns: {
          domain: networkConfig.domain,
          servers: networkConfig.nameservers.map((server) => server),
        },
        ipConfigs: [
          {
            ipv4: {
              address: `${server.ipv4Address}/${networkConfig.ipv4.cidrMask}`,
              gateway: networkConfig.ipv4.gateway,
            },
            ipv6: {
              address: `${server.ipv6Address}/${networkConfig.ipv6.cidrMask}`,
              gateway: networkConfig.ipv6.gateway,
            },
          },
        ],
        userAccount: {
          username: username,
          password: userPassword,
          keys: [sshPublicKey],
        },
      },
      started: true,
      rebootAfterUpdate: true,
      tags: [...extraTags, environment].sort(),
    },
    {
      provider: provider,
      deleteBeforeReplace: true,
      ignoreChanges: [
        'disks',
        'disks[0].speed',
        'disks[0].fileFormat',
        'disks[0].pathInDatastore',
        'cdrom',
        'serialDevices',
        'vga',
        'efiDisk',
        'startup.downDelay',
        'startup.upDelay',
        'watchdog',
      ],
    },
  );
  return {
    resource: machine,
    serverId: machine.vmId,
    hostname: hostname,
    ipv4Address: server.ipv4Address,
    ipv6Address: server.ipv6Address,
  };
};
