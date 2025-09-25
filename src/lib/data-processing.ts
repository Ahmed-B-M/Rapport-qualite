
import { type Livraison, type StatistiquesAgregees, type ClassementMetrique } from './definitions';
import { CARTE_ENTREPOT_DEPOT, TRANSPORTEURS } from './constants';
import { parse, isValid, format } from 'date-fns';
import {
  getStatistiquesGlobales as getAnalysisOverallStats,
} from './analysis';


const HEADER_MAPPING: Record<string, keyof Livraison> = {
  'Date': 'date',
  'Statut': 'statut',
  'Raison d’échec de livraison': 'raisonEchec',
  'ID de la tâche': 'idTache',
  'Entrepôt': 'entrepot',
  'Livreur': 'chauffeur',
  'Tournée': 'idTournee',
  'Séquence': 'sequence',
  'Retard (s)': 'retardSecondes',
  'Qu\'avez vous pensé de la livraison de votre commande?': 'commentaireRetour',
  'Notez votre livraison': 'noteLivraison',
  'Sans contact forcé': 'forceSansContact',
  'Raison de confirmation sans contact': 'raisonSansContact',
  'Sur place forcé': 'forceSurSite',
  'Complété par': 'terminePar',
};

const getCarrierFromDriver = (driverName: string): string => {
    if (!driverName || driverName.trim() === '') return 'Inconnu';
    const name = driverName.trim().toUpperCase();
    if (name.endsWith('ID LOG')) return 'ID LOGISTICS';
    if (name.startsWith('STT')) return 'Sous traitants';
    for (const carrier of TRANSPORTEURS) {
        for (const suffix of carrier.suffixes) {
            if (suffix && name.endsWith(suffix)) return carrier.nom;
        }
    }
    return 'Inconnu';
};

const convertExcelDate = (serial: number): Date => {
    const excelEpoch = new Date(1899, 11, 30);
    return new Date(excelEpoch.getTime() + serial * 24 * 60 * 60 * 1000);
};

export const processRawData = (rawData: any[]): Livraison[] => {
  return rawData.map((row) => {
    const delivery: Partial<Livraison> = {};
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

    const warehouse = (delivery.entrepot || 'Inconnu').trim();
    const depot = CARTE_ENTREPOT_DEPOT[warehouse] || 'Dépôt Inconnu';
    const driverName = (delivery.chauffeur || '').trim();
    
    if (!driverName) {
        return {
          ...delivery,
          date: formattedDate,
          statut: 'En attente',
          idTache: String(delivery.idTache || 'N/A'),
          entrepot: warehouse,
          chauffeur: 'Livreur Inconnu',
          idTournee: String(delivery.idTournee || 'N/A'),
          sequence: Number(delivery.sequence) || 0,
          retardSecondes: Number(delivery.retardSecondes) || 0,
          forceSansContact: false,
          forceSurSite: 'Non',
          terminePar: 'inconnu',
          depot,
          transporteur: 'Inconnu',
        } as Livraison;
    }
    
    const carrier = getCarrierFromDriver(driverName);
    const driver = driverName ? `${driverName} (${depot})` : `Livreur Inconnu (${depot})`;
    
    return {
      ...delivery,
      date: formattedDate,
      statut: row['Statut'] === 'Livré' ? 'Livré' : 'Non livré',
      raisonEchec: row['Statut'] === 'Non livré' ? delivery.raisonEchec : undefined,
      idTache: String(delivery.idTache || 'N/A'),
      entrepot: warehouse,
      chauffeur: driver,
      idTournee: String(delivery.idTournee || 'N/A'),
      sequence: Number(delivery.sequence) || 0,
      retardSecondes: Number(delivery.retardSecondes) || 0,
      forceSansContact: String(delivery.forceSansContact).toLowerCase() === 'true',
      forceSurSite: delivery.forceSurSite === 'Oui' ? 'Oui' : 'Non',
      terminePar: String(delivery.terminePar).toLowerCase() === 'web' ? 'web' : 'mobile',
      noteLivraison: delivery.noteLivraison ? Number(delivery.noteLivraison) : undefined,
      commentaireRetour: delivery.commentaireRetour ? String(delivery.commentaireRetour) : undefined,
      depot,
      transporteur: carrier,
    } as Livraison;
  });
};

export const getOverallStats = (deliveries: Livraison[]): StatistiquesAgregees => {
    return getAnalysisOverallStats(deliveries);
}


export const filterDataByPeriod = (data: Livraison[], period: string, previous = false): Livraison[] => {
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

export const filterDataByDepot = (data: Livraison[], depot: string): Livraison[] => {
    if (depot === 'all') return data;
    return data.filter(d => d.depot === depot);
};

export const processGlobalData = (deliveries: Livraison[]): StatistiquesAgregees & { livraisonsRatees: number; totalLivraisons: number; } => {
    const stats = getOverallStats(deliveries);
    const failedDeliveries = deliveries.filter(d => d.statut === 'Non livré').length;
    return {
        ...stats,
        livraisonsRatees: failedDeliveries,
        totalLivraisons: deliveries.length,
    };
};
