// Privacy Exposure Analyzer
// Calculates exposure scores based on real blockchain data

import { HeliusTransaction, HeliusAsset } from './helius.js';
import { BirdeyeWalletPnL } from './birdeye.js';
import { CEX_ADDRESSES, PROTOCOL_ADDRESSES } from '../constants/addresses.js';

export interface ScoreBreakdown {
    identity: number;      // SNS names, NFT metadata exposure
    kycLinks: number;      // CEX connections
    financial: number;     // Trading patterns, portfolio exposure
    clustering: number;    // Wallet relationship patterns
    activity: number;      // Transaction frequency exposure
}

export interface ClusteringData {
    interactedCount: number;
    topAddresses: string[];
}

export interface TransactionSummary {
    date: string;
    type: string;
    amountUsd: number;
    description: string;
}

export interface ExternalLinks {
    xSearch: string;
    arkham: string;
    solscan: string;
}

export interface ExposureAnalysis {
    exposureScore: number;
    scoreBreakdown: ScoreBreakdown;
    netWorthUsd: number;
    realizedLossesUsd: number;
    tradeCount: number;
    memecoinTrades: number;
    clustering: ClusteringData;
    risks: string[];
    links: ExternalLinks;
    recentTxSummary: TransactionSummary[];
}

interface AnalyzerInput {
    address: string;
    transactions: HeliusTransaction[];
    assets: HeliusAsset[];
    solBalance: number;
    pnlData: BirdeyeWalletPnL | null;
}

class ExposureAnalyzer {

