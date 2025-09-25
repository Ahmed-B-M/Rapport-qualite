
import {
  type Livraison, type StatistiquesAgregees, type PerformanceChauffeur,
  type DonneesRapportPerformance, type ClassementsKpiParEntite, type EntiteClassement,
  type RapportDepot, type StatutLivraison, type DonneesSectionRapport,
  type EntiteClassementNoteChauffeur,
  type CategorieProbleme, type CommentaireCategorise, type ResultatsCategorisation, CATEGORIES_PROBLEMES, ChauffeurProbleme, SerieTemporelle, PointSerieTemporelle
} from './definitions';
import { CARTE_ENTREPOT_DEPOT, TRANSPORTEURS } from '@/lib/constants';
import { parse, isValid, format } from 'date-fns';
import { analyzeSentiment, getTopComments } from './sentiment';

// --- Configuration ---

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

// --- Fonctions Utilitaires ---

const getTransporteurFromChauffeur = (nomChauffeur: string, depot: string): string => {
  if (!nomChauffeur || !nomChauffeur.trim()) return 'Inconnu';
  const nom = nomChauffeur.trim().toUpperCase();

  if (depot === 'Vitry' && (nom.endsWith('6') || nom.endsWith('7'))) {
    return 'GPL';
  }

  if (nom.endsWith('ID LOG')) return 'ID LOGISTICS';
  if (nom.startsWith('STT')) return 'Sous traitants';

  for (const transporteur of TRANSPORTEURS) {
    if (transporteur.suffixes.some(suffixe => suffixe && nom.endsWith(suffixe))) {
      return transporteur.nom;
    }
  }
  return 'Inconnu';
};

const convertirDateExcel = (serial: number): Date => {
  const excelEpoch = new Date(1899, 11, 30);
  return new Date(excelEpoch.getTime() + serial * 24 * 60 * 60 * 1000);
};

const formaterDate = (valeurDate: any): string => {
  if (!valeurDate) return 'N/A';
  if (valeurDate instanceof Date) return format(valeurDate, 'yyyy-MM-dd');
  if (typeof valeurDate === 'number' && valeurDate > 1) {
    return format(convertirDateExcel(valeurDate), 'yyyy-MM-dd');
  }
  if (typeof valeurDate === 'string') {
    const dateAnalysee = parse(valeurDate, 'dd/MM/yyyy', new Date());
    return isValid(dateAnalysee) ? format(dateAnalysee, 'yyyy-MM-dd') : valeurDate;
  }
  return String(valeurDate);
};

const getStatutLivraison = (statutBrut: string): StatutLivraison => {
  switch (statutBrut) {
    case 'Livré': return 'Livré';
    case 'Non livré': return 'Non livré';
    case 'Partiellement livré': return 'Partiellement livré';
    default: return 'En attente';
  }
};

const getTerminePar = (termineParBrut: any): 'web' | 'mobile' | 'inconnu' => {
  const termineParStr = String(termineParBrut).toLowerCase();
  if (termineParStr.includes('web')) return 'web';
  if (termineParStr.includes('mobile')) return 'mobile';
  return 'inconnu';
};

// --- Traitement des Données Brutes ---

export const traiterDonneesBrutes = (donneesBrutes: any[]): Livraison[] => {
  return donneesBrutes.map((ligne) => {
    const livraison: Partial<Livraison> = {};
    for (const enTeteBrut in ligne) {
      const cleMappee = HEADER_MAPPING[enTeteBrut.trim()];
      if (cleMappee) {
        (livraison as any)[cleMappee] = ligne[enTeteBrut];
      }
    }

    const entrepot = (livraison.entrepot || 'Inconnu').trim();
    const depot = CARTE_ENTREPOT_DEPOT[entrepot] || 'Dépôt Inconnu';
    const nomChauffeur = (livraison.chauffeur || '').trim();
    const transporteur = getTransporteurFromChauffeur(nomChauffeur, depot);
    const chauffeur = nomChauffeur ? `${nomChauffeur} (${depot === 'Magasin' ? entrepot : depot})` : `Livreur Inconnu (${depot})`;

    const statut = getStatutLivraison(ligne['Statut']);
    const note = Number(livraison.noteLivraison);

    return {
      ...livraison,
      date: formaterDate(livraison.date),
      statut,
      raisonEchec: statut === 'Non livré' ? livraison.raisonEchec : undefined,
      idTache: String(livraison.idTache || 'N/A'),
      entrepot,
      chauffeur,
      idTournee: String(livraison.idTournee || 'N/A'),
      sequence: Number(livraison.sequence) || 0,
      retardSecondes: Number(livraison.retardSecondes) || 0,
      forceSansContact: String(livraison.forceSansContact).toLowerCase() === 'true',
      forceSurSite: String(livraison.forceSurSite).trim().toLowerCase() === 'yes' ? 'Oui' : 'Non',
      terminePar: getTerminePar(livraison.terminePar),
      noteLivraison: (note >= 1 && note <= 5) ? note : undefined,
      commentaireRetour: livraison.commentaireRetour ? String(livraison.commentaireRetour) : undefined,
      depot,
      transporteur,
    } as Livraison;
  });
};

