/**
 * AI Advisor Controller
 * REST API Endpoints for Nexus Property AI Advisor & Valuation Engine.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { processAdvisorRequest, advisorTelemetry, clearConversationContext } from '../service/aiAdvisorService.js';
import { generatePropertyValuation } from '../../services/aiService.js';
import { queryAll } from '../../db/database.js';
import { AuthenticatedRequest } from '../../middleware/auth.js';

export const aiAdvisorRouter = Router();

/**
 * Primary AI Advisor Query Endpoint
 * POST /api/ai/advisor
 */
aiAdvisorRouter.post('/advisor', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { message, query, conversationId, contextPropertyId, contextPropertyTitle } = req.body;
    const userMessage = (message || query || '').trim();

    if (!userMessage) {
      res.status(400).json({
        success: false,
        message: 'A message is required.',
        errors: ['EMPTY_MESSAGE'],
      });
      return;
    }

    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const currentUser = req.user
      ? { id: req.user.userId, role: req.user.role, fullName: req.user.fullName }
      : undefined;

    const advisorResponse = await processAdvisorRequest(
      {
        message: userMessage,
        conversationId,
        contextPropertyId,
        contextPropertyTitle,
      },
      currentUser,
      clientIp
    );

    res.json({
      success: true,
      message: 'Advisor response generated successfully.',
      data: advisorResponse,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Backward-Compatible Endpoint
 * POST /api/ai/advisory
 */
aiAdvisorRouter.post('/advisory', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { query, message, propertyId, conversationId } = req.body;
    const userMessage = (query || message || '').trim();

    if (!userMessage) {
      res.status(400).json({
        success: false,
        message: 'A query is required.',
        errors: ['EMPTY_QUERY'],
      });
      return;
    }

    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const currentUser = req.user
      ? { id: req.user.userId, role: req.user.role, fullName: req.user.fullName }
      : undefined;

    const advisorResponse = await processAdvisorRequest(
      {
        message: userMessage,
        conversationId,
        contextPropertyId: propertyId,
      },
      currentUser,
      clientIp
    );

    res.json({
      success: true,
      message: 'AI Strategic Advisory generated.',
      data: {
        answer: advisorResponse.answer,
        modelUsed: advisorResponse.modelUsed || 'Nexus Grounded Engine (Sri Lanka)',
        intent: advisorResponse.intent,
        properties: advisorResponse.properties,
        suggestedFollowUps: advisorResponse.suggestedFollowUps,
        action: advisorResponse.action,
        metrics: advisorResponse.metrics,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Property Valuation Analysis with High Thinking
 * GET /api/ai/valuation/:propertyId
 */
aiAdvisorRouter.get('/valuation/:propertyId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const valuation = await generatePropertyValuation(req.params.propertyId);
    res.json({
      success: true,
      message: 'Institutional valuation analysis generated successfully.',
      data: valuation,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Quick Dynamic Suggestions based on active catalog
 * GET /api/ai/suggestions
 */
aiAdvisorRouter.get('/suggestions', async (_req: Request, res: Response) => {
  try {
    const popularLocations = await queryAll<{ location: string }>(
      `SELECT DISTINCT location FROM properties WHERE status = 'ACTIVE' LIMIT 4`
    );

    const suggestions = [
      'Find houses in Colombo under 40M',
      'Show apartments in Colombo 03',
      'What properties are available in Kandy?',
      'Show properties with parking',
      'Show my wishlist',
      'My upcoming viewings',
    ];

    res.json({
      success: true,
      data: { suggestions, locations: popularLocations.map(l => l.location) },
    });
  } catch {
    res.json({
      success: true,
      data: {
        suggestions: [
          'Find houses in Colombo under 30M',
          'Show apartments in Colombo',
          'Show my wishlist',
          'My upcoming viewings',
        ],
      },
    });
  }
});

/**
 * Observability & Performance Metrics
 * GET /api/ai/metrics
 */
aiAdvisorRouter.get('/metrics', (_req: Request, res: Response) => {
  const avgLatency = advisorTelemetry.totalRequests > 0
    ? Math.round(advisorTelemetry.totalLatencyMs / advisorTelemetry.totalRequests)
    : 0;

  res.json({
    success: true,
    data: {
      totalRequests: advisorTelemetry.totalRequests,
      deterministicCount: advisorTelemetry.deterministicCount,
      aiModelCount: advisorTelemetry.aiModelCount,
      cacheHits: advisorTelemetry.cacheHits,
      fallbackCount: advisorTelemetry.fallbackCount,
      averageLatencyMs: avgLatency,
      intentDistribution: advisorTelemetry.intentStats,
    },
  });
});

/**
 * Clear Context Session
 * POST /api/ai/clear-context
 */
aiAdvisorRouter.post('/clear-context', (req: Request, res: Response) => {
  const { conversationId } = req.body;
  if (conversationId) {
    clearConversationContext(conversationId);
  }
  res.json({ success: true, message: 'Conversation context reset.' });
});
