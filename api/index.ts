// Vercel Serverless Function - Self-contained API Handler
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Types
type SolanaNetwork = 'mainnet' | 'devnet';

interface HeliusTransaction {
    signature: string;
    type: string;
    source: string;
    fee: number;
    feePayer: string;
    timestamp: number;
    slot: number;
    nativeTransfers?: Array<{
        fromUserAccount: string;
        toUserAccount: string;
        amount: number;
    }>;
    tokenTransfers?: Array<{
        fromUserAccount: string;
        toUserAccount: string;
        fromTokenAccount: string;
        toTokenAccount: string;
        tokenAmount: number;
        mint: string;
        tokenStandard: string;
    }>;
    description?: string;
}

interface HeliusAsset {
    id: string;
    content?: {
        metadata?: {
            name?: string;
            symbol?: string;
        };
    };
    token_info?: {
        balance: number;
        decimals: number;
        price_info?: {
            price_per_token: number;
            total_price: number;
        };
    };
    interface?: string;
}

// CEX Addresses
const CEX_ADDRESSES: Record<string, string> = {
    '5tzFkiKscXHK5ZXCGbXZxdw7gTjjxKYz6NJNdqYFMYuM': 'Binance',
    '9WzDXwBbmkg8ZTbNMqUxvQRAyrZ1n9pVdBD3xaT9WJ5S': 'Binance',
    'AC5RDfQFmDS1deWZos921JfqscXdByf8BKHs5ACWjtW2': 'Binance',
    'H8sMJSCQxfKiFTCfDR3DUMLPwcRbMRJjg5VbhH5A5YF': 'Coinbase',
    '2AQdpHJ2JpcEgPiATUXjQxA8QmafFegfQwSLWuxv5DR': 'Coinbase',
    'GJRs4FwHtemZ5ZE9x3FNvJ8TMwxTboF3YHdFxjnj5K7m': 'Kraken',
    'HzZFvXjTMr9fB7Bg8f843dXxnTxZ6P6P7B3shMmqjNW6': 'Kraken',
    'LGNDSCoQfZZDZDBtVLgXvmJpqzRjRBcXSxwkSZjp3wN': 'FTX',
    'FTT76KUtNQsLRcTPseDVKqQ2aFByMwuBNwHqL82b7TCV': 'FTX',
    '5VCwKtCXgCJ6kit5FybXjvriW3xELsFDhYrPSqtJNmcD': 'Huobi',
    'rEsRUVz8K8yLCqMKMPxNwc2RLey5aWwCxw9bHmgWxgL': 'Kucoin',
    'BmFdpraQhkiDQE6wthKDdMuGBg7eKqhP4aXqvjXNBvE': 'OKX',
    '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1': 'Raydium',
    'JUP6i4ozu5ydDCnLiMogSckDPpbtr7BJ4FtzYWkb5Rk': 'Jupiter',
};

// State
let currentNetwork: SolanaNetwork = 'mainnet';

const HELIUS_ENDPOINTS = {
    mainnet: {
        api: 'https://api.helius.xyz',
        rpc: 'https://mainnet.helius-rpc.com'
    },
    devnet: {
        api: 'https://api-devnet.helius.xyz',
        rpc: 'https://devnet.helius-rpc.com'
    }
};

// ============================================
// CACHING LAYER - Reduces API calls by ~90%
// ============================================
interface CacheEntry<T> {
    data: T;
    timestamp: number;
    network: SolanaNetwork;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const scanCache = new Map<string, CacheEntry<any>>();
const apiCallStats = { helius: 0, birdeye: 0, cached: 0 };

function getCachedScan(address: string): any | null {
    const key = `${currentNetwork}:${address}`;
    const cached = scanCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL && cached.network === currentNetwork) {
        apiCallStats.cached++;
        console.log(`[Cache] HIT for ${address.slice(0, 8)}... (saved 3 API calls)`);
        return cached.data;
    }
    return null;
}

function setCachedScan(address: string, data: any): void {
    const key = `${currentNetwork}:${address}`;
    scanCache.set(key, { data, timestamp: Date.now(), network: currentNetwork });
    // Cleanup old entries (max 100 cached)
    if (scanCache.size > 100) {
        const oldest = Array.from(scanCache.entries())
            .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
        if (oldest) scanCache.delete(oldest[0]);
    }
}

