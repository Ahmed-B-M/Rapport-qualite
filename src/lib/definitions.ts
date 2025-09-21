
export type DeliveryStatus = 'Livré' | 'Non livré' | 'En attente' | 'Partiellement livré';
export type CompletedBy = 'mobile' | 'web' | 'unknown';
export type ForcedOnSite = 'No' | 'Yes';

export type Delivery = {
  date: string;
  status: DeliveryStatus;
  failureReason?: string;
  taskId: string;
  warehouse: string;
  driver: string;
  tourId: string;
  sequence: number;
  delaySeconds: number;
  feedbackComment?: string;
  deliveryRating?: number;
  forcedNoContact: boolean;
  noContactReason?: string;
  forcedOnSite: ForcedOnSite;
  completedBy: CompletedBy;
  depot: string;
  carrier: string;
};

export type AggregatedStats = {
  totalDeliveries: number;
  successRate: number;
  averageRating?: number;
  punctualityRate: number;
  ratingRate: number;
  forcedOnSiteRate: number;
  forcedNoContactRate: number;
  webCompletionRate: number;
  averageSentiment?: number;
  ratingCount: number; 
};

export type DriverPerformance = AggregatedStats & {
  driver: string;
  depot: string;
  carrier: string;
};

// --- New Types for Performance Report ---

export type Objectives = {
    averageRating: number;
    averageSentiment: number;
    punctualityRate: number;
    failureRate: number;
    forcedOnSiteRate: number;
    forcedNoContactRate: number;
    webCompletionRate: number;
};

export type RankingEntity = {
  name: string;
  value: number;
  totalDeliveries: number;
};

export type DriverRatingRankingEntity = {
    name: string;
    count: number;
    averageRating?: number;
};

export type KpiRanking = {
  top: RankingEntity[];
  flop: RankingEntity[];
};

export type KpiRankingsByEntity = {
  drivers: {
    averageRating: KpiRanking;
    averageSentiment: KpiRanking;
    punctualityRate: KpiRanking;
    successRate: KpiRanking;
  };
  carriers: {
    averageRating: KpiRanking;
    averageSentiment: KpiRanking;
    punctualityRate: KpiRanking;
    successRate: KpiRanking;
  };
};

export type CommentExample = {
    comment: string;
    score: number;
    driver: string;
};

export type ReportSectionData = {
    stats: AggregatedStats;
    kpiRankings: KpiRankingsByEntity;
    topComments: CommentExample[];
    flopComments: CommentExample[];
    topRatedDrivers: DriverRatingRankingEntity[];
    flopRatedDrivers: DriverRatingRankingEntity[];
};

export type DepotReport = ReportSectionData & {
    name: string;
};

export type PerformanceReportData = {
  global: ReportSectionData;
  depots: DepotReport[];
};

// --- New Types for Synthesis Report ---
export interface SynthesisPoints {
  strengths: string[];
  weaknesses: string[];
}

export interface DepotSynthesis extends SynthesisPoints {
  name: string;
  overall: 'positive' | 'negative' | 'mitigée';
}

export interface SynthesisResult {
  global: SynthesisPoints & { overall: 'positive' | 'negative' | 'mitigée' };
  depots: DepotSynthesis[];
  conclusion: string;
}
