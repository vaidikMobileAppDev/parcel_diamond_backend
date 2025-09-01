import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import moment from 'moment';
import randToken from 'rand-token';
const { uid } = randToken;
import path from 'path';
import config from '../config/config.js';
import fs from 'fs';

// Set the region and access keys
const s3Client = new S3Client({
  region: config.bucket.region,
  credentials: {
    accessKeyId: config.bucket.accessKey,
    secretAccessKey: config.bucket.secretAccessKey,
  },
});

// Upload file to S3
const uploadFile = async (file, folder) => {
  let mimeType = file.mimetype;
  if (mimeType == 'image/jpeg') {
    mimeType = 'image/jpg';
    file.originalname.replace('jpeg', 'jpg');
  }

  let fileNewName = `${
    moment().format('YYYYMMDDHHmmss') +
    uid(16) +
    path.extname(file.originalname)
  }`;
  const params = {
    Bucket: config.bucket.name,
    Key: `${folder}/${fileNewName}`,
    ContentType: mimeType,
    Body: file.buffer,
  };

  if (!fs.existsSync(`public`)) {
    fs.mkdirSync(`public`);
  }
  if (!fs.existsSync(`public/${folder}`)) {
    fs.mkdirSync(`public/${folder}`);
  }
  fs.writeFileSync(`public/${folder}/${fileNewName}`, file.buffer);
  try {
    // await s3Client.send(new PutObjectCommand(params));
    return `${fileNewName}`;
  } catch (error) {
    throw error;
  }
};

// Delete file from S3
const deleteFile = async (file, folder) => {
  const params = {
    Bucket: AWS_BUCKET_NAME,
    Key: `${folder}/${file}`,
  };

  try {
    await s3Client.send(new DeleteObjectCommand(params));
  } catch (error) {
    throw error;
  }
};

export { uploadFile, deleteFile };