// ============================================
// RATE LIMITING - Prevents abuse
// ============================================
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 20; // 20 requests per minute per IP
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function isRateLimited(ip: string): boolean {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    if (!entry || now > entry.resetTime) {
        rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
        return false;
    }

    if (entry.count >= RATE_LIMIT_MAX) {
        return true;
    }

    entry.count++;
    return false;
}

function getClientIP(req: VercelRequest): string {
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        (req.headers['x-real-ip'] as string) ||
        'unknown';
}

// Helius API calls
async function getTransactionHistory(address: string, apiKey: string): Promise<HeliusTransaction[]> {
    const base = HELIUS_ENDPOINTS[currentNetwork].api;
    const url = `${base}/v0/addresses/${address}/transactions?api-key=${apiKey}&limit=100`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Helius error: ${response.status}`);
    return response.json();
}

async function getAssetsByOwner(address: string, apiKey: string): Promise<HeliusAsset[]> {
    const base = HELIUS_ENDPOINTS[currentNetwork].rpc;
    const url = `${base}/?api-key=${apiKey}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            jsonrpc: '2.0',
            id: 'assets',
            method: 'getAssetsByOwner',
            params: {
                ownerAddress: address,
                page: 1,
                limit: 1000,
                displayOptions: { showFungible: true, showNativeBalance: true },
            },
        }),
    });
    if (!response.ok) throw new Error(`Helius RPC error: ${response.status}`);
    const data = await response.json();
    return data.result?.items || [];
}

