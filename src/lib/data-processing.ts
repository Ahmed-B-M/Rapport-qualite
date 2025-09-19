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
    if (!driverName) return 'Unknown';

    const name = driverName.trim();
    
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
    
    // Handle cases where there is no suffix or it's not a recognized numeric suffix
    // ID LOGISTICS has an empty suffix and would have been matched if the name was just the name without suffix.
    if (CARRIERS.find(c => c.name === 'ID LOGISTICS')?.suffixes.includes('')) {
        const idLogisticsCarrier = CARRIERS.find(c => c.name === 'ID LOGISTICS');
        if (idLogisticsCarrier) {
             // Check if it's not another carrier by checking if the last part is not a number suffix of another carrier
            let isOtherCarrier = false;
            for (const c of CARRIERS) {
                if (c.suffixes.some(s => s && name.endsWith(s))) {
                    isOtherCarrier = true;
                    break;
                }
            }
            if (!isOtherCarrier) return idLogisticsCarrier.name;
        }
    }
    
    // Default to ID LOGISTICS if no other carrier matches.
    return 'ID LOGISTICS';
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
    
    const warehouse = (delivery.warehouse || 'Unknown').trim();
    const depot = WAREHOUSE_DEPOT_MAP[warehouse] || 'Unknown Depot';
    const carrier = getCarrierFromDriver(delivery.driver || '');

    return {
      ...delivery,
      date: delivery.date || 'N/A',
      status: delivery.status === 'Livré' ? 'Livré' : 'Non livré',
      taskId: String(delivery.taskId || 'N/A'),
      warehouse: warehouse,
      driver: (delivery.driver || 'Unknown Driver').trim(),
      tourId: String(delivery.tourId || 'N/A'),
      sequence: Number(delivery.sequence) || 0,
      delaySeconds: Number(delivery.delaySeconds) || 0,
      forcedNoContact: String(delivery.forcedNoContact).toLowerCase() === 'true',
      forcedOnSite: delivery.forcedOnSite === 'Yes' ? 'Yes' : 'No',
      completedBy: String(delivery.completedBy).toLowerCase() === 'web' ? 'web' : (String(delivery.completedBy).toLowerCase() === 'mobile' ? 'mobile' : 'unknown'),
      deliveryRating: delivery.deliveryRating ? Number(delivery.deliveryRating) : undefined,
      depot,
      carrier,
    } as Delivery;
  });
};

const createInitialStats = (): AggregatedStats => ({
    totalDeliveries: 0,
    successfulDeliveries: 0,
    failedDeliveries: 0,
    successRate: 0,
    totalDelay: 0,
    averageDelay: 0,
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
});

const updateStats = (stats: AggregatedStats, delivery: Delivery) => {
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
    stats.totalDelay += delivery.delaySeconds;

    if (delivery.delaySeconds <= 0) {
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
        stats.averageDelay = stats.totalDelay / stats.totalDeliveries;
        stats.punctualityRate = (stats.onTimeDeliveries / stats.totalDeliveries) * 100;
        stats.forcedNoContactRate = (stats.forcedNoContactCount / stats.totalDeliveries) * 100;
        stats.forcedOnSiteRate = (stats.forcedOnSiteCount / stats.totalDeliveries) * 100;
        stats.webCompletionRate = (stats.webCompletionCount / stats.totalDeliveries) * 100;
    }
    if (stats.ratedDeliveries > 0) {
        stats.averageRating = stats.totalRating / stats.ratedDeliveries;
    }
};

export const aggregateStats = (data: Delivery[], groupBy: keyof Delivery): StatsByEntity => {
  const statsByEntity: StatsByEntity = {};

  data.forEach((delivery) => {
    const entityName = delivery[groupBy] as string || 'Unknown';
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

export type RankingMetric = 'averageRating' | 'punctualityRate' | 'successRate' | 'averageDelay';
export type Ranking<T> = {
    top: T[],
    flop: T[]
}

export function getRankings<T extends {name: string} & AggregatedStats>(
    stats: T[],
    metric: RankingMetric,
    take: number = 3
): Ranking<T> {
    const sorted = [...stats].sort((a, b) => {
        // For averageDelay, lower is better. For all others, higher is better.
        if (metric === 'averageDelay') {
            return a[metric] - b[metric];
        }
        return b[metric] - a[metric];
    });

    const top = sorted.slice(0, take);
    const flop = sorted.slice(-take).reverse();

    return { top, flop };
}
