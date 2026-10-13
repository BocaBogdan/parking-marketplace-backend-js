import { registerAs } from '@nestjs/config';

export const S3_CLIENT = Symbol('S3_CLIENT');

export const storageConfig = registerAs('storage', () => ({
  endpoint: required('JURISDICTION_SPECIFIC_URL'),
  accessKeyId: required('ACCESS_KEY_ID'),
  secretAccessKey: required('SECRET_ACCESS_KEY'),
  bucket: required('R2_BUCKET_NAME'),
}));

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}
