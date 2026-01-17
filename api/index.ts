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
    accountData?: Array<{
        account: string;
        nativeBalanceChange: number;
        tokenBalanceChanges?: Array<{
            mint: string;
            rawTokenAmount: {
                tokenAmount: string;
                decimals: number;
            };
        }>;
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

// CEX Addresses - Expanded list
const CEX_ADDRESSES: Record<string, string> = {
    // Binance
    '5tzFkiKscXHK5ZXCGbXZxdw7gTjjxKYz6NJNdqYFMYuM': 'Binance',
    '9WzDXwBbmkg8ZTbNMqUxvQRAyrZ1n9pVdBD3xaT9WJ5S': 'Binance',
    'AC5RDfQFmDS1deWZos921JfqscXdByf8BKHs5ACWjtW2': 'Binance',
    '2ojv9BAiHUrvsm9gxDe7fJSzbNZSJcxZvf8dqmWGHG8S': 'Binance',
    // Coinbase
    'H8sMJSCQxfKiFTCfDR3DUMLPwcRbMRJjg5VbhH5A5YF': 'Coinbase',
    '2AQdpHJ2JpcEgPiATUXjQxA8QmafFegfQwSLWuxv5DR': 'Coinbase',
    'GJRs4FwHtemZ5ZE9x3FNvJ8TMwxTboF3YHdFxjnj5K7m': 'Coinbase',
    // Kraken
    'HzZFvXjTMr9fB7Bg8f843dXxnTxZ6P6P7B3shMmqjNW6': 'Kraken',
    'CQjCGbM9WPPbD7k9K9w7wqz5gpMhKaGQNJEHU5fQD1gg': 'Kraken',
    // FTX (legacy)
    'LGNDSCoQfZZDZDBtVLgXvmJpqzRjRBcXSxwkSZjp3wN': 'FTX',
    'FTT76KUtNQsLRcTPseDVKqQ2aFByMwuBNwHqL82b7TCV': 'FTX',
    // OKX
    'BmFdpraQhkiDQE6wthKDdMuGBg7eKqhP4aXqvjXNBvE': 'OKX',
    '5VCwKtCXgCJ6kit5FybXjvriW3xELsFDhYrPSqtJNmcD': 'OKX',
    // Bybit
    'AC5RDfQFmDS1deWZos921JfqscXdByf8BKHs5ACWjtW3': 'Bybit',
    // Kucoin  
    'rEsRUVz8K8yLCqMKMPxNwc2RLey5aWwCxw9bHmgWxgL': 'Kucoin',
    // Huobi
    '88xTWZMeKfiTgbfEmPLdsUCQcZinwUfk25EBQZ21XMAZ': 'Huobi',
    // Gate.io
    'u6PJ8DtQuPFnfmwHbGFULQ4u4EgjDiyYKjVEsynXq2w': 'Gate.io',
    // DEX Aggregators (also link to identity via wallet connections)
    '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1': 'Raydium',
    'JUP6i4ozu5ydDCnLiMogSckDPpbtr7BJ4FtzYWkb5Rk': 'Jupiter',
    '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8': 'Raydium AMM',
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
    version: number;
}

const CACHE_VERSION = 2; // Increment this to invalidate all old cache entries
const CACHE_TTL = 30 * 1000; // 30 seconds (reduced for debugging)
const scanCache = new Map<string, CacheEntry<any>>();
const apiCallStats = { helius: 0, birdeye: 0, cached: 0 };

function getCachedScan(address: string): any | null {
    const key = `${currentNetwork}:${address}`;
    const cached = scanCache.get(key);
    if (cached &&
        cached.version === CACHE_VERSION &&
        Date.now() - cached.timestamp < CACHE_TTL &&
        cached.network === currentNetwork) {
        apiCallStats.cached++;
        console.log(`[Cache] HIT for ${address.slice(0, 8)}... (saved 3 API calls)`);
        return cached.data;
    }
    return null;
}

function setCachedScan(address: string, data: any): void {
    const key = `${currentNetwork}:${address}`;
    scanCache.set(key, { data, timestamp: Date.now(), network: currentNetwork, version: CACHE_VERSION });
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
    const url = `${base}/v0/addresses/${address}/transactions?api-key=${apiKey}&limit=500`;
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

    // Handle edge case of no valid timestamps
    let daysActive = 1;
    let txPerDay = txCount;

    if (timestamps.length >= 2) {
        const oldest = Math.min(...timestamps);
        const newest = Math.max(...timestamps);
        daysActive = Math.max(1, Math.floor((newest - oldest) / (24 * 60 * 60)));
        txPerDay = txCount / daysActive;
    }

    // Improved scoring with better thresholds - start scoring from just 1 tx
    let score = 0;
    if (txCount >= 1) score = 10;
    if (txCount >= 5) score = 20;
    if (txCount >= 20) score = 35;
    if (txCount >= 50) score = 50;
    if (txCount >= 100) score = 65;
    if (txCount >= 250) score = 80;
    if (txCount >= 500) score = 90;
    if (txPerDay > 3) score = Math.min(95, score + 5);

    return { score, txCount, daysActive, txPerDay };
}

function analyzeClustering(transactions: HeliusTransaction[], selfAddress: string) {
    const addressCounts = new Map<string, number>();

    for (const tx of transactions) {
        // Check nativeTransfers
        for (const transfer of tx.nativeTransfers || []) {
            const counterparty = transfer.toUserAccount === selfAddress
                ? transfer.fromUserAccount
                : transfer.toUserAccount;
            if (counterparty && counterparty !== selfAddress) {
                addressCounts.set(counterparty, (addressCounts.get(counterparty) || 0) + 1);
            }
        }
        // Check tokenTransfers
        for (const transfer of tx.tokenTransfers || []) {
            const counterparty = transfer.toUserAccount === selfAddress
                ? transfer.fromUserAccount
                : transfer.toUserAccount;
            if (counterparty && counterparty !== selfAddress) {
                addressCounts.set(counterparty, (addressCounts.get(counterparty) || 0) + 1);
            }
        }

        // Fallback 1: Check accountData for addresses with balance changes
        if ((!tx.nativeTransfers || tx.nativeTransfers.length === 0) &&
            (!tx.tokenTransfers || tx.tokenTransfers.length === 0)) {
            for (const acct of tx.accountData || []) {
                if (acct.account && acct.account !== selfAddress &&
                    (acct.nativeBalanceChange !== 0 || (acct.tokenBalanceChanges && acct.tokenBalanceChanges.length > 0))) {
                    addressCounts.set(acct.account, (addressCounts.get(acct.account) || 0) + 1);
                }
            }
        }

        // Fallback 2: if still no addresses, use feePayer as a signal of interaction
        if (addressCounts.size === 0 && tx.feePayer && tx.feePayer !== selfAddress) {
            addressCounts.set(tx.feePayer, (addressCounts.get(tx.feePayer) || 0) + 1);
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

    // Improved scoring - start from 1 interaction
    let score = 0;
    if (interactedCount >= 1) score = 10;
    if (interactedCount >= 3) score = 20;
    if (interactedCount >= 10) score = 35;
    if (interactedCount >= 25) score = 50;
    if (interactedCount >= 50) score = 65;
    if (interactedCount >= 100) score = 80;
    if (interactedCount >= 200) score = 90;

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
    // Use a more current SOL price estimate (~$150-250 range)
    const solPriceEstimate = 180;
    let netWorth = solBalance * solPriceEstimate;

    for (const asset of assets) {
        if (asset.token_info?.price_info?.total_price) {
            netWorth += asset.token_info.price_info.total_price;
        }
    }

    // Improved scoring thresholds - start from any balance
    let score = 0;
    if (netWorth > 0) score = 10;
    if (netWorth >= 10) score = 20;
    if (netWorth >= 100) score = 35;
    if (netWorth >= 1000) score = 50;
    if (netWorth >= 10000) score = 65;
    if (netWorth >= 50000) score = 80;
    if (netWorth >= 100000) score = 90;

    return { score, netWorth };
}

// SNS (Solana Name Service) domain lookup via Bonfida SDK Proxy
async function getSNSDomains(address: string): Promise<string[]> {
    try {
        const url = `https://sns-sdk-proxy.bonfida.workers.dev/domains/${address}`;
        const response = await fetch(url);
        if (!response.ok) return [];
        const data = await response.json();
        // API returns result array with domain public keys, need to resolve them
        // For now, just check if domains exist - the proxy returns domain names
        if (Array.isArray(data.result)) {
            return data.result.slice(0, 5); // Return up to 5 domains
        }
        return [];
    } catch {
        return [];
    }
}

// Fetch Twitter handle linked to a wallet address via Bonfida SNS SDK Proxy
async function getTwitterHandle(address: string): Promise<string | null> {
    try {
        const url = `https://sdk-proxy.sns.id/twitter/get-handle-by-key/${address}`;
        const response = await fetch(url);
        if (!response.ok) return null;
        const data = await response.json();
        // API returns { result: "handle" } or { result: null }
        if (data.result && typeof data.result === 'string') {
            return data.result;
        }
        return null;
    } catch {
        return null;
    }
}

// Fetch Twitter record from a specific SNS domain
async function getTwitterFromDomain(domain: string): Promise<string | null> {
    try {
        // Remove .sol suffix if present for the API call
        const cleanDomain = domain.replace(/\.sol$/, '');
        const url = `https://sdk-proxy.sns.id/record-v2/${cleanDomain}/twitter`;
        const response = await fetch(url);
        if (!response.ok) return null;
        const data = await response.json();
        if (data.result && typeof data.result === 'string') {
            return data.result;
        }
        return null;
    } catch {
        return null;
    }
}

async function analyzeWallet(address: string, apiKey: string) {
    const [transactions, assets, solBalance, snsDomains, twitterHandle] = await Promise.all([
        getTransactionHistory(address, apiKey).catch(() => []),
        getAssetsByOwner(address, apiKey).catch(() => []),
        getBalance(address, apiKey).catch(() => 0),
        getSNSDomains(address).catch(() => []),
        getTwitterHandle(address).catch(() => null),
    ]);

    if (transactions.length === 0 && assets.length === 0 && solBalance === 0) {
        throw new Error('No data found for this wallet');
    }

    // Also try to get Twitter handles from SNS domain records
    const domainTwitterHandles: string[] = [];
    if (snsDomains.length > 0) {
        const domainTwitterPromises = snsDomains.slice(0, 3).map(domain =>
            getTwitterFromDomain(domain).catch(() => null)
        );
        const results = await Promise.all(domainTwitterPromises);
        results.forEach(handle => {
            if (handle && !domainTwitterHandles.includes(handle)) {
                domainTwitterHandles.push(handle);
            }
        });
    }

    // Combine all Twitter handles found
    const allTwitterHandles: string[] = [];
    if (twitterHandle) allTwitterHandles.push(twitterHandle);
    domainTwitterHandles.forEach(handle => {
        if (!allTwitterHandles.includes(handle)) {
            allTwitterHandles.push(handle);
        }
    });

    // Debug logging to understand data flow
    console.log('[Debug] Analysis data:', {
        transactionCount: transactions.length,
        hasNativeTransfers: transactions.filter(tx => tx.nativeTransfers?.length).length,
        hasTokenTransfers: transactions.filter(tx => tx.tokenTransfers?.length).length,
        assetsCount: assets.length,
        solBalance,
        snsDomains,
    });

    // Log the first transaction structure to understand the API response
    if (transactions.length > 0) {
        console.log('[Debug] First TX structure:', JSON.stringify(transactions[0], null, 2).slice(0, 2000));
    }

    const cexAnalysis = analyzeCexConnections(transactions);
    const activityAnalysis = analyzeActivity(transactions);
    const clusteringAnalysis = analyzeClustering(transactions, address);
    const identityAnalysis = analyzeIdentity(assets);
    const financialAnalysis = analyzeFinancial(assets, solBalance);

    // Debug logging for individual scores
    console.log('[Debug] Scores:', {
        cex: cexAnalysis.score,
        activity: activityAnalysis.score,
        clustering: clusteringAnalysis.score,
        identity: identityAnalysis.score,
        financial: financialAnalysis.score,
        txCount: activityAnalysis.txCount,
        interactedCount: clusteringAnalysis.data.interactedCount,
    });

    // SNS domains and Twitter handles significantly increase identity exposure
    let identityScore = identityAnalysis.score;
    if (snsDomains.length > 0) {
        identityScore += 30; // Major dox risk
    }
    if (snsDomains.length > 2) {
        identityScore += 15; // Multiple domains = higher exposure
    }
    if (allTwitterHandles.length > 0) {
        identityScore += 25; // Twitter handle linked = MAJOR dox risk
    }
    identityScore = Math.min(95, identityScore);

    const scoreBreakdown = {
        identity: identityScore,
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
    if (snsDomains.length > 0) {
        risks.push(`SNS domains detected (${snsDomains.join(', ')}) - direct identity linkage. Anyone can search this domain on X or Google to find you.`);
    }
    if (allTwitterHandles.length > 0) {
        risks.push(`🚨 Twitter handle(s) linked: @${allTwitterHandles.join(', @')} - CRITICAL: Your real identity is directly exposed!`);
    }
    if (risks.length === 0) {
        risks.push('Limited on-chain activity - low exposure profile');
    }

    // Count trades more comprehensively - includes swaps, DEX activity, and token transfers
    const tradeTypes = ['SWAP', 'TOKEN_MINT', 'TRADE', 'NFT_SALE', 'NFT_MINT', 'TRANSFER', 'BURN'];
    const tradeCount = transactions.filter(tx => {
        const txType = tx.type?.toUpperCase() || '';
        // Match exact types or partial matches
        return tradeTypes.some(t => txType.includes(t)) ||
            (tx.tokenTransfers && tx.tokenTransfers.length > 0); // Any token transfer counts
    }).length;

    // Count actual token swap transactions more accurately
    const swapCount = transactions.filter(tx =>
        tx.type === 'SWAP' || tx.source?.includes('JUPITER') || tx.source?.includes('RAYDIUM') ||
        tx.description?.toLowerCase().includes('swap') || tx.description?.toLowerCase().includes('traded')
    ).length;

    // Memecoin trades: estimate based on high-frequency token swaps without stable token involvement
    const memecoinTrades = Math.max(
        Math.floor(swapCount * 0.6), // 60% of swaps are likely memecoin-related
        transactions.filter(tx => tx.tokenTransfers && tx.tokenTransfers.length >= 2).length
    );

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
        memecoinTrades,
        clustering: clusteringAnalysis.data,
        risks,
        snsDomains,
        twitterHandles: allTwitterHandles,
        links: {
            xSearch: `https://x.com/search?q=${address}&src=typed_query`,
            snsSearch: snsDomains.length > 0 ? `https://x.com/search?q=${snsDomains[0]}.sol&src=typed_query` : null,
            twitterProfile: allTwitterHandles.length > 0 ? `https://x.com/${allTwitterHandles[0]}` : null,
            arkham: `https://platform.arkhamintelligence.com/explorer/address/${address}`,
            solscan: `https://solscan.io/account/${address}`,
        },
        recentTxSummary,
        // Debug info - remove after fixing
        _debug: {
            txCount: transactions.length,
            assetsCount: assets.length,
            solBalance,
            hasNativeTransfers: transactions.filter(tx => tx.nativeTransfers?.length).length,
            hasTokenTransfers: transactions.filter(tx => tx.tokenTransfers?.length).length,
            rawScores: {
                cex: cexAnalysis.score,
                activity: activityAnalysis.score,
                clustering: clusteringAnalysis.score,
                identity: identityScore,
                financial: financialAnalysis.score,
            }
        }
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
