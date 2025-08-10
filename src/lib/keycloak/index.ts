import { globalName } from '../configuration';
import { createRandomPassword } from '../util/random';
import { writeToVault } from '../util/vault/secret';

/**
 * Creates the Keycloak resources.
 */
export const createKeycloakResources = () => {
  const adminPassword = createRandomPassword('keycloak-admin-password', {});

  writeToVault(
    'keycloak-credentials',
    adminPassword.password.apply((password) =>
      JSON.stringify({ 'admin-password': password }),
    ),
    `kubernetes-${globalName}-cluster`,
  );
};