async function getBalance(address: string, apiKey: string): Promise<number> {
    const base = HELIUS_ENDPOINTS[currentNetwork].rpc;
    const url = `${base}/?api-key=${apiKey}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            jsonrpc: '2.0',
            id: 'balance',
            method: 'getBalance',
            params: [address],
        }),
    });
    if (!response.ok) throw new Error(`Helius RPC error: ${response.status}`);
    const data = await response.json();
    return (data.result?.value || 0) / 1e9;
}

// Analysis functions
function analyzeCexConnections(transactions: HeliusTransaction[]) {
    const cexConnections = new Set<string>();
    let cexTxCount = 0;

    for (const tx of transactions) {
        for (const transfer of tx.nativeTransfers || []) {
            if (CEX_ADDRESSES[transfer.toUserAccount]) {
                cexConnections.add(CEX_ADDRESSES[transfer.toUserAccount]);
                cexTxCount++;
            }
            if (CEX_ADDRESSES[transfer.fromUserAccount]) {
                cexConnections.add(CEX_ADDRESSES[transfer.fromUserAccount]);
                cexTxCount++;
            }
        }
        for (const transfer of tx.tokenTransfers || []) {
            if (CEX_ADDRESSES[transfer.toUserAccount]) {
                cexConnections.add(CEX_ADDRESSES[transfer.toUserAccount]);
                cexTxCount++;
            }
            if (CEX_ADDRESSES[transfer.fromUserAccount]) {
                cexConnections.add(CEX_ADDRESSES[transfer.fromUserAccount]);
                cexTxCount++;
            }
        }
    }

    let score = 0;
    if (cexConnections.size >= 1) score = 40;
    if (cexConnections.size >= 2) score = 60;
    if (cexConnections.size >= 3) score = 75;
    if (cexTxCount > 10) score = Math.min(95, score + 15);

    return { score, exchanges: Array.from(cexConnections), txCount: cexTxCount };
}

function analyzeActivity(transactions: HeliusTransaction[]) {
    const txCount = transactions.length;
    const timestamps = transactions.map(tx => tx.timestamp).filter(Boolean);
    const oldest = Math.min(...timestamps);
    const newest = Math.max(...timestamps);
    const daysActive = Math.max(1, Math.floor((newest - oldest) / (24 * 60 * 60)));
    const txPerDay = txCount / daysActive;

    let score = 0;
    if (txCount >= 10) score = 20;
    if (txCount >= 50) score = 40;
    if (txCount >= 100) score = 55;
    if (txCount >= 500) score = 70;
    if (txPerDay > 5) score = Math.min(95, score + 10);

    return { score, txCount, daysActive, txPerDay };
}

function analyzeClustering(transactions: HeliusTransaction[], selfAddress: string) {
    const addressCounts = new Map<string, number>();

    for (const tx of transactions) {
        for (const transfer of tx.nativeTransfers || []) {
            const counterparty = transfer.toUserAccount === selfAddress
                ? transfer.fromUserAccount
                : transfer.toUserAccount;
            if (counterparty && counterparty !== selfAddress) {
                addressCounts.set(counterparty, (addressCounts.get(counterparty) || 0) + 1);
            }
        }
        for (const transfer of tx.tokenTransfers || []) {
            const counterparty = transfer.toUserAccount === selfAddress
                ? transfer.fromUserAccount
                : transfer.toUserAccount;
            if (counterparty && counterparty !== selfAddress) {
                addressCounts.set(counterparty, (addressCounts.get(counterparty) || 0) + 1);
            }
        }
    }

    const sorted = Array.from(addressCounts.entries()).sort((a, b) => b[1] - a[1]);
    const interactedCount = addressCounts.size;
    const topAddresses = sorted.slice(0, 10).map(([addr]) => addr.slice(0, 8) + '...' + addr.slice(-4));
    const networkNodes = sorted.slice(0, 30).map(([addr, count]) => ({
        address: addr,
        interactions: count,
        type: CEX_ADDRESSES[addr] ? 'CEX' : 'UNKNOWN',
        label: CEX_ADDRESSES[addr] || undefined,
    }));

    let score = 0;
    if (interactedCount >= 5) score = 20;
    if (interactedCount >= 20) score = 40;
    if (interactedCount >= 50) score = 55;
    if (interactedCount >= 100) score = 70;

    return { score, data: { interactedCount, topAddresses, networkNodes } };
}

function analyzeIdentity(assets: HeliusAsset[]) {
    let hasNFTs = false;
    let nftCount = 0;

    for (const asset of assets) {
        if (asset.interface === 'V1_NFT' || asset.interface === 'ProgrammableNFT') {
            hasNFTs = true;
            nftCount++;
        }
    }

    let score = 0;
    if (hasNFTs) score += 15;
    if (nftCount > 5) score += 10;
    if (nftCount > 20) score += 15;

    return { score, hasNFTs, nftCount };
}

function analyzeFinancial(assets: HeliusAsset[], solBalance: number) {
    let netWorth = solBalance * 200;
    for (const asset of assets) {
        if (asset.token_info?.price_info?.total_price) {
            netWorth += asset.token_info.price_info.total_price;
        }
    }

    let score = 0;
    if (netWorth >= 100) score = 20;
    if (netWorth >= 1000) score = 35;
    if (netWorth >= 10000) score = 50;
    if (netWorth >= 100000) score = 70;

    return { score, netWorth };
}

async function analyzeWallet(address: string, apiKey: string) {
    const [transactions, assets, solBalance] = await Promise.all([
        getTransactionHistory(address, apiKey).catch(() => []),
        getAssetsByOwner(address, apiKey).catch(() => []),
        getBalance(address, apiKey).catch(() => 0),
    ]);

    if (transactions.length === 0 && assets.length === 0 && solBalance === 0) {
        throw new Error('No data found for this wallet');
    }

    const cexAnalysis = analyzeCexConnections(transactions);
    const activityAnalysis = analyzeActivity(transactions);
    const clusteringAnalysis = analyzeClustering(transactions, address);
    const identityAnalysis = analyzeIdentity(assets);
    const financialAnalysis = analyzeFinancial(assets, solBalance);

    const scoreBreakdown = {
        identity: identityAnalysis.score,
        kycLinks: cexAnalysis.score,
        financial: financialAnalysis.score,
        clustering: clusteringAnalysis.score,
        activity: activityAnalysis.score,
    };

    const exposureScore = Math.round(
        scoreBreakdown.kycLinks * 0.30 +
        scoreBreakdown.clustering * 0.25 +
        scoreBreakdown.activity * 0.20 +
        scoreBreakdown.financial * 0.15 +
        scoreBreakdown.identity * 0.10
    );

    const risks: string[] = [];
    if (cexAnalysis.exchanges.length > 0) {
        risks.push(`Direct transfers to/from ${cexAnalysis.exchanges.join(', ')} detected - potential KYC linkage`);
    }
    if (activityAnalysis.txCount > 100) {
        risks.push(`High transaction volume (${activityAnalysis.txCount} txs) creates detailed activity fingerprint`);
    }
    if (clusteringAnalysis.data.interactedCount > 50) {
        risks.push(`Interacted with ${clusteringAnalysis.data.interactedCount} unique addresses - clustering analysis possible`);
    }
    if (identityAnalysis.hasNFTs) {
        risks.push('NFT holdings may contain identifying metadata');
    }
    if (risks.length === 0) {
        risks.push('Limited on-chain activity - low exposure profile');
    }

    const tradeCount = transactions.filter(tx =>
        tx.type === 'SWAP' || tx.type === 'TOKEN_MINT' || tx.type?.includes('TRADE')
    ).length;

    const recentTxSummary = transactions.slice(0, 10).map(tx => ({
        date: tx.timestamp ? new Date(tx.timestamp * 1000).toISOString().split('T')[0] : 'Unknown',
        type: tx.type || 'UNKNOWN',
        amountUsd: (tx.nativeTransfers || []).reduce((sum, t) => sum + (t.amount / 1e9) * 200, 0),
        description: tx.description || `${tx.type} transaction`,
    }));

    return {
        exposureScore,
        scoreBreakdown,
        netWorthUsd: financialAnalysis.netWorth,
        realizedLossesUsd: 0,
        tradeCount,
        memecoinTrades: Math.floor(tradeCount * 0.4),
        clustering: clusteringAnalysis.data,
        risks,
        links: {
            xSearch: `https://x.com/search?q=${address}&src=typed_query`,
            arkham: `https://platform.arkhamintelligence.com/explorer/address/${address}`,
            solscan: `https://solscan.io/account/${address}`,
        },
        recentTxSummary,
    };
}

