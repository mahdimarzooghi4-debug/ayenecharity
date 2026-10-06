import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const endpoint = process.env.S3_INTERNAL_ENDPOINT;
const region = process.env.S3_REGION ?? "us-east-1";
const bucket = process.env.S3_BUCKET;
const accessKeyId = process.env.S3_ACCESS_KEY_ID;
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

for (const [name, value] of Object.entries({
  S3_INTERNAL_ENDPOINT: endpoint,
  S3_BUCKET: bucket,
  S3_ACCESS_KEY_ID: accessKeyId,
  S3_SECRET_ACCESS_KEY: secretAccessKey,
})) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

const client = new S3Client({
  endpoint,
  region,
  forcePathStyle: true,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForObjectStorage() {
  let lastError;

  for (let attempt = 1; attempt <= 60; attempt += 1) {
    try {
      await client.send(new HeadBucketCommand({ Bucket: bucket }));
      return "exists";
    } catch (error) {
      lastError = error;
      const status = error?.$metadata?.httpStatusCode;

      if (status === 404 || error?.name === "NotFound" || error?.name === "NoSuchBucket") {
        return "missing";
      }

      if (attempt < 60) {
        await sleep(2000);
      }
    }
  }

  throw lastError ?? new Error("Object storage did not become ready");
}

const state = await waitForObjectStorage();

if (state === "missing") {
  await client.send(new CreateBucketCommand({ Bucket: bucket }));
  console.log(`Created bucket ${bucket}`);
} else {
  console.log(`Bucket ${bucket} already exists`);
}

const publicReadPolicy = {
  Version: "2012-10-17",
  Statement: [
    {
      Sid: "PublicReadPublishedMedia",
      Effect: "Allow",
      Principal: "*",
      Action: ["s3:GetObject"],
      Resource: [
        `arn:aws:s3:::${bucket}/project-image/*`,
        `arn:aws:s3:::${bucket}/hero-image/*`,
      ],
    },
  ],
};

await client.send(
  new PutBucketPolicyCommand({
    Bucket: bucket,
    Policy: JSON.stringify(publicReadPolicy),
  }),
);

console.log("Applied public-read policy for published media prefixes");