// --- Calcul des KPI ---

const calculerNoteMoyenne = (donnees: Livraison[]): { moyenne?: number, nombre: number } => {
  const livraisonsNotees = donnees.filter(l => l.noteLivraison != null);
  const nombre = livraisonsNotees.length;
  if (nombre === 0) return { moyenne: undefined, nombre: 0 };
  const totalNotes = livraisonsNotees.reduce((sum, l) => sum + (l.noteLivraison || 0), 0);
  return { moyenne: totalNotes / nombre, nombre };
}

const calculerSentimentMoyen = (donnees: Livraison[]): number | undefined => {
  const livraisonsCommentees = donnees.filter(l => l.commentaireRetour && l.commentaireRetour.trim().length > 5);
  if (livraisonsCommentees.length === 0) return undefined;
  const scoreTotal = livraisonsCommentees.reduce((sum, l) => sum + analyzeSentiment(l.commentaireRetour!, l.noteLivraison).score, 0);
  return scoreTotal / livraisonsCommentees.length;
}

export const getStatistiquesGlobales = (livraisons: Livraison[]): StatistiquesAgregees => {
  const livraisonsCloturees = livraisons.filter(l => ['Livré', 'Non livré', 'Partiellement livré'].includes(l.statut));
  const totalLivraisons = livraisonsCloturees.length;

  if (totalLivraisons === 0) {
    return {
      totalLivraisons: 0, tauxReussite: 0, noteMoyenne: undefined, tauxPonctualite: 0, tauxNotation: 0,
      tauxForceSurSite: 0, tauxForceSansContact: 0, tauxCompletionWeb: 0, sentimentMoyen: undefined, nombreNotes: 0,
      nombreLivraisonsReussies: 0, nombreRetards: 0, nombreForceSurSite: 0, nombreForceSansContact: 0, nombreCompletionWeb: 0
    };
  }

  const { moyenne: noteMoyenne, nombre: nombreNotes } = calculerNoteMoyenne(livraisonsCloturees);
  const livraisonsReussies = livraisonsCloturees.filter(l => l.statut === 'Livré').length;
  const livraisonsAPoint = livraisonsCloturees.filter(l => l.retardSecondes != null && l.retardSecondes >= -900 && l.retardSecondes <= 900).length;
  const nombreForceSurSite = livraisonsCloturees.filter(l => l.forceSurSite === 'Oui').length;
  const nombreForceSansContact = livraisonsCloturees.filter(l => l.forceSansContact).length;
  const nombreCompletionWeb = livraisonsCloturees.filter(l => l.terminePar === 'web').length;

  return {
    totalLivraisons,
    tauxReussite: (livraisonsReussies / totalLivraisons) * 100,
    noteMoyenne,
    tauxPonctualite: (livraisonsAPoint / totalLivraisons) * 100,
    tauxNotation: (nombreNotes / totalLivraisons) * 100,
    tauxForceSurSite: (nombreForceSurSite / totalLivraisons) * 100,
    tauxForceSansContact: (nombreForceSansContact / totalLivraisons) * 100,
    tauxCompletionWeb: (nombreCompletionWeb / totalLivraisons) * 100,
    sentimentMoyen: calculerSentimentMoyen(livraisonsCloturees),
    nombreNotes,
    nombreLivraisonsReussies: livraisonsReussies,
    nombreRetards: totalLivraisons - livraisonsAPoint,
    nombreForceSurSite,
    nombreForceSansContact,
    nombreCompletionWeb,
  };
}

