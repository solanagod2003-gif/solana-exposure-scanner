// Vercel Serverless Function - Main API Handler
// This wraps the Express app for Vercel's serverless environment

import '../server/config/env.js';
import express from 'express';
import cors from 'cors';
import scanRoutes from '../server/routes/scan.js';

const app = express();

// Middleware
app.use(cors({
    origin: true, // Allow all origins in production (Vercel handles this)
    credentials: true,
}));
app.use(express.json());

// Request logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// API Routes
app.use('/api/scan', scanRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        heliusConfigured: !!process.env.HELIUS_API_KEY,
        birdeyeConfigured: !!process.env.BIRDEYE_API_KEY,
    });
});

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[Error]', err);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message,
    });
});

// Export for Vercel
export default app;
