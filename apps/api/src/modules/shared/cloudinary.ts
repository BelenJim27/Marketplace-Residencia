import { InternalServerErrorException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

const ENV_PATHS = [
  resolve(process.cwd(), 'apps/api/.env'),
  resolve(__dirname, '../../../.env'),
  resolve(process.cwd(), '.env'),
];

function loadCloudinaryEnv() {
  ENV_PATHS.forEach((envPath, index) => {
    dotenv.config({ path: envPath, override: index === 0 });
  });

  if (
    process.env.CLOUDINARY_URL ||
    (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
  ) {
    return;
  }
}

export function configureCloudinary() {
  loadCloudinaryEnv();

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (cloudName && apiKey && apiSecret) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });

    return;
  }

  const cloudinaryUrl = process.env.CLOUDINARY_URL;

  if (cloudinaryUrl) {
    const parsedUrl = new URL(cloudinaryUrl);

    cloudinary.config({
      cloud_name: parsedUrl.hostname,
      api_key: decodeURIComponent(parsedUrl.username),
      api_secret: decodeURIComponent(parsedUrl.password),
    });

    return;
  }
  if (!cloudName || !apiKey || !apiSecret) {
    throw new InternalServerErrorException('Configuracion de Cloudinary incompleta');
  }
}

export async function uploadToCloudinary(buffer: Buffer, folder: string): Promise<string> {
  configureCloudinary();

  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder, resource_type: 'auto' }, (error, result) => {
        if (error || !result) {
          reject(error ?? new Error('No se pudo subir el archivo a Cloudinary'));
          return;
        }

        resolve(result.secure_url);
      })
      .end(buffer);
  });
}
