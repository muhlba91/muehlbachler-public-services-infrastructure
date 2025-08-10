import { all } from '@pulumi/pulumi';

import { globalName, harborBucketId } from '../configuration';
import { createGCSIAMMember } from '../google/storage/iam_member';
import { createGCPServiceAccountAndKey } from '../util/google/service_account_user';
import { createRandomPassword } from '../util/random';
import { writeToVault } from '../util/vault/secret';

/**
 * Creates the Harbor resources.
 */
export const createHarborResources = () => {
  createHarborCredentials();
  createHarborGoogleCredentials();
};

/**
 * Creates the Harbor credentials.
 */
const createHarborCredentials = () => {
  const adminPassword = createRandomPassword('harbor-admin-password', {});
  const communicationSecret = createRandomPassword(
    'harbor-communication-secret',
    {
      special: false,
    },
  );
  const jobserviceSecret = createRandomPassword('harbor-jobservice-secret', {
    special: false,
  });
  const registryHttpSecret = createRandomPassword(
    'harbor-registry-http-secret',
    {
      special: false,
    },
  );
  const csrfKey = createRandomPassword('harbor-csrf-key', {
    length: 32,
    special: false,
  });

  writeToVault(
    'harbor-credentials',
    all([
      adminPassword.password,
      communicationSecret.password,
      jobserviceSecret.password,
      registryHttpSecret.password,
      csrfKey.password,
    ]).apply(([password, commSecret, jobSecret, registrySecret, csrf]) =>
      JSON.stringify({
        'admin-password': password,
        'communication-secret': commSecret,
        'jobservice-secret': jobSecret,
        'registry-http-secret': registrySecret,
        'csrf-key': csrf,
      }),
    ),
    `kubernetes-${globalName}-cluster`,
  );
};

/**
 * Creates the Harbor Google credentials.
 */
const createHarborGoogleCredentials = () => {
  const iam = createGCPServiceAccountAndKey('harbor', {});

  iam.serviceAccount.email.apply((email) => {
    createGCSIAMMember(
      harborBucketId,
      `serviceAccount:${email}`,
      'roles/storage.objectAdmin',
    );
    createGCSIAMMember(
      harborBucketId,
      `serviceAccount:${email}`,
      'roles/storage.legacyBucketOwner',
    );
  });

  writeToVault(
    'harbor-google-cloud',
    iam.key.privateKey.apply((key) =>
      JSON.stringify({ credentials: key, bucket: harborBucketId }),
    ),
    `kubernetes-${globalName}-cluster`,
  );
};
