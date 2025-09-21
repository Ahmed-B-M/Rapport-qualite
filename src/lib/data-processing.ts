
import { type Delivery, type AggregatedStats } from './definitions';
import { WAREHOUSE_DEPOT_MAP, CARRIERS } from './constants';
import { parse, isValid, format } from 'date-fns';
import {
  getOverallStats as getAnalysisOverallStats,
} from './analysis';


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
    
    if (!driverName) {
        return {
          ...delivery,
          date: formattedDate,
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
    
    return {
      ...delivery,
      date: formattedDate,
      status: row['Statut'] === 'Livré' ? 'Livré' : 'Non livré',
      failureReason: row['Statut'] === 'Non livré' ? delivery.failureReason : undefined,
      taskId: String(delivery.taskId || 'N/A'),
      warehouse: warehouse,
      driver: driver,
      tourId: String(delivery.tourId || 'N/A'),
      sequence: Number(delivery.sequence) || 0,
      delaySeconds: Number(delivery.delaySeconds) || 0,
      forcedNoContact: String(delivery.forcedNoContact).toLowerCase() === 'true',
      forcedOnSite: delivery.forcedOnSite === 'Yes' ? 'Yes' : 'No',
      completedBy: String(delivery.completedBy).toLowerCase() === 'web' ? 'web' : 'mobile',
      deliveryRating: delivery.deliveryRating ? Number(delivery.deliveryRating) : undefined,
      feedbackComment: delivery.feedbackComment ? String(delivery.feedbackComment) : undefined,
      depot,
      carrier,
    } as Delivery;
  });
};

export const getOverallStats = (deliveries: Delivery[]): AggregatedStats => {
    return getAnalysisOverallStats(deliveries);
}


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

export const processGlobalData = (deliveries: Delivery[]): AggregatedStats & { failedDeliveries: number; totalDeliveries: number; } => {
    const stats = getOverallStats(deliveries);
    const failedDeliveries = deliveries.filter(d => d.status === 'Non livré').length;
    return {
        ...stats,
        failedDeliveries,
        totalDeliveries: deliveries.length,
    };
};
