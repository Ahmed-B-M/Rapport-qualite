
import { type Delivery, type StatsByEntity, type AggregatedStats } from './definitions';
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

    const name = driverName.trim();
    const lowerCaseName = name.toLowerCase();

    if (lowerCaseName.includes('id log')) {
        return 'ID LOGISTICS';
    }

    if (name.startsWith('. SST')) {
        return 'Sous traitants';
    }
    
    // Check for carriers with numeric suffixes first
    for (const carrier of CARRIERS) {
        for (const suffix of carrier.suffixes) {
            if (suffix && name.endsWith(suffix)) {
                // Check if the character before the suffix is not a space, if so, it's attached
                const suffixIndex = name.lastIndexOf(suffix);
                if (suffixIndex > 0) {
                     return carrier.name;
                }
            }
        }
    }

    const driverParts = name.split(' ');
    const driverSuffix = driverParts.pop() || '';

    for (const carrier of CARRIERS) {
        if (carrier.suffixes.includes(driverSuffix)) {
            return carrier.name;
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
    const driver = driverName ? `${driverName} (${depot})` : 'Livreur Inconnu';
    const carrier = getCarrierFromDriver(driverName || '');

    let status = delivery.status;
    let failureReason = delivery.failureReason;
    if (status === 'Livré') {
        failureReason = undefined;
    } else if (status === 'En attente') {
        status = 'En attente';
    } else {
        status = 'Non livré';
    }

    return {
      ...delivery,
      date: delivery.date || 'N/A',
      status: status,
      failureReason: failureReason,
      taskId: String(delivery.taskId || 'N/A'),
      warehouse: warehouse,
      driver: driver || 'Livreur Inconnu',
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
    if (delivery.status === 'En attente') {
        stats.pendingDeliveries++;
        return;
    }
    
    stats.totalDeliveries++;
    if (delivery.status === 'Livré') {
        stats.successfulDeliveries++;
    } else {
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
    if (stats.totalDeliveries > 0) {
        stats.successRate = (stats.successfulDeliveries / stats.totalDeliveries) * 100;
        stats.punctualityRate = (stats.onTimeDeliveries / stats.totalDeliveries) * 100;
        stats.forcedNoContactRate = (stats.forcedNoContactCount / stats.totalDeliveries) * 100;
        stats.forcedOnSiteRate = (stats.forcedOnSiteCount / stats.totalDeliveries) * 100;
        stats.webCompletionRate = (stats.webCompletionCount / stats.totalDeliveries) * 100;
        stats.ratingRate = (stats.ratedDeliveries / stats.totalDeliveries) * 100;
    }
    if (stats.ratedDeliveries > 0) {
        stats.averageRating = stats.totalRating / stats.ratedDeliveries;
    }
};

export const aggregateStats = (data: Delivery[], groupBy: keyof Delivery): StatsByEntity => {
  const statsByEntity: StatsByEntity = {};
  
  data.forEach((delivery) => {
    let entityName: string;
    if (groupBy === 'driver') {
        entityName = delivery[groupBy] as string || 'Livreur Inconnu';
    } else {
        entityName = delivery[groupBy] as string || 'Inconnu';
    }

    if (!statsByEntity[entityName]) {
      statsByEntity[entityName] = createInitialStats();
    }
    updateStats(statsByEntity[entityName], delivery);
  });
  
  Object.values(statsByEntity).forEach(finalizeStats);

  return statsByEntity;
};

export const getOverallStats = (data: Delivery[]): AggregatedStats => {
    const overallStats = createInitialStats();
    data.forEach(delivery => updateStats(overallStats, delivery));
    finalizeStats(overallStats);
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

    // For flop, a higher value is worse. For top, a higher value is better.
    // The 'order' param dictates the sorting for the "Top" list. 'asc' means higher is better.
    // 'desc' means lower is better (e.g., for failure rates).
    const higherIsBetter = order === 'asc';
    
    const sorted = [...validStats].sort((a, b) => {
        const valA = metric === 'successRate' ? 100 - a.successRate : a[metric];
        const valB = metric === 'successRate' ? 100 - b.successRate : b[metric];

        if (valA !== valB) {
            return higherIsBetter ? valB - valA : valA - valB;
        }
        
        return b.totalDeliveries - a.totalDeliveries;
    });

    if (sorted.length < 10) {
        const top = sorted.slice(0, take);
        const flopData = sorted.slice(take);
        // For flop list, we want to show the absolute worst, so we reverse the secondary sort logic
        const flop = flopData.sort((a, b) => {
             const valA = metric === 'successRate' ? 100 - a.successRate : a[metric];
             const valB = metric === 'successRate' ? 100 - b.successRate : b[metric];
             if (valA !== valB) {
                return higherIsBetter ? valA - valB : valB - valA;
             }
             return b.totalDeliveries - a.totalDeliveries;
        });

        return { top, flop };
    }

    const top = sorted.slice(0, take);
    const flopSorted = [...validStats].sort((a,b) => {
        const valA = metric === 'successRate' ? 100 - a.successRate : a[metric];
        const valB = metric === 'successRate' ? 100 - b.successRate : b[metric];

        if (valA !== valB) {
            return higherIsBetter ? valA - valB : valB - valA;
        }

        return b.totalDeliveries - a.totalDeliveries;
    });

    const flop = flopSorted.slice(0, take);


    return { top, flop };
}