// --- Agrégation et Regroupement ---

const groupBy = <T>(array: T[], key: keyof T | { get: (item: T) => string }): Record<string, T[]> => {
  return array.reduce((result, currentItem) => {
    const groupKey = typeof key === 'object' ? key.get(currentItem) : (currentItem[key as keyof T] as string) || 'Inconnu';
    (result[groupKey] = result[groupKey] || []).push(currentItem);
    return result;
  }, {} as Record<string, T[]>);
};

export const agregerStatistiquesParEntite = (donnees: Livraison[], groupKey: keyof Livraison): Record<string, StatistiquesAgregees> => {
  const groupes = groupBy(donnees, groupKey);
  const resultat: Record<string, StatistiquesAgregees> = {};
  for (const nomEntite in groupes) {
    resultat[nomEntite] = getStatistiquesGlobales(groupes[nomEntite]);
  }
  return resultat;
};

export const getDonneesPerformanceChauffeur = (donnees: Livraison[] = []): PerformanceChauffeur[] => {
  const livraisonsParChauffeur = groupBy(donnees, 'chauffeur');
  return Object.entries(livraisonsParChauffeur).map(([nomChauffeur, livraisons]) => {
    const { depot = 'Inconnu', transporteur = 'Inconnu', entrepot = 'Inconnu' } = livraisons[0] || {};
    return {
      chauffeur: nomChauffeur,
      depot,
      transporteur,
      entrepot,
      ...getStatistiquesGlobales(livraisons)
    };
  });
};


// --- Analyse Sémantique ---

const MOTS_CLES_CATEGORIES: { categorie: CategorieProbleme, motsCles: string[] }[] = [
    { categorie: "attitude livreur", motsCles: ["pas aimable", "agressif", "impoli", "désagréable", "pas bonjour", "comportement", "odieux", "odieuse", "incorrecte", "mal poli", "catastrophe", "horrible", "pas serviable", "agressive", "pressé", "impatient", "sur le trottoir", "expéditif", "fait le signe pour avoir la pièce", "pas professionnel", "pas très aimable", "débrouillez vous", "davantage d'aide", "mauvaise foi", "laisser les sacs", "devant la maison", "mauvaise adresse", "porter les sacs", "irrespectueux", "arrogant", "énervés", "agacé", "livrées à l'extérieur", "brutal", "insultant", "pas descendu", "livré à 400m", "trompent de rue", "jetant les sacs", "pas agréable", "contrarié", "pas poli", "au téléphone"] },
    { categorie: "produit(s) cassé(s)", motsCles: ["casse", "cassé", "abimé", "abîmé", "endommagé", "ecrasé", "écrasé", "produit ouvert", "huevos rotos", "état lamentable", "bouteille ouverte", "trempés", "mal préparée", "mal preparée", "endommagés", "produit éclaté", "crème partout", "n'importe comment", "l'eau dans les sacs", "produits endommages"] },
    { categorie: "produits manquants", motsCles: ["manquant", "manque", "oubli", "pas tout", "pas reçu", "incomplet", "pas eu", "produit manquant", "sac qui ne nous a pas été livré", "manquait", "pris", "mauvaise commande", "problèmes avec des produits dans le sac", "pas voulu reprendre", "non livrés", "pas livré", "articles"] },
    { categorie: "ponctualité", motsCles: ["retard", "tard", "tôt", "en avance", "pas à l'heure", "attente", "attendu", "jamais arrivé", "pas prévenu", "pas prévenue", "non livrée", "ponctualité", "avant le créneau", "non effectuée", "après le créneau", "respecter l'horaire", "pas encore été livrée"] },
    { categorie: "rupture chaine de froid", motsCles: ["chaud", "pas frais", "pas froid", "congelé", "décongelé", "chaîne du froid", "frais"] },
    { categorie: "non pertinent", motsCles: ["magasin", "stock", "site", "application", "preparateur", "préparateur", "carrefour", "leclerc", "intermarche", "auchan"] },
    { categorie: "autre", motsCles: [] },
];


