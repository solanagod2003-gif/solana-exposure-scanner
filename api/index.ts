// Vercel Serverless Function - Main API Handler
// This wraps the Express app for Vercel's serverless environment

import '../server/config/env.js';
import express from 'express';
import cors from 'cors';
import { analyzeWallet } from '../server/services/analyzer.js';
import { heliusService, SolanaNetwork } from '../server/services/helius.js';

const app = express();

// Middleware
app.use(cors({
    origin: true, // Allow all origins in production (Vercel handles this)
    credentials: true,
}));
app.use(express.json());

// Request logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Health check - handle both /api/health and /health
app.get(['/api/health', '/health'], (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        heliusConfigured: !!process.env.HELIUS_API_KEY,
        birdeyeConfigured: !!process.env.BIRDEYE_API_KEY,
    });
});

// Network endpoints
app.get(['/api/network', '/network'], (req, res) => {
    res.json({ network: heliusService.getNetwork() });
});

app.post(['/api/network', '/network'], (req, res) => {
    const { network } = req.body as { network: SolanaNetwork };
    if (network !== 'mainnet' && network !== 'devnet') {
        return res.status(400).json({ error: 'Invalid network. Use "mainnet" or "devnet".' });
    }
    heliusService.setNetwork(network);
    res.json({ network, message: `Switched to ${network}` });
});

// Scan endpoint - handle both /api/scan/:address and /scan/:address
app.get(['/api/scan/:address', '/scan/:address'], async (req, res) => {
    try {
        const { address } = req.params;

        if (!address || address.length < 32) {
            return res.status(400).json({ error: 'Invalid wallet address' });
        }

        console.log(`[Scan] Analyzing wallet: ${address}`);
        const result = await analyzeWallet(address);
        res.json(result);
    } catch (error) {
        console.error('[Scan Error]', error);
        res.status(500).json({
            error: 'Analysis failed',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Catch-all for /api routes
app.all('/api/*', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found', path: req.path });
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
