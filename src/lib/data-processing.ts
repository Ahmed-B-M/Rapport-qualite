

import { type Delivery, type StatsByEntity, type AggregatedStats, type DeliveryStatus } from './definitions';
import { WAREHOUSE_DEPOT_MAP, CARRIERS } from './constants';

const HEADER_MAPPING: Record<string, keyof Delivery> = {
  'Date': 'date',
  'Statut': 'status',
  'Raison d’échec de livraison': 'failureReason',
  'ID de la tâche': 'taskId',
  'Entrepôt': 'warehouse',
  'Livreur': 'driver',
  'Tournée': 'tourId',
  'Séquence': 'sequence',
  'Retard (s)': 'delaySeconds',
  'Qu\'avez vous pensé de la livraison de votre commande?': 'feedbackComment',
  'Notez votre livraison': 'deliveryRating',
  'Sans contact forcé': 'forcedNoContact',
  'Raison de confirmation sans contact': 'noContactReason',
  'Sur place forcé': 'forcedOnSite',
  'Complété par': 'completedBy',
};

const getCarrierFromDriver = (driverName: string): string => {
    if (!driverName || driverName.trim() === '') return 'Inconnu';

    const name = driverName.trim().toUpperCase();
    
    if (name.endsWith('ID LOG')) {
        return 'ID LOGISTICS';
    }

    if (name.startsWith('STT')) {
        return 'Sous traitants';
    }
    
    for (const carrier of CARRIERS) {
        for (const suffix of carrier.suffixes) {
            if (suffix && name.endsWith(suffix)) {
                return carrier.name;
            }
        }
    }
    
    return 'Inconnu';
};

export const processRawData = (rawData: any[]): Delivery[] => {
  return rawData.map((row) => {
    const delivery: Partial<Delivery> = {};
    for (const rawHeader in row) {
      const mappedKey = HEADER_MAPPING[rawHeader.trim()];
      if (mappedKey) {
        delivery[mappedKey] = row[rawHeader];
      }
    }
    
    const warehouse = (delivery.warehouse || 'Inconnu').trim();
    const depot = WAREHOUSE_DEPOT_MAP[warehouse] || 'Dépôt Inconnu';
    const driverName = (delivery.driver || '').trim();
    
    if (!driverName) {
        return {
          ...delivery,
          date: delivery.date || 'N/A',
          status: 'En attente',
          taskId: String(delivery.taskId || 'N/A'),
          warehouse: warehouse,
          driver: 'Livreur Inconnu',
          tourId: String(delivery.tourId || 'N/A'),
          sequence: Number(delivery.sequence) || 0,
          delaySeconds: Number(delivery.delaySeconds) || 0,
          forcedNoContact: false,
          forcedOnSite: 'No',
          completedBy: 'unknown',
          depot,
          carrier: 'Inconnu',
        } as Delivery;
    }
    
    const carrier = getCarrierFromDriver(driverName);
    const driver = driverName ? `${driverName} (${depot})` : `Livreur Inconnu (${depot})`;
    
    let status: DeliveryStatus;
    switch(row['Statut']) {
        case 'Livré':
            status = 'Livré';
            break;
        case 'Non livré':
            status = 'Non livré';
            break;
        case 'Partiellement livré':
            status = 'Partiellement livré';
            break;
        default:
            status = 'En attente';
            break;
    }

    let failureReason = delivery.failureReason;
    if (status === 'Livré' || status === 'Partiellement livré') {
        failureReason = undefined;
    }

    return {
      ...delivery,
      date: delivery.date || 'N/A',
      status: status,
      failureReason: failureReason,
      taskId: String(delivery.taskId || 'N/A'),
      warehouse: warehouse,
      driver: driver,
      tourId: String(delivery.tourId || 'N/A'),
      sequence: Number(delivery.sequence) || 0,
      delaySeconds: Number(delivery.delaySeconds) || 0,
      forcedNoContact: String(delivery.forcedNoContact).toLowerCase() === 'true',
      forcedOnSite: delivery.forcedOnSite === 'Yes' ? 'Yes' : 'No',
      completedBy: String(delivery.completedBy).toLowerCase() === 'web' ? 'web' : (String(delivery.completedBy).toLowerCase() === 'mobile' ? 'mobile' : 'unknown'),
      deliveryRating: delivery.deliveryRating ? Number(delivery.deliveryRating) : undefined,
      feedbackComment: delivery.feedbackComment ? String(delivery.feedbackComment) : undefined,
      depot,
      carrier,
    } as Delivery;
  });
};

const createInitialStats = (): AggregatedStats => ({
    totalDeliveries: 0,
    successfulDeliveries: 0,
    failedDeliveries: 0,
    pendingDeliveries: 0,
    successRate: 0,
    failureReasons: {},
    totalRating: 0,
    ratedDeliveries: 0,
    averageRating: 0,
    onTimeDeliveries: 0,
    punctualityRate: 0,
    forcedNoContactCount: 0,
    forcedNoContactRate: 0,
    forcedOnSiteCount: 0,
    forcedOnSiteRate: 0,
    webCompletionCount: 0,
    webCompletionRate: 0,
    ratingRate: 0,
});