const categoriserCommentaire = (commentaire: string): CategorieProbleme => {
  const texte = commentaire.toLowerCase();
  for (const { categorie, motsCles } of MOTS_CLES_CATEGORIES) {
    if (motsCles.some(mot => texte.includes(mot))) {
      return categorie;
    }
  }
  return "autre";
};

export const analyserCommentaires = (commentaires: string[]): Record<string, { count: number }> => {
    const analyse: Record<string, { count: number }> = {};
    CATEGORIES_PROBLEMES.forEach(cat => {
        analyse[cat] = { count: 0 };
    });

    commentaires.forEach(commentaire => {
        const categorie = categoriserCommentaire(commentaire);
        analyse[categorie].count++;
    });

    return analyse;
};

export const getCategorizedNegativeComments = (livraisons: Livraison[]): Record<string, CommentaireCategorise[]> => {
    const commentairesNegatifs = livraisons.filter(l => 
        l.commentaireRetour && 
        l.commentaireRetour.trim().length > 5 &&
        analyzeSentiment(l.commentaireRetour, l.noteLivraison).score < 5
    );

    const categorizedComments = commentairesNegatifs.map(l => ({
        categorie: categoriserCommentaire(l.commentaireRetour!),
        commentaire: l.commentaireRetour!,
        chauffeur: l.chauffeur,
        depot: l.depot
    }));
    
    const groupedComments: Record<string, CommentaireCategorise[]> = {};
    
    CATEGORIES_PROBLEMES.forEach(cat => {
        groupedComments[cat] = [];
    });

    categorizedComments.forEach(comment => {
        groupedComments[comment.categorie].push(comment);
    });

    return groupedComments;
};


const analyserCommentairesNegatifs = (livraisons: Livraison[]): ResultatsCategorisation => {
  const commentairesNegatifs = livraisons.filter(l =>
    l.commentaireRetour &&
    l.commentaireRetour.trim().length > 5 &&
    analyzeSentiment(l.commentaireRetour, l.noteLivraison).score < 5
  );

  const commentairesCategorises = commentairesNegatifs.map(l => ({
    categorie: categoriserCommentaire(l.commentaireRetour!),
    commentaire: l.commentaireRetour!,
    chauffeur: l.chauffeur
  }));

  const resultats: ResultatsCategorisation = {
    "attitude livreur": [], "produit(s) cassé(s)": [], "produits manquants": [], "ponctualité": [],
    "rupture chaine de froid": [], "non pertinent": [], "autre": []
  };

  CATEGORIES_PROBLEMES.forEach(cat => {
    const commentairesDeLaCategorie = commentairesCategorises.filter(c => c.categorie === cat);
    const chauffeursConcernes: Record<string, { recurrence: number, exemplesCommentaires: Set<string> }> = {};

    commentairesDeLaCategorie.forEach(({ chauffeur, commentaire }) => {
      if (!chauffeursConcernes[chauffeur]) {
        chauffeursConcernes[chauffeur] = { recurrence: 0, exemplesCommentaires: new Set() };
      }
      chauffeursConcernes[chauffeur].recurrence++;
      chauffeursConcernes[chauffeur].exemplesCommentaires.add(commentaire);
    });

    resultats[cat] = Object.entries(chauffeursConcernes)
      .map(([nom, data]) => ({ nom, recurrence: data.recurrence, exemplesCommentaires: Array.from(data.exemplesCommentaires) }))
      .sort((a, b) => b.recurrence - a.recurrence);
  });

  return resultats;
};


// --- Génération de Rapport ---

const getClassementsKpi = <T extends { totalLivraisons: number; nombreNotes: number; nom?: string; chauffeur?: string }>(
  performances: T[],
  kpi: keyof T,
  meilleurSiEleve: boolean
): { top: EntiteClassement[], flop: EntiteClassement[] } => {
  const tries = [...performances]
    .filter(p => p.totalLivraisons > 10 && p[kpi] != null && p.nombreNotes > 0)
    .sort((a, b) => {
      const valA = a[kpi] as number;
      const valB = b[kpi] as number;
      return meilleurSiEleve ? valB - valA : valA - valB;
    });

  const mapper = (p: T) => ({
    nom: p.nom || p.chauffeur || 'Inconnu',
    valeur: p[kpi] as number,
    totalLivraisons: p.totalLivraisons
  });

  return {
    top: tries.slice(0, 3).map(mapper),
    flop: tries.slice(-3).reverse().map(mapper)
  };
};

