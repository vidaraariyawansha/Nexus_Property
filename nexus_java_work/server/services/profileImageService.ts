import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { AppError } from '../middleware/errorHandler.js';

const UPLOAD_DIR = path.resolve(process.cwd(), 'public', 'uploads', 'avatars');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// Ensure upload directory exists safely
export function ensureUploadDir(): void {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

export type SupportedImageFormat = 'jpeg' | 'png' | 'webp';

export interface ValidatedImage {
  buffer: Buffer;
  format: SupportedImageFormat;
  mimeType: string;
  extension: string;
}

/**
 * Validates actual image buffer content using magic bytes and header inspection.
 * Blocks MIME spoofing, path traversal, executable headers, empty or oversized files.
 */
export function validateImageBuffer(buffer: Buffer, declaredMime?: string): ValidatedImage {
  if (!buffer || buffer.length === 0) {
    throw new AppError('Empty file provided. Please choose a valid image.', 400);
  }

  if (buffer.length > MAX_FILE_SIZE) {
    throw new AppError('Image exceeds the maximum allowed size of 5MB.', 400);
  }

  // Reject executable or script signatures immediately
  // MZ (Windows PE), ELF (Linux), script / html / php
  if (buffer.length >= 2 && buffer[0] === 0x4d && buffer[1] === 0x5a) {
    throw new AppError('Security violation: Executable file rejected.', 400);
  }
  if (buffer.length >= 4 && buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46) {
    throw new AppError('Security violation: Executable binary rejected.', 400);
  }

  const textHeader = buffer.slice(0, 100).toString('utf-8').toLowerCase();
  if (textHeader.includes('<?php') || textHeader.includes('<script') || textHeader.includes('<html') || textHeader.includes('eval(')) {
    throw new AppError('Security violation: Script content in image file rejected.', 400);
  }

  // 1. JPEG verification: FF D8 FF
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return {
      buffer,
      format: 'jpeg',
      mimeType: 'image/jpeg',
      extension: 'jpg',
    };
  }

  // 2. PNG verification: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return {
      buffer,
      format: 'png',
      mimeType: 'image/png',
      extension: 'png',
    };
  }

  // 3. WebP verification: 52 49 46 46 (RIFF) at [0..3] and 57 45 42 50 (WEBP) at [8..11]
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return {
      buffer,
      format: 'webp',
      mimeType: 'image/webp',
      extension: 'webp',
    };
  }

  throw new AppError('Unsupported or corrupted image format. Only JPEG, PNG, and WebP images are allowed.', 400);
}

/**
 * Saves a validated image buffer securely to disk with a randomly generated server filename.
 * Prevents directory traversal and raw client filename vulnerabilities.
 */
export async function saveProfileImage(userId: string, validated: ValidatedImage): Promise<string> {
  ensureUploadDir();

  // Sanitize userId to prevent path traversal in filename
  const cleanUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '');
  const randomSuffix = crypto.randomUUID().replace(/-/g, '');
  const filename = `avatar_${cleanUserId}_${randomSuffix}.${validated.extension}`;
  const targetPath = path.join(UPLOAD_DIR, filename);

  // Security assertion: target path must be inside UPLOAD_DIR
  if (!targetPath.startsWith(UPLOAD_DIR)) {
    throw new AppError('Path traversal attempt detected.', 400);
  }

  fs.writeFileSync(targetPath, validated.buffer);

  // Return public relative URL
  return `/uploads/avatars/${filename}`;
}

/**
 * Safely removes an avatar file from disk if it exists and belongs in the avatar uploads directory.
 */
export function safelyDeleteAvatarFile(avatarUrl?: string | null): void {
  if (!avatarUrl || typeof avatarUrl !== 'string') return;

  const filename = path.basename(avatarUrl);
  // Ensure only filename is extracted, avoiding path traversal
  if (!filename || filename.includes('..') || !filename.startsWith('avatar_')) {
    return;
  }

  const filePath = path.join(UPLOAD_DIR, filename);
  if (filePath.startsWith(UPLOAD_DIR) && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.error('Failed to remove old avatar file:', err);
    }
  }
}
