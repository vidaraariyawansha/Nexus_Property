import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { getDb } from './server/db/database.js';
import { seedDatabase } from './server/db/seed.js';
import { authenticateToken } from './server/middleware/auth.js';
import { errorHandler } from './server/middleware/errorHandler.js';

import { authRouter } from './server/controllers/authController.js';
import { propertyRouter } from './server/controllers/propertyController.js';
import { appointmentRouter } from './server/controllers/appointmentController.js';
import { feedbackRouter } from './server/controllers/feedbackController.js';
import { wishlistRouter } from './server/controllers/wishlistController.js';
import { notificationRouter } from './server/controllers/notificationController.js';
import { aiRouter } from './server/controllers/aiController.js';
import { adminRouter } from './server/controllers/adminController.js';
import { profileRouter } from './server/controllers/profileController.js';
import { comparisonRouter } from './server/controllers/comparisonController.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  // Parse JSON payloads with safe limit for batch media uploads
  app.use(express.json({ limit: '35mb' }));
  app.use(express.urlencoded({ extended: true, limit: '35mb' }));
  app.use(cookieParser());

  // Static avatar uploads folder
  app.use('/uploads', express.static(path.resolve(__dirname, 'public', 'uploads')));

  // Attach token authentication middleware globally to populate req.user
  app.use(authenticateToken);

  // Initialize SQLite database and seed initial data
  await getDb();
  await seedDatabase();

  // API Routes
  app.use('/api/auth', authRouter);
  app.use('/api/profile', profileRouter);
  app.use('/api/comparisons', comparisonRouter);
  app.use('/api/customer/comparisons', comparisonRouter);
  app.use('/api/properties', propertyRouter);
  app.use('/api/appointments', appointmentRouter);
  app.use('/api/feedback', feedbackRouter);
  app.use('/api/wishlist', wishlistRouter);
  app.use('/api/notifications', notificationRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/admin', adminRouter);

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'UP',
      system: 'Nexus Property Web-based Property Sales System',
      timestamp: new Date().toISOString(),
    });
  });

  // Centralized Error Handling
  app.use(errorHandler);

  // Frontend integration: Vite middleware in development, static files in production
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Nexus Property server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Fatal server startup failure:', err);
  process.exit(1);
});
