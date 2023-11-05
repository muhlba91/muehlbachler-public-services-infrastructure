# Personal Public Services - Infrastructure

[![Build status](https://img.shields.io/github/actions/workflow/status/muhlba91/muehlbachler-public-services-infrastructure/pipeline.yml?style=for-the-badge)](https://github.com/muhlba91/muehlbachler-public-services-infrastructure/actions/workflows/pipeline.yml)
[![License](https://img.shields.io/github/license/muhlba91/muehlbachler-public-services-infrastructure?style=for-the-badge)](LICENSE.md)

This repository contains the infrastructure as code (IaC) for personal public services using [Pulumi](http://pulumi.com).

---

## Requirements

- [NodeJS](https://nodejs.org/en), and [yarn](https://yarnpkg.com)
- [Pulumi](https://www.pulumi.com/docs/install/)

## Creating the Infrastructure

To create the infrastructure and deploy the virtual machine, a [Pulumi Stack](https://www.pulumi.com/docs/concepts/stack/) with the correct configuration needs to exists.

The stack can be deployed via:

```bash
yarn install
yarn build; pulumi up
```

## Destroying the Infrastructure

The entire infrastructure can be destroyed via:

```bash
yarn install
yarn build; pulumi destroy
```

## Environment Variables

To successfully run, and configure the Pulumi plugins, you need to set a list of environment variables. Alternatively, refer to the used Pulumi provider's configuration documentation.

- `AWS_REGION`: the AWS region
- `AWS_ACCESS_KEY_ID`: the AWS access key identifier
- `AWS_SECRET_ACCESS_KEY`: the AWS secret access key
- `CLOUDSDK_CORE_PROJECT`: the Google Cloud (GCP) project
- `CLOUDSDK_COMPUTE_REGION` the Google Cloud (GCP) region
- `GOOGLE_APPLICATION_CREDENTIALS`: reference to a file containing the Google Cloud (GCP) service account credentials
- `DOPPLER_TOKEN`: the token to access [Doppler](https://www.doppler.com) for secrets
- `GITHUB_TOKEN`: the token to interact with GitHub

---

## Configuration

The following section describes the configuration which must be set in the Pulumi Stack.

***Attention:*** do use [Secrets Encryption](https://www.pulumi.com/docs/concepts/secrets/#:~:text=Pulumi%20never%20sends%20authentication%20secrets,“secrets”%20for%20extra%20protection.) provided by Pulumi for secret values!

### Database

A database is created with the corresponding user.

```yaml
database:
  databases: a map of databases to create and their owner
  users: a list of users to create
```

### Ingress

On the edge node the specified ingresses are configured and ports opened accordingly.

```yaml
ingress:
  service: a map of the service name to the configuration
    <NAME>:
      port: the port number
      exposed: should the port be exposed and opened in the firewall? (optional, default: false)
      target: the ingress target configuration if it is not the edge node (optional)
        port: the port number
        service: the service name in the VPC DNS
```

### Edge Instance

The edge instance handles ingress to the network and cluster.

```yaml
edgeInstance:
  zone: the Google Cloud zone of the instance (should usually match the cluster zone)
  machineType: the machine type to choose
  sourceImage: the Google Cloud source image to use
  diskSize: the boot disk size
  hostname: the hostname to set; also used for reverse DNS pointer records (optional)
  network:
    subnet: the subnet name for the instance
    externalIp: the external IP address name
    ptrRecords: should pointer records be set? (attention: the ownership must be verified!)
```

### Network

```yaml
network:
  subnet: a map of the subnet name to its configuration
    <NAME>:
      region: the Google Cloud region to place the subnet in
      cidr: the CIDR for this subnet (should not overlap with any other subnet CIDR)
  externalIp: a map of the external IP address name to its configuration
    <NAME>:
      subnet: the subnet to reserve the IP address in
      tier: the network tier (optional, default see network.tier)
      ipv6: should an IPv6 address be reserved? (optional, default: false, tier MUST be PREMIUM)
  tier: the network tier for the network
```

### Cluster

A Kubernetes (GKE) cluster is setup and configured with given node pools and settings.

```yaml
cluster:
  zone: the Google Cloud zone for the cluster
  subnet: the subnet name to place the cluster in
  releaseChannel: the Kubernetes release channel to use
  monitoringComponents: an optional list of additional monitoring components to enable (SYSTEM_COMPONENTS are always enabled)
  enableSecurityPosture: should security posture analysis be enabled for the cluster and its nodes? (optional, default: false)
  nodePools: a map of the node pool name to its configuration
    <NAME>:
      enabled: should this pool be enabled? (optional, default: true)
      minCount: minimum count of machines
      maxCount: maximum count of machines
      initialNodeCount: initial number of machines to provision
      diskSize: the disk size of each node
      machineType: the Google Cloud machine type to choose
      spot: should the node pool choose spot instances? (optional, default: false)
      labels: a map of labels to apply to the nodes
      taints: a list of taints to apply to the nodes
        - key: the taint key
          value: the taint value
          effect: the taint effect
  accessConfiguration:
    projects: a list containing additional Google Cloud projects the cluster/nodes/services are allowed to access
    encryptionKey:
      location: the location of the encryption key (used by ArgoCD ksops)
      keyringId: the keyring identifier
      cryptoKeyId: the crypto key identifier for the specified keyring
```

### Mail

The edge instance also handles the mail relay.

```yaml
mail:
  domain: the base domain for the relay
  zoneId: the Google Cloud zone of the instance
  spfInclude: additional include entry for the SPF record
  relay:
    host: the host of the outgoing mail relay
    port: the port of the outgoing mail relay
    username: the username to authenticate against the outgoing relay
    password: the password to authenticate against the outgoing relay
```

### Google

```yaml
google:
  dnsProject: the project name which hosts the DNS zones
```

### Bucket

```yaml
bucketId: the bucket identifier to store output assets in
```

---

## Continuous Integration and Automations

- [GitHub Actions](https://docs.github.com/en/actions) are linting, and verifying the code.
- [Renovate Bot](https://github.com/renovatebot/renovate) is updating NodeJS packages, and GitHub Actions.