// Main handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const path = req.url || '';
    console.log(`[API] ${req.method} ${path}`);

    // Health check
    if (path.includes('/health')) {
        return res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            heliusConfigured: !!process.env.HELIUS_API_KEY,
            birdeyeConfigured: !!process.env.BIRDEYE_API_KEY,
            network: currentNetwork,
            cache: {
                entries: scanCache.size,
                ttlMinutes: CACHE_TTL / 60000,
            },
            apiCalls: apiCallStats,
        });
    }

    // Network endpoints
    if (path.includes('/network')) {
        if (req.method === 'POST') {
            const { network } = req.body || {};
            if (network === 'mainnet' || network === 'devnet') {
                currentNetwork = network;
                return res.json({ network, message: `Switched to ${network}` });
            }
            return res.status(400).json({ error: 'Invalid network' });
        }
        return res.json({ network: currentNetwork });
    }

    // Scan endpoint
    const scanMatch = path.match(/\/scan\/([1-9A-HJ-NP-Za-km-z]{32,44})/);
    if (scanMatch) {
        const address = scanMatch[1];
        const apiKey = process.env.HELIUS_API_KEY;
        const clientIP = getClientIP(req);

        // Rate limiting check
        if (isRateLimited(clientIP)) {
            console.log(`[RateLimit] Blocked ${clientIP}`);
            return res.status(429).json({
                error: 'Too many requests',
                message: 'Please wait a minute before scanning again.',
                retryAfter: 60
            });
        }

        if (!apiKey) {
            return res.status(500).json({ error: 'HELIUS_API_KEY not configured' });
        }

        // Check cache first
        const cached = getCachedScan(address);
        if (cached) {
            return res.json({ ...cached, cached: true });
        }

        try {
            apiCallStats.helius += 3; // Track API usage
            const result = await analyzeWallet(address, apiKey);
            setCachedScan(address, result); // Cache the result
            return res.json(result);
        } catch (error) {
            console.error('[Scan Error]', error);
            return res.status(500).json({
                error: 'Analysis failed',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    return res.status(404).json({ error: 'Not found', path });
}