const getClassementsNotesChauffeur = (
  donnees: Livraison[],
  performancesChauffeur: PerformanceChauffeur[]
): { top: EntiteClassementNoteChauffeur[], flop: EntiteClassementNoteChauffeur[] } => {
  const notesParChauffeur: Record<string, { positif: number, negatif: number }> = {};
  donnees.forEach(({ chauffeur, noteLivraison }) => {
    if (noteLivraison) {
      notesParChauffeur[chauffeur] = notesParChauffeur[chauffeur] || { positif: 0, negatif: 0 };
      if (noteLivraison >= 4) notesParChauffeur[chauffeur].positif++;
      else if (noteLivraison <= 2) notesParChauffeur[chauffeur].negatif++;
    }
  });

  const performancesMap = new Map(performancesChauffeur.map(p => [p.chauffeur, p.noteMoyenne]));

  const mapper = (type: 'positif' | 'negatif') => ([nom, comptes]: [string, { positif: number, negatif: number }]) => ({
    nom,
    nombre: comptes[type],
    noteMoyenne: performancesMap.get(nom)
  });

  const trierEtPrendre = (type: 'positif' | 'negatif') => Object.entries(notesParChauffeur)
    .map(mapper(type))
    .filter(c => c.nombre > 0)
    .sort((a, b) => b.nombre - a.nombre)
    .slice(0, 3);

  return {
    top: trierEtPrendre('positif'),
    flop: trierEtPrendre('negatif')
  };
};


const getDonneesSectionRapport = (donnees: Livraison[], groupingKey: 'depot' | 'transporteur'): DonneesSectionRapport => {
  const performancesChauffeur = getDonneesPerformanceChauffeur(donnees);

  const autreCle = groupingKey === 'depot' ? 'transporteur' : 'depot';
  const livraisonsParAutreEntite = groupBy(donnees, autreCle);
  const performancesAutreEntite = Object.entries(livraisonsParAutreEntite).map(([nom, livraisons]) => ({
    nom, ...getStatistiquesGlobales(livraisons)
  }));

  const classementsKpi: ClassementsKpiParEntite = {
    chauffeurs: {
      noteMoyenne: getClassementsKpi(performancesChauffeur, 'noteMoyenne', true),
      sentimentMoyen: getClassementsKpi(performancesChauffeur, 'sentimentMoyen', true),
      tauxPonctualite: getClassementsKpi(performancesChauffeur, 'tauxPonctualite', true),
      tauxReussite: getClassementsKpi(performancesChauffeur, 'tauxReussite', true),
    },
    transporteurs: { // This key is semantic, it can be depots or transporters based on groupingKey
      noteMoyenne: getClassementsKpi(performancesAutreEntite, 'noteMoyenne', true),
      sentimentMoyen: getClassementsKpi(performancesAutreEntite, 'sentimentMoyen', true),
      tauxPonctualite: getClassementsKpi(performancesAutreEntite, 'tauxPonctualite', true),
      tauxReussite: getClassementsKpi(performancesAutreEntite, 'tauxReussite', true),
    }
  };

  const classementsNotesChauffeur = getClassementsNotesChauffeur(donnees, performancesChauffeur);

  const commentairesNegatifs = donnees.filter(l =>
    l.commentaireRetour && l.commentaireRetour.trim().length > 5 &&
    analyzeSentiment(l.commentaireRetour, l.noteLivraison).score < 5
  );

  return {
    statistiques: getStatistiquesGlobales(donnees),
    classementsKpi,
    meilleursCommentaires: getTopComments(donnees, 'positif', 3),
    piresCommentaires: getTopComments(donnees, 'négatif', 3),
    chauffeursMieuxNotes: classementsNotesChauffeur.top,
    chauffeursMoinsBienNotes: classementsNotesChauffeur.flop,
    resultatsCategorisation: analyserCommentairesNegatifs(donnees),
    totalCommentairesNegatifs: commentairesNegatifs.length,
  };
};

