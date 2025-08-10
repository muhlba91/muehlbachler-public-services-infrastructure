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

  writeToVault(
    'harbor-credentials',
    adminPassword.password.apply((password) =>
      JSON.stringify({ 'admin-password': password }),
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
