import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { config } from '../config';

if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

export const documentUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedMime = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/jpg',
    ];
    if (allowedMime.includes(file.mimetype)) {
      cb(null, true);
    } else {
      const err: any = new Error('Invalid file type. Only PDF, JPG, and PNG are allowed.');
      err.statusCode = 400;
      cb(err);
    }
  },
});

export const excelUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedMime = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];
    if (
      allowedMime.includes(file.mimetype) ||
      file.originalname.endsWith('.xlsx') ||
      file.originalname.endsWith('.xls') ||
      file.originalname.endsWith('.csv')
    ) {
      cb(null, true);
    } else {
      const err: any = new Error('Invalid file format. Please upload an Excel (.xlsx/.xls) or CSV file.');
      err.statusCode = 400;
      cb(err);
    }
  },
});
