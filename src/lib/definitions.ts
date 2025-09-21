

export type StatutLivraison = 'Livré' | 'Non livré' | 'En attente' | 'Partiellement livré';
export type TerminePar = 'mobile' | 'web' | 'inconnu';
export type ForceSurSite = 'Non' | 'Oui';

export type Livraison = {
  date: string;
  statut: StatutLivraison;
  raisonEchec?: string;
  idTache: string;
  entrepot: string;
  chauffeur: string;
  idTournee: string;
  sequence: number;
  retardSecondes: number;
  commentaireRetour?: string;
  noteLivraison?: number;
  forceSansContact: boolean;
  raisonSansContact?: string;
  forceSurSite: ForceSurSite;
  terminePar: TerminePar;
  depot: string;
  transporteur: string;
};

export type StatistiquesAgregees = {
  totalLivraisons: number;
  tauxReussite: number;
  noteMoyenne?: number;
  tauxPonctualite: number;
  tauxNotation: number;
  tauxForceSurSite: number;
  tauxForceSansContact: number;
  tauxCompletionWeb: number;
  sentimentMoyen?: number;
  nombreNotes: number;
  nombreLivraisonsReussies: number;
  nombreRetards: number;
  nombreForceSurSite: number;
  nombreForceSansContact: number;
  nombreCompletionWeb: number;
};

export type PerformanceChauffeur = StatistiquesAgregees & {
  chauffeur: string;
  depot: string;
  transporteur: string;
};

// --- Nouveaux types pour le rapport de performance ---

export type Objectifs = {
    noteMoyenne: number;
    sentimentMoyen: number;
    tauxPonctualite: number;
    tauxEchec: number;
    tauxForceSurSite: number;
    tauxForceSansContact: number;
    tauxCompletionWeb: number;
};

export type EntiteClassement = {
  nom: string;
  valeur: number;
  totalLivraisons: number;
};

export type EntiteClassementNoteChauffeur = {
    nom: string;
    nombre: number;
    noteMoyenne?: number;
};

export type ClassementKpi = {
  top: EntiteClassement[];
  flop: EntiteClassement[];
};

export type ClassementsKpiParEntite = {
  chauffeurs: {
    noteMoyenne: ClassementKpi;
    sentimentMoyen: ClassementKpi;
    tauxPonctualite: ClassementKpi;
    tauxReussite: ClassementKpi;
  };
  transporteurs: {
    noteMoyenne: ClassementKpi;
    sentimentMoyen: ClassementKpi;
    tauxPonctualite: ClassementKpi;
    tauxReussite: ClassementKpi;
  };
};

export type ExempleCommentaire = {
    commentaire: string;
    score: number;
    chauffeur: string;
};

export type DonneesSectionRapport = {
    statistiques: StatistiquesAgregees;
    classementsKpi: ClassementsKpiParEntite;
    meilleursCommentaires: ExempleCommentaire[];
    piresCommentaires: ExempleCommentaire[];
    chauffeursMieuxNotes: EntiteClassementNoteChauffeur[];
    chauffeursMoinsBienNotes: EntiteClassementNoteChauffeur[];
};

export type RapportDepot = DonneesSectionRapport & {
    nom: string;
};

export type DonneesRapportPerformance = {
  global: DonneesSectionRapport;
  depots: RapportDepot[];
};

// --- Nouveaux types pour le rapport de synthèse ---
export interface PointsSynthese {
  forces: string[];
  faiblesses: string[];
}

export interface SyntheseDepot extends PointsSynthese {
  nom: string;
  global: 'positif' | 'négatif' | 'mitigé';
}

export interface ResultatSynthese {
  global: PointsSynthese & { global: 'positif' | 'négatif' | 'mitigé' };
  depots: SyntheseDepot[];
  conclusion: string;
}

export type ClassementMetrique = keyof Omit<StatistiquesAgregees, 'totalLivraisons' | 'nombreNotes' | 'sentimentMoyen' | 'nombreLivraisonsReussies' | 'nombreRetards' | 'nombreForceSurSite' | 'nombreForceSansContact' | 'nombreCompletionWeb'>;
