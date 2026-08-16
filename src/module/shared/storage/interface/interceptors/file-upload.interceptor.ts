// src/storage/interface/interceptors/file-upload.interceptor.ts
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

const storageEngine = multer.memoryStorage();

const multerOptions: MulterOptions = {
  storage: storageEngine,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB
    files: 1,
  },
};

/**
 * Interceptor standar untuk semua upload file tunggal di module ini.
 */
export const FileUploadInterceptor = FileInterceptor('file', multerOptions);

/**
 * Interceptor untuk upload multiple file (file dan originalityFile).
 */
const multipleMulterOptions: MulterOptions = {
  storage: storageEngine,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB
    files: 2,
  },
};

import { FileFieldsInterceptor } from '@nestjs/platform-express';

export const MultipleFileUploadInterceptor = FileFieldsInterceptor(
  [
    { name: 'file', maxCount: 1 },
    { name: 'originalityFile', maxCount: 1 },
  ],
  multipleMulterOptions,
);

/**
 * Interceptor untuk upload bukti pembayaran dan kartu pelajar.
 */
const registrationMulterOptions: MulterOptions = {
  storage: storageEngine,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB
    files: 6, // 1 file payment + maks 5 identityCardFile
  },
};

export const RegistrationFileUploadInterceptor = FileFieldsInterceptor(
  [
    { name: 'file', maxCount: 1 },
    { name: 'identityCardFile', maxCount: 5 }, // Maksimal 5 file untuk anggota tim
  ],
  registrationMulterOptions,
);