    /**
     * Main analysis function - calculates full exposure profile
     */
    analyze(input: AnalyzerInput): ExposureAnalysis {
        const { address, transactions, assets, solBalance, pnlData } = input;

        // Calculate individual scores
        const cexAnalysis = this.analyzeCexConnections(transactions);
        const activityAnalysis = this.analyzeActivity(transactions);
        const clusteringAnalysis = this.analyzeClustering(transactions, address);
        const identityAnalysis = this.analyzeIdentity(assets, transactions);
        const financialAnalysis = this.analyzeFinancial(assets, solBalance, pnlData);

        // Calculate score breakdown (0-100 each, where higher = more exposed)
        const scoreBreakdown: ScoreBreakdown = {
            identity: identityAnalysis.score,
            kycLinks: cexAnalysis.score,
            financial: financialAnalysis.score,
            clustering: clusteringAnalysis.score,
            activity: activityAnalysis.score,
        };

        // Calculate weighted overall score
        const exposureScore = Math.round(
            scoreBreakdown.kycLinks * 0.30 +      // CEX connections most important
            scoreBreakdown.clustering * 0.25 +     // Wallet relationships
            scoreBreakdown.activity * 0.20 +       // Transaction patterns
            scoreBreakdown.financial * 0.15 +      // Portfolio exposure
            scoreBreakdown.identity * 0.10         // Identity metadata
        );

        // Generate risks list
        const risks = this.generateRisks(cexAnalysis, activityAnalysis, clusteringAnalysis, identityAnalysis);

        // Generate transaction summaries
        const recentTxSummary = this.generateTxSummaries(transactions.slice(0, 10));

        // Count trades
        const tradeCount = transactions.filter(tx =>
            tx.type === 'SWAP' || tx.type === 'TOKEN_MINT' || tx.type.includes('TRADE')
        ).length;

        // Estimate memecoin trades (tokens with no price info or very volatile)
        const memecoinTrades = Math.floor(tradeCount * 0.4); // Rough estimate

        return {
            exposureScore,
            scoreBreakdown,
            netWorthUsd: financialAnalysis.netWorth,
            realizedLossesUsd: pnlData ? Math.abs(Math.min(0, pnlData.totalRealizedPnl)) : 0,
            tradeCount,
            memecoinTrades,
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

    /**
     * Analyze CEX (Centralized Exchange) connections
     */
    private analyzeCexConnections(transactions: HeliusTransaction[]) {
        const cexConnections = new Set<string>();
        let cexTxCount = 0;

        for (const tx of transactions) {
            // Check native transfers
            for (const transfer of tx.nativeTransfers || []) {
                const toExchange = CEX_ADDRESSES[transfer.toUserAccount];
                const fromExchange = CEX_ADDRESSES[transfer.fromUserAccount];

                if (toExchange) {
                    cexConnections.add(toExchange);
                    cexTxCount++;
                }
                if (fromExchange) {
                    cexConnections.add(fromExchange);
                    cexTxCount++;
                }
            }

            // Check token transfers
            for (const transfer of tx.tokenTransfers || []) {
                const toExchange = CEX_ADDRESSES[transfer.toUserAccount];
                const fromExchange = CEX_ADDRESSES[transfer.fromUserAccount];

                if (toExchange) {
                    cexConnections.add(toExchange);
                    cexTxCount++;
                }
                if (fromExchange) {
                    cexConnections.add(fromExchange);
                    cexTxCount++;
                }
            }
        }

        // Score: 0 CEX = 0, 1 CEX = 40, 2+ CEX = 60+, many tx = higher
        let score = 0;
        if (cexConnections.size >= 1) score = 40;
        if (cexConnections.size >= 2) score = 60;
        if (cexConnections.size >= 3) score = 75;
        if (cexTxCount > 10) score = Math.min(95, score + 15);

        return {
            score,
            exchanges: Array.from(cexConnections),
            txCount: cexTxCount,
        };
    }

    /**
     * Analyze transaction activity patterns
     */
    private analyzeActivity(transactions: HeliusTransaction[]) {
        const txCount = transactions.length;

        // Calculate time span
        const timestamps = transactions.map(tx => tx.timestamp).filter(Boolean);
        const oldest = Math.min(...timestamps);
        const newest = Math.max(...timestamps);
        const daysActive = Math.max(1, Math.floor((newest - oldest) / (24 * 60 * 60)));

        // Calculate tx frequency
        const txPerDay = txCount / daysActive;

        // Score: higher activity = more exposure
        let score = 0;
        if (txCount >= 10) score = 20;
        if (txCount >= 50) score = 40;
        if (txCount >= 100) score = 55;
        if (txCount >= 500) score = 70;
        if (txCount >= 1000) score = 85;

        // Boost for high frequency
        if (txPerDay > 5) score = Math.min(95, score + 10);

        return {
            score,
            txCount,
            daysActive,
            txPerDay,
        };
    }

    /**
     * Analyze wallet clustering patterns
     */
    private analyzeClustering(transactions: HeliusTransaction[], selfAddress: string) {
        const addressCounts = new Map<string, number>();

        for (const tx of transactions) {
            // Count native transfer counterparties
            for (const transfer of tx.nativeTransfers || []) {
                const counterparty = transfer.toUserAccount === selfAddress
                    ? transfer.fromUserAccount
                    : transfer.toUserAccount;

                if (counterparty && counterparty !== selfAddress) {
                    addressCounts.set(counterparty, (addressCounts.get(counterparty) || 0) + 1);
                }
            }

            // Count token transfer counterparties
            for (const transfer of tx.tokenTransfers || []) {
                const counterparty = transfer.toUserAccount === selfAddress
                    ? transfer.fromUserAccount
                    : transfer.toUserAccount;

                if (counterparty && counterparty !== selfAddress) {
                    addressCounts.set(counterparty, (addressCounts.get(counterparty) || 0) + 1);
                }
            }
        }

        // Get top addresses by interaction count
        const sorted = Array.from(addressCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        const interactedCount = addressCounts.size;
        const topAddresses = sorted.map(([addr]) => addr.slice(0, 8) + '...' + addr.slice(-4));

        // Score: more interactions = higher clustering exposure
        let score = 0;
        if (interactedCount >= 5) score = 20;
        if (interactedCount >= 20) score = 40;
        if (interactedCount >= 50) score = 55;
        if (interactedCount >= 100) score = 70;
        if (interactedCount >= 500) score = 85;

        return {
            score,
            data: {
                interactedCount,
                topAddresses,
            },
        };
    }

    /**
     * Analyze identity exposure (NFTs, SNS names, etc.)
     */
    private analyzeIdentity(assets: HeliusAsset[], transactions: HeliusTransaction[]) {
        let hasNFTs = false;
        let hasNamedNFTs = false;
        let nftCount = 0;

        for (const asset of assets) {
            if (asset.interface === 'V1_NFT' || asset.interface === 'ProgrammableNFT') {
                hasNFTs = true;
                nftCount++;

                // Check if NFT has revealing metadata
                const name = asset.content?.metadata?.name || '';
                if (name.includes('.sol') || name.includes('Profile') || name.toLowerCase().includes('name')) {
                    hasNamedNFTs = true;
                }
            }
        }

        // Check for SNS-related transactions
        const hasSNS = transactions.some(tx =>
            tx.type === 'SNS' || tx.description?.toLowerCase().includes('.sol')
        );

        // Score calculation
        let score = 0;
        if (hasNFTs) score = 25;
        if (nftCount > 10) score = 40;
        if (hasNamedNFTs) score = 60;
        if (hasSNS) score = 75;

        return {
            score,
            hasNFTs,
            hasSNS,
            nftCount,
        };
    }

    /**
     * Analyze financial exposure
     */
    private analyzeFinancial(assets: HeliusAsset[], solBalance: number, pnlData: BirdeyeWalletPnL | null) {
        // Calculate net worth
        let netWorth = solBalance * 200; // Rough SOL price estimate

        for (const asset of assets) {
            if (asset.token_info?.price_info?.total_price) {
                netWorth += asset.token_info.price_info.total_price;
            }
        }

        // Use Birdeye data if available
        if (pnlData) {
            const holdingValue = pnlData.tokens.reduce((sum, t) => sum + (t.holdingValue || 0), 0);
            if (holdingValue > 0) {
                netWorth = holdingValue + solBalance * 200;
            }
        }

        // Score: higher value = more attractive target = more exposure concern
        let score = 0;
        if (netWorth >= 100) score = 20;
        if (netWorth >= 1000) score = 35;
        if (netWorth >= 10000) score = 50;
        if (netWorth >= 100000) score = 70;
        if (netWorth >= 1000000) score = 90;

        return {
            score,
            netWorth,
        };
    }

    /**
     * Generate human-readable risk descriptions
     */
    private generateRisks(
        cexAnalysis: { exchanges: string[]; txCount: number },
        activityAnalysis: { txCount: number; daysActive: number },
        clusteringAnalysis: { data: ClusteringData },
        identityAnalysis: { hasNFTs: boolean; hasSNS: boolean }
    ): string[] {
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

        if (identityAnalysis.hasSNS) {
            risks.push('SNS domain ownership detected - potential identity correlation');
        }

        if (identityAnalysis.hasNFTs) {
            risks.push('NFT holdings may contain identifying metadata');
        }

        if (activityAnalysis.daysActive > 365) {
            risks.push(`Long wallet history (${Math.floor(activityAnalysis.daysActive / 30)} months) - extensive behavioral pattern available`);
        }

        if (risks.length === 0) {
            risks.push('Limited on-chain activity - low exposure profile');
        }

        return risks;
    }

    /**
     * Generate transaction summaries for display
     */
    private generateTxSummaries(transactions: HeliusTransaction[]): TransactionSummary[] {
        return transactions.map(tx => {
            const date = tx.timestamp
                ? new Date(tx.timestamp * 1000).toISOString().split('T')[0]
                : 'Unknown';

            // Calculate rough USD amount from native transfers
            let amountUsd = 0;
            for (const transfer of tx.nativeTransfers || []) {
                amountUsd += (transfer.amount / 1e9) * 200; // Rough SOL price
            }

            return {
                date,
                type: tx.type || 'UNKNOWN',
                amountUsd: Math.round(amountUsd * 100) / 100,
                description: tx.description || `${tx.type} transaction`,
            };
        });
    }
}

export const exposureAnalyzer = new ExposureAnalyzer();
