export type DeliveryStatus = 'Livré' | 'Non livré';
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
  // Augmented data
  depot: string;
  carrier: string;
};

export type AggregatedStats = {
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  successRate: number;
  failureReasons: Record<string, number>;
  totalRating: number;
  ratedDeliveries: number;
  averageRating: number;
  onTimeDeliveries: number;
  punctualityRate: number;
  // New rates
  forcedNoContactCount: number;
  forcedNoContactRate: number;
  forcedOnSiteCount: number;
  forcedOnSiteRate: number;
  webCompletionCount: number;
  webCompletionRate: number;
  ratingRate: number;
};

export type StatsByEntity = {
  [entityName: string]: AggregatedStats;
};
