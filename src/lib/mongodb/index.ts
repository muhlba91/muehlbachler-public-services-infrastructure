import { Output } from '@pulumi/pulumi';

import { StringMap } from '../../model/map';
import { MongoDBUserData } from '../../model/mongodb';
import { mongodbConfig } from '../configuration';

import { createUser } from './user';

/**
 * Creates the MongoDB users.
 *
 * @returns {StringMap<Output<MongoDBUserData>>} a map containing users and their passwords
 */
export const createMongoDB = (): StringMap<Output<MongoDBUserData>> =>
  Object.fromEntries(
    mongodbConfig.users.map((user) => [user, createUser(user)]),
  );
