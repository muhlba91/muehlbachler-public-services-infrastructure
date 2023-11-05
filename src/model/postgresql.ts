import * as pg from '@pulumi/postgresql';
import { Output } from '@pulumi/pulumi';

/**
 * Defines a PostgreSQL user.
 */
export type PostgresqlUserData = {
  readonly user: pg.Role;
  readonly password: Output<string>;
};
