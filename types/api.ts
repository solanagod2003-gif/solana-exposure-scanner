
export interface ScoreBreakdown {
  identity: number;
  kycLinks: number;
  financial: number;
  clustering: number;
  activity: number;
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

export interface ExposureData {
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
