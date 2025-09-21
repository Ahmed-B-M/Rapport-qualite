
import { type Delivery, type AggregatedStats, type DriverPerformance, type PerformanceReportData, type KpiRankingsByEntity, type RankingEntity, type DepotReport, DeliveryStatus, ReportSectionData } from './definitions';
import { WAREHOUSE_DEPOT_MAP, CARRIERS } from '@/lib/constants';
import { parse, isValid, format } from 'date-fns';
import { analyzeSentiment, getTopComments } from './sentiment';

// --- Raw Data Processing ---

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
    if (name.endsWith('ID LOG')) return 'ID LOGISTICS';
    if (name.startsWith('STT')) return 'Sous traitants';
    for (const carrier of CARRIERS) {
        for (const suffix of carrier.suffixes) {
            if (suffix && name.endsWith(suffix)) return carrier.name;
        }
    }
    return 'Inconnu';
};

const convertExcelDate = (serial: number): Date => {
    const excelEpoch = new Date(1899, 11, 30);
    return new Date(excelEpoch.getTime() + serial * 24 * 60 * 60 * 1000);
};

export const processRawData = (rawData: any[]): Delivery[] => {
  return rawData.map((row) => {
    const delivery: Partial<Delivery> = {};
    for (const rawHeader in row) {
      const mappedKey = HEADER_MAPPING[rawHeader.trim()];
      if (mappedKey) {
        (delivery as any)[mappedKey] = row[rawHeader];
      }
    }

    let formattedDate: string = 'N/A';
    const dateValue: any = delivery.date;

    if (dateValue) {
        if (dateValue instanceof Date) {
            formattedDate = format(dateValue, 'yyyy-MM-dd');
        } else if (typeof dateValue === 'number' && dateValue > 1) {
            const convertedDate = convertExcelDate(dateValue);
            formattedDate = format(convertedDate, 'yyyy-MM-dd');
        } else if (typeof dateValue === 'string') {
            const parsedDate = parse(dateValue, 'dd/MM/yyyy', new Date());
            if (isValid(parsedDate)) {
                formattedDate = format(parsedDate, 'yyyy-MM-dd');
            } else {
                formattedDate = dateValue;
            }
        } else {
            formattedDate = String(dateValue);
        }
    }

    const warehouse = (delivery.warehouse || 'Inconnu').trim();
    const depot = WAREHOUSE_DEPOT_MAP[warehouse] || 'Dépôt Inconnu';
    const driverName = (delivery.driver || '').trim();
    
    const carrier = getCarrierFromDriver(driverName);
    const driver = driverName ? `${driverName} (${depot})` : `Livreur Inconnu (${depot})`;
    
    let status: DeliveryStatus;
    switch(row['Statut']) {
        case 'Livré': status = 'Livré'; break;
        case 'Non livré': status = 'Non livré'; break;
        case 'Partiellement livré': status = 'Partiellement livré'; break;
        default: status = 'En attente'; break;
    }

    const rating = delivery.deliveryRating ? Number(delivery.deliveryRating) : undefined;

    return {
      ...delivery,
      date: formattedDate,
      status: status,
      failureReason: status === 'Non livré' ? delivery.failureReason : undefined,
      taskId: String(delivery.taskId || 'N/A'),
      warehouse: warehouse,
      driver: driver,
      tourId: String(delivery.tourId || 'N/A'),
      sequence: Number(delivery.sequence) || 0,
      delaySeconds: Number(delivery.delaySeconds) || 0,
      forcedNoContact: String(delivery.forcedNoContact).toLowerCase() === 'true',
      forcedOnSite: delivery.forcedOnSite === 'Yes' ? 'Yes' : 'No',
      completedBy: String(delivery.completedBy).toLowerCase() === 'web' ? 'web' : 'mobile',
      deliveryRating: (rating && rating >= 1 && rating <= 5) ? rating : undefined,
      feedbackComment: delivery.feedbackComment ? String(delivery.feedbackComment) : undefined,
      depot,
      carrier,
    } as Delivery;
  });
};


// --- Existing KPI Functions (calculateAverageRating, etc.) ---
export function calculateAverageRating(data: Delivery[]): number | undefined {
  const ratedDeliveries = data.filter(d => d.deliveryRating !== null && d.deliveryRating !== undefined);
  if (ratedDeliveries.length === 0) return undefined;
  const totalRating = ratedDeliveries.reduce((sum, d) => sum + (d.deliveryRating || 0), 0);
  return totalRating / ratedDeliveries.length;
}

