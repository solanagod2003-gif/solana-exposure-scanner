
export interface ScoreBreakdown {
  identity: number;
  kycLinks: number;
  financial: number;
  clustering: number;
  activity: number;
}

export interface NetworkNode {
  address: string;
  type: 'CEX' | 'DEX' | 'MEMECOIN' | 'PROTOCOL' | 'UNKNOWN';
  interactions: number;
  label?: string;
}

export interface ClusteringData {
  interactedCount: number;
  topAddresses: string[];
  networkNodes?: NetworkNode[]; // For graph visualization
}

export interface TransactionSummary {
  date: string;
  type: string;
  amountUsd: number;
  description: string;
}

export interface ExternalLinks {
  xSearch: string;
  snsSearch: string | null;
  twitterProfile: string | null;
  arkham: string;
  solscan: string;
}

export interface ExposureData {
  exposureScore: number;
  scoreBreakdown: ScoreBreakdown;
  netWorthUsd: number;
  realizedLossesUsd: number;
  tradeCount: number;
  memecoinTrades: number;
  clustering: ClusteringData;
  risks: string[];
  snsDomains: string[];
  twitterHandles: string[];
  links: ExternalLinks;
  recentTxSummary: TransactionSummary[];
}