const updateStats = (stats: AggregatedStats, delivery: Delivery) => {
    stats.totalDeliveries++;
    
    if (delivery.status === 'Livré' || delivery.status === 'Partiellement livré') {
        stats.successfulDeliveries++;
    } else if (delivery.status === 'Non livré') {
        stats.failedDeliveries++;
        if (delivery.failureReason) {
            const reason = delivery.failureReason.trim();
            stats.failureReasons[reason] = (stats.failureReasons[reason] || 0) + 1;
        }
    }

    if (delivery.delaySeconds >= -900 && delivery.delaySeconds <= 900) {
        stats.onTimeDeliveries++;
    }

    if (delivery.deliveryRating !== undefined && delivery.deliveryRating !== null) {
        stats.ratedDeliveries++;
        stats.totalRating += delivery.deliveryRating;
    }
    
    if (delivery.forcedNoContact) {
        stats.forcedNoContactCount++;
    }
    if (delivery.forcedOnSite === 'Yes') {
        stats.forcedOnSiteCount++;
    }
    if (delivery.completedBy === 'web') {
        stats.webCompletionCount++;
    }
};

const finalizeStats = (stats: AggregatedStats) => {
    const relevantTotal = stats.successfulDeliveries + stats.failedDeliveries;
    if (relevantTotal > 0) {
        stats.successRate = (stats.successfulDeliveries / relevantTotal) * 100;
        stats.punctualityRate = (stats.onTimeDeliveries / relevantTotal) * 100;
        stats.forcedNoContactRate = (stats.forcedNoContactCount / relevantTotal) * 100;
        stats.forcedOnSiteRate = (stats.forcedOnSiteCount / relevantTotal) * 100;
        stats.webCompletionRate = (stats.webCompletionCount / relevantTotal) * 100;
        stats.ratingRate = (stats.ratedDeliveries / relevantTotal) * 100;
    }
    if (stats.ratedDeliveries > 0) {
        stats.averageRating = stats.totalRating / stats.ratedDeliveries;
    }
    stats.totalDeliveries = relevantTotal;
};

export const aggregateStats = (data: Delivery[], groupBy: keyof Delivery): StatsByEntity => {
  const statsByEntity: StatsByEntity = {};
  
  data.forEach((delivery) => {
    let entityName: string = delivery[groupBy] as string || 'Inconnu';
    
    if (groupBy === 'driver' && entityName.startsWith('Livreur Inconnu')) {
        entityName = `Livreur Inconnu (${delivery.depot})`
    }

    if (!statsByEntity[entityName]) {
      statsByEntity[entityName] = createInitialStats();
    }

    if (delivery.status === 'En attente') {
      statsByEntity[entityName].pendingDeliveries++;
    } else {
      updateStats(statsByEntity[entityName], delivery);
    }
  });
  
  Object.values(statsByEntity).forEach(finalizeStats);

  return statsByEntity;
};

export const getOverallStats = (data: Delivery[]): AggregatedStats => {
    const overallStats = createInitialStats();
    
    const relevantDeliveries = data.filter(d => d.status !== 'En attente');
    const pendingCount = data.length - relevantDeliveries.length;

    relevantDeliveries.forEach(delivery => {
        updateStats(overallStats, delivery);
    });

    finalizeStats(overallStats);
    overallStats.pendingDeliveries = pendingCount;
    return overallStats;
}

export type RankingMetric = 'averageRating' | 'punctualityRate' | 'successRate' | 'forcedOnSiteRate' | 'forcedNoContactRate' | 'webCompletionRate';
export type Ranking<T> = {
    top: T[],
    flop: T[]
}

export function getRankings<T extends {name: string} & AggregatedStats>(
    stats: T[],
    metric: RankingMetric,
    take: number = 5,
    order: 'asc' | 'desc' = 'asc'
): Ranking<T> {

    // Filter out entities that should not be ranked (e.g., no rated deliveries for averageRating)
    const validStats = stats.filter(s => {
        if (metric === 'averageRating') return s.averageRating > 0 && s.ratedDeliveries > 0;
        return s.totalDeliveries > 0;
    });

    const metricsWhereLowerIsBetter: RankingMetric[] = ['successRate', 'forcedOnSiteRate', 'forcedNoContactRate', 'webCompletionRate'];
    const higherIsBetter = !metricsWhereLowerIsBetter.includes(metric);
    
    const sorted = [...validStats].sort((a, b) => {
        let valA: number, valB: number;
        
        if (metric === 'successRate') {
            valA = 100 - a.successRate;
            valB = 100 - b.successRate;
        } else {
            valA = a[metric];
            valB = b[metric];
        }

        if (valA !== valB) {
            return higherIsBetter ? valB - valA : valA - valB;
        }
        return b.totalDeliveries - a.totalDeliveries; // Secondary sort by volume
    });
    
    let top, flop;

    if (higherIsBetter) {
        top = sorted.slice(0, take);
        flop = sorted.slice(-take).reverse();
    } else {
        // If lower is better, the "top" are those with the lowest values, and "flop" has the highest.
        top = sorted.slice(0, take);
        flop = sorted.slice(-take).reverse();
    }

    return { top, flop };
}