export function calculateAverageSentiment(data: Delivery[]): number {
    const commentedDeliveries = data.filter(d => d.feedbackComment && d.feedbackComment.trim().length > 5);
    if (commentedDeliveries.length === 0) return 0;

    const totalScore = commentedDeliveries.reduce((sum, d) => sum + analyzeSentiment(d.feedbackComment!, d.deliveryRating).score, 0);
    return totalScore / commentedDeliveries.length;
}

export function calculatePunctualityRate(data: Delivery[]): number {
  if (data.length === 0) return 0;
  const onTimeDeliveries = data.filter(d => d.delaySeconds !== null && d.delaySeconds >= -900 && d.delaySeconds <= 900);
  return (onTimeDeliveries.length / data.length) * 100;
}

export function calculateFailureRate(data: Delivery[]): number {
  if (data.length === 0) return 0;
  const failedDeliveries = data.filter(d => d.status === 'Non livré');
  return (failedDeliveries.length / data.length) * 100;
}

export function calculateForcedOnSiteRate(data: Delivery[]): number {
  if (data.length === 0) return 0;
  const forcedOnSiteDeliveries = data.filter(d => d.forcedOnSite === 'Yes');
  return (forcedOnSiteDeliveries.length / data.length) * 100;
}

export function calculateForcedNoContactRate(data: Delivery[]): number {
    if (data.length === 0) return 0;
    const forcedNoContactDeliveries = data.filter(d => d.forcedNoContact === true);
    return (forcedNoContactDeliveries.length / data.length) * 100;
}

export function calculateWebCompletionRate(data: Delivery[]): number {
  if (data.length === 0) return 0;
  const webCompletedDeliveries = data.filter(d => d.completedBy === 'web');
  return (webCompletedDeliveries.length / data.length) * 100;
}

export function calculateRatingRate(data: Delivery[]): number {
  if (data.length === 0) return 0;
  const ratedDeliveries = data.filter(d => d.deliveryRating !== null && d.deliveryRating !== undefined);
  return (ratedDeliveries.length / data.length) * 100;
}

// --- Existing Analysis Functions ---
export function getOverallStats(deliveries: Delivery[]): AggregatedStats {
    const closedDeliveries = deliveries.filter(d => 
        ['Livré', 'Non livré', 'Partiellement livré'].includes(d.status)
    );

    if (closedDeliveries.length === 0) {
        return { totalDeliveries: 0, successRate: 0, averageRating: undefined, punctualityRate: 0, ratingRate: 0, forcedOnSiteRate: 0, forcedNoContactRate: 0, webCompletionRate: 0, averageSentiment: 0 };
    }
    
    return {
        totalDeliveries: closedDeliveries.length,
        successRate: 100 - calculateFailureRate(closedDeliveries),
        averageRating: calculateAverageRating(closedDeliveries),
        punctualityRate: calculatePunctualityRate(closedDeliveries),
        ratingRate: calculateRatingRate(closedDeliveries),
        forcedOnSiteRate: calculateForcedOnSiteRate(closedDeliveries),
        forcedNoContactRate: calculateForcedNoContactRate(closedDeliveries),
        webCompletionRate: calculateWebCompletionRate(closedDeliveries),
        averageSentiment: calculateAverageSentiment(closedDeliveries),
    };
}

export const aggregateStatsByEntity = (data: Delivery[], groupBy: keyof Delivery): Record<string, AggregatedStats> => {
    const statsByEntity: Record<string, Delivery[]> = {};
    data.forEach((delivery) => {
      const entityName = (delivery[groupBy] as string) || 'Inconnu';
      if (!statsByEntity[entityName]) {
        statsByEntity[entityName] = [];
      }
      statsByEntity[entityName].push(delivery);
    });
    
    const result: Record<string, AggregatedStats> = {};
    for (const entityName in statsByEntity) {
      result[entityName] = getOverallStats(statsByEntity[entityName]);
    }
    
    return result;
};

export const getDriverPerformanceData = (data: Delivery[]): DriverPerformance[] => {
    const deliveriesByDriver: Record<string, Delivery[]> = {};
    data.forEach(delivery => {
        if (!deliveriesByDriver[delivery.driver]) {
            deliveriesByDriver[delivery.driver] = [];
        }
        deliveriesByDriver[delivery.driver].push(delivery);
    });
    return Object.entries(deliveriesByDriver).map(([driverName, deliveries]) => {
        const stats = getOverallStats(deliveries);
        const depot = deliveries[0]?.depot || 'Inconnu';
        const carrier = deliveries[0]?.carrier || 'Inconnu';
        return { driver: driverName, depot, carrier, ...stats };
    });
};