export const genererRapportPerformance = (donnees: Livraison[], groupingKey: 'depot' | 'transporteur'): DonneesRapportPerformance => {
  const donneesRapportGlobal = getDonneesSectionRapport(donnees, groupingKey);

  const getGroupKey = (l: Livraison) => {
    if (groupingKey === 'depot' && l.depot === 'Magasin') {
      return `Magasin_${l.entrepot}`;
    }
    return l[groupingKey];
  };

  const livraisonsParEntite = groupBy(donnees, { get: getGroupKey });


  const rapportsEntite: RapportDepot[] = Object.values(livraisonsParEntite).map((donneesEntite) => {
    const premierLivraison = donneesEntite[0];
    const nom = groupingKey === 'depot' ? premierLivraison.depot : premierLivraison.transporteur;
    const entrepot = (groupingKey === 'depot' && premierLivraison.depot === 'Magasin') ? premierLivraison.entrepot : undefined;

    return {
      nom,
      entrepot,
      ...getDonneesSectionRapport(donneesEntite, groupingKey)
    };
  });

  return {
    global: donneesRapportGlobal,
    depots: rapportsEntite.sort((a, b) => a.nom.localeCompare(b.nom)),
  };
};


// --- Fonctions de Filtrage et de Séries Temporelles ---

export const filtrerDonneesParPeriode = (donnees: Livraison[], periode: string, precedent = false): Livraison[] => {
  const maintenant = new Date();
  let dateDebut = new Date();
  let dateFin = new Date(maintenant);

  switch (periode) {
    case '1d': dateDebut.setDate(maintenant.getDate() - 1); break;
    case '7d': dateDebut.setDate(maintenant.getDate() - 7); break;
    case '30d': dateDebut.setDate(maintenant.getDate() - 30); break;
    default: return donnees;
  }

  if (precedent) {
    const diff = dateFin.getTime() - dateDebut.getTime();
    dateFin = new Date(dateDebut.getTime());
    dateDebut = new Date(dateFin.getTime() - diff);
  }

  return donnees.filter(l => {
    const dateLivraison = new Date(l.date);
    return dateLivraison >= dateDebut && dateLivraison < dateFin;
  });
};

export const filtrerDonneesParDepot = (donnees: Livraison[], depot: string): Livraison[] => {
  if (depot === 'all') return donnees;
  return donnees.filter(l => l.depot === depot);
};


export const getDonneesSerieTemporelle = (livraisons: Livraison[]): SerieTemporelle => {
    const livraisonsParJour = groupBy(livraisons.map(l => ({ ...l, dateOnly: l.date.split('T')[0] })), 'dateOnly');

    const domaines = {
        tauxReussite: { min: 100, max: 0 },
        noteMoyenne: { min: 5, max: 1 },
        tauxPonctualite: { min: 100, max: 0 }
    };

    const points = Object.entries(livraisonsParJour).map(([date, livraisonsDuJour]) => {
        const stats = getStatistiquesGlobales(livraisonsDuJour);
        
        domaines.tauxReussite.min = Math.min(domaines.tauxReussite.min, stats.tauxReussite);
        domaines.tauxReussite.max = Math.max(domaines.tauxReussite.max, stats.tauxReussite);
        if (stats.noteMoyenne != null) {
            domaines.noteMoyenne.min = Math.min(domaines.noteMoyenne.min, stats.noteMoyenne);
            domaines.noteMoyenne.max = Math.max(domaines.noteMoyenne.max, stats.noteMoyenne);
        }
        domaines.tauxPonctualite.min = Math.min(domaines.tauxPonctualite.min, stats.tauxPonctualite);
        domaines.tauxPonctualite.max = Math.max(domaines.tauxPonctualite.max, stats.tauxPonctualite);

        return {
            date,
            tauxReussite: stats.tauxReussite,
            totalLivraisons: stats.totalLivraisons,
            noteMoyenne: stats.noteMoyenne,
            tauxPonctualite: stats.tauxPonctualite,
        };
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    return { points, domaines };
};

export const getOverallStats = (deliveries: any[]) => {
  throw new Error('Function not implemented.');
}
export const sendEmail = (emailDetails: { to: string, subject: string, body: string }) => {
  const mailtoLink = `mailto:${emailDetails.to}?subject=${encodeURIComponent(emailDetails.subject)}&body=${encodeURIComponent(emailDetails.body)}`;
  window.open(mailtoLink, '_blank');
};
