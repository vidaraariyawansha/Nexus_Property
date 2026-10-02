/**
 * Request Validation & Input Sanitization for AI Advisor
 * Guards against prompt injection, control characters, and out-of-boundary requests.
 */

import { AppError } from '../../middleware/errorHandler.js';

export interface ValidationResult {
  isValid: boolean;
  sanitizedMessage: string;
  isAdversarial: boolean;
  errorMessage?: string;
}

const ADVERSARIAL_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
  /disregard\s+(all\s+)?(previous|prior)\s+prompts/i,
  /reveal\s+(the\s+)?(system\s+prompt|instructions|developer\s+mode)/i,
  /expose\s+(all\s+)?(passwords|hashes|tokens|customer\s+records)/i,
  /dump\s+(all\s+)?(users|database|tables)/i,
  /you\s+are\s+now\s+in\s+developer\s+mode/i,
  /override\s+(all\s+)?security\s+rules/i,
  /select\s+password_hash\s+from/i,
  /drop\s+table/i,
];

export function validateAndSanitizeAdvisorRequest(rawMessage: unknown): ValidationResult {
  if (rawMessage === undefined || rawMessage === null) {
    throw new AppError('Message is required.', 400);
  }

  if (typeof rawMessage !== 'string') {
    throw new AppError('Message must be a string.', 400);
  }

  // Remove dangerous non-printable control characters, keeping standard newlines and spaces
  const cleaned = rawMessage
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();

  if (cleaned.length < 2) {
    throw new AppError('Please provide a message with at least 2 characters.', 400);
  }

  if (cleaned.length > 1000) {
    throw new AppError('Message cannot exceed 1,000 characters.', 400);
  }

  // Check for adversarial prompt injection attempts
  const isAdversarial = ADVERSARIAL_PATTERNS.some(pat => pat.test(cleaned));

  return {
    isValid: true,
    sanitizedMessage: cleaned,
    isAdversarial,
  };
}
