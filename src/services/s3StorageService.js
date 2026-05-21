import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

let client;

const getAwsConfig = () => {
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const bucket = process.env.AWS_S3_BUCKET;
  if (!region || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error('S3 is not configured. Set AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_S3_BUCKET.');
  }
  return { region, accessKeyId, secretAccessKey, bucket };
};

const getClient = () => {
  const { region, accessKeyId, secretAccessKey } = getAwsConfig();
  if (!client) {
    client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }
  return client;
};

export const uploadBuffer = async ({ key, buffer, contentType }) => {
  const { bucket } = getAwsConfig();
  await getClient().send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));
  return { key };
};

export const getSignedReadUrl = async (key, expires = 900) => {
  const { bucket } = getAwsConfig();
  const url = await getSignedUrl(
    getClient(),
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: expires }
  );
  return {
    url,
    expiresAt: new Date(Date.now() + expires * 1000),
  };
};

export default {
  uploadBuffer,
  getSignedReadUrl,
};
