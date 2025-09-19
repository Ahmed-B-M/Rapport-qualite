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
    const driverSuffix = driverName.trim().split(' ').pop() || '';
    for (const carrier of CARRIERS) {
        if (carrier.suffixes.includes(driverSuffix)) {
            return carrier.name;
        }
    }
    // Handle cases where there is no suffix, could be ID LOGISTICS or Unknown
    if (!isNaN(parseInt(driverSuffix))) return 'Unknown Carrier';
    
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
      depot,
      carrier,
    } as Delivery;
  });
};

const_createInitialStats = (): AggregatedStats => ({
    totalDeliveries: 0,
    successfulDeliveries: 0,
    failedDeliveries: 0,
    successRate: 0,
    totalDelay: 0,
    averageDelay: 0,
    failureReasons: {},
});

const_updateStats = (stats: AggregatedStats, delivery: Delivery) => {
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
};

const_finalizeStats = (stats: AggregatedStats) => {
    if (stats.totalDeliveries > 0) {
        stats.successRate = (stats.successfulDeliveries / stats.totalDeliveries) * 100;
        stats.averageDelay = stats.totalDelay / stats.totalDeliveries;
    }
};

export const aggregateStats = (data: Delivery[], groupBy: keyof Delivery): StatsByEntity => {
  const statsByEntity: StatsByEntity = {};

  data.forEach((delivery) => {
    const entityName = delivery[groupBy] as string || 'Unknown';
    if (!statsByEntity[entityName]) {
      statsByEntity[entityName] = const_createInitialStats();
    }
    const_updateStats(statsByEntity[entityName], delivery);
  });
  
  Object.values(statsByEntity).forEach(const_finalizeStats);

  return statsByEntity;
};

export const getOverallStats = (data: Delivery[]): AggregatedStats => {
    const overallStats = const_createInitialStats();
    data.forEach(delivery => const_updateStats(overallStats, delivery));
    const_finalizeStats(overallStats);
    return overallStats;
}
