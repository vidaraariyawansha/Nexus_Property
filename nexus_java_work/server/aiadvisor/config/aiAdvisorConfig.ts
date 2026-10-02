/**
 * Nexus Property AI Advisor - Central Configuration
 * Configurable parameters for AI models, timeouts, caching, rate limiting, and result thresholds.
 */

export interface AIAdvisorConfig {
  primaryModel: string;
  fallbackModel: string;
  timeoutMs: number;
  maxOutputTokens: number;
  maxPropertiesLimit: number;
  rateLimitPerMinute: number;
  cacheTtlMs: number;
  currency: string;
  defaultTimeZone: string;
}

export const aiConfig: AIAdvisorConfig = {
  primaryModel: process.env.AI_ADVISOR_MODEL || 'gemini-3.8-flash',
  fallbackModel: 'gemini-3.8-flash',
  timeoutMs: Number(process.env.AI_TIMEOUT_MS) || 6500,
  maxOutputTokens: 550,
  maxPropertiesLimit: 5,
  rateLimitPerMinute: 30,
  cacheTtlMs: 5 * 60 * 1000, // 5 minutes for general safe queries
  currency: 'LKR',
  defaultTimeZone: 'Asia/Colombo',
};
