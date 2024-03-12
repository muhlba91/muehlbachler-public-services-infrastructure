import * as mongodbatlas from '@pulumi/mongodbatlas';
import { Output } from '@pulumi/pulumi';

/**
 * Defines a MongoDB user.
 */
export type MongoDBUserData = {
  readonly user: mongodbatlas.DatabaseUser;
  readonly password: Output<string>;
};