// --- New Performance Report Generation Logic ---

const getKpiRankings = (performances: (DriverPerformance | (AggregatedStats & { name: string }))[], kpi: keyof AggregatedStats, higherIsBetter: boolean): { top: RankingEntity[], flop: RankingEntity[] } => {
    const sorted = [...performances]
        .filter(p => p.totalDeliveries > 10 && p[kpi] !== undefined) // Filter out entities with low delivery counts or undefined KPI
        .sort((a, b) => {
            const valA = (a[kpi] as number);
            const valB = (b[kpi] as number);
            return higherIsBetter ? valB - valA : valA - valB;
        });
    
    const top = sorted.slice(0, 3).map(p => ({ name: 'name' in p ? p.name : ('driver' in p ? p.driver : ''), value: (p[kpi] as number), totalDeliveries: p.totalDeliveries }));
    const flop = sorted.slice(-3).reverse().map(p => ({ name: 'name' in p ? p.name : ('driver' in p ? p.driver : ''), value: (p[kpi] as number), totalDeliveries: p.totalDeliveries }));
    return { top, flop };
};

const getReportSectionData = (data: Delivery[]): ReportSectionData => {
    const driverPerformances = getDriverPerformanceData(data);
    
    const deliveriesByCarrier: { [key: string]: Delivery[] } = {};
    data.forEach(d => {
        if (!deliveriesByCarrier[d.carrier]) deliveriesByCarrier[d.carrier] = [];
        deliveriesByCarrier[d.carrier].push(d);
    });
    const carrierPerformances = Object.entries(deliveriesByCarrier).map(([name, deliveries]) => ({ name, ...getOverallStats(deliveries) }));

    const kpiRankings: KpiRankingsByEntity = {
        drivers: {
            averageRating: getKpiRankings(driverPerformances, 'averageRating', true),
            averageSentiment: getKpiRankings(driverPerformances, 'averageSentiment', true),
            punctualityRate: getKpiRankings(driverPerformances, 'punctualityRate', true),
            successRate: getKpiRankings(driverPerformances, 'successRate', true),
        },
        carriers: {
            averageRating: getKpiRankings(carrierPerformances, 'averageRating', true),
            averageSentiment: getKpiRankings(carrierPerformances, 'averageSentiment', true),
            punctualityRate: getKpiRankings(carrierPerformances, 'punctualityRate', true),
            successRate: getKpiRankings(carrierPerformances, 'successRate', true),
        }
    };
    
    return {
        stats: getOverallStats(data),
        kpiRankings: kpiRankings,
        topComments: getTopComments(data, 'positive', 3),
        flopComments: getTopComments(data, 'negative', 3)
    };
};


export const generatePerformanceReport = (data: Delivery[]): PerformanceReportData => {
    const deliveriesByDepot: { [key: string]: Delivery[] } = {};
    data.forEach(d => {
        if (!deliveriesByDepot[d.depot]) deliveriesByDepot[d.depot] = [];
        deliveriesByDepot[d.depot].push(d);
    });

    const depotReports: DepotReport[] = Object.entries(deliveriesByDepot).map(([depotName, depotData]) => {
        return {
            name: depotName,
            ...getReportSectionData(depotData)
        };
    });

    return {
        global: getReportSectionData(data),
        depots: depotReports.sort((a, b) => b.stats.totalDeliveries - a.stats.totalDeliveries),
    };
};

// --- Filtering Functions ---

export const filterDataByPeriod = (data: Delivery[], period: string, previous = false): Delivery[] => {
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date(now);
    switch (period) {
        case '1d': startDate.setDate(now.getDate() - 1); break;
        case '7d': startDate.setDate(now.getDate() - 7); break;
        case '30d': startDate.setDate(now.getDate() - 30); break;
        default: return data;
    }
    if (previous) {
        const diff = endDate.getTime() - startDate.getTime();
        endDate = new Date(startDate.getTime());
        startDate = new Date(endDate.getTime() - diff);
    }
    return data.filter(d => {
        const deliveryDate = new Date(d.date);
        return deliveryDate >= startDate && deliveryDate < endDate;
    });
};

export const filterDataByDepot = (data: Delivery[], depot: string): Delivery[] => {
    if (depot === 'all') return data;
    return data.filter(d => d.depot === depot);
};
