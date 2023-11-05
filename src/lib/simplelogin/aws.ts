import * as aws from '@pulumi/aws';
import { Output } from '@pulumi/pulumi';

import { createAccessKey } from '../aws/iam/key';
import { createAWSUser } from '../aws/iam/user';
import { createS3Bucket } from '../aws/storage/bucket';
import { awsDefaultRegion, commonLabels, globalName } from '../configuration';
import { writeToDoppler } from '../util/doppler';

/**
 * Creates the SimpleLogin AWS resources.
 */
export const createAWSResources = (): void => {
  const bucket = createBucket();
  bucket.arn.apply((arn) => createUser(arn));

  writeToDoppler(
    'PUBLIC_SERVICES_MAIL_RELAY_AWS_REGION',
    Output.create(aws.config.region ?? awsDefaultRegion),
    `${globalName}-cluster-mail-relay`,
  );
};

/**
 * Creates the SimpleLogin AWS bucket.
 *
 * @returns {aws.s3.Bucket} the bucket
 */
const createBucket = (): aws.s3.Bucket => {
  const bucket = createS3Bucket('simplelogin');

  writeToDoppler(
    'PUBLIC_SERVICES_MAIL_RELAY_AWS_BUCKET',
    bucket.bucket,
    `${globalName}-cluster-mail-relay`,
  );

  return bucket;
};

/**
 * Creates the SimpleLogin AWS user.
 *
 * @param {string} bucketArn the ARN of the bucket to allow access to
 */
const createUser = (bucketArn: string) => {
  const user = createAWSUser('simplelogin', {
    policies: [
      new aws.iam.Policy(
        'aws-policy-simplelogin',
        {
          policy: aws.iam
            .getPolicyDocument({
              statements: [
                {
                  effect: 'Allow',
                  actions: ['s3:*'],
                  resources: [bucketArn + '/*'],
                },
              ],
            })
            .then((doc) => doc.json),
          tags: commonLabels,
        },
        {},
      ),
    ],
  });
  const key = user.name.apply((name) => createAccessKey(name, user));

  writeToDoppler(
    'PUBLIC_SERVICES_MAIL_RELAY_AWS_ACCESS_KEY_ID',
    key.id,
    `${globalName}-cluster-mail-relay`,
  );
  writeToDoppler(
    'PUBLIC_SERVICES_MAIL_RELAY_AWS_SECRET_ACCESS_KEY',
    key.secret,
    `${globalName}-cluster-mail-relay`,
  );
};
