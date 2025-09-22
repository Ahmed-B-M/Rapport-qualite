

import { 
    type Livraison, type StatistiquesAgregees, type PerformanceChauffeur, 
    type DonneesRapportPerformance, type ClassementsKpiParEntite, type EntiteClassement, 
    type RapportDepot, type StatutLivraison, type DonneesSectionRapport, 
    type EntiteClassementNoteChauffeur,
    type CategorieProbleme, type CommentaireCategorise, type ResultatsCategorisation, CATEGORIES_PROBLEMES, ChauffeurProbleme
} from './definitions';
import { CARTE_ENTREPOT_DEPOT, TRANSPORTEURS } from '@/lib/constants';
import { parse, isValid, format } from 'date-fns';
import { analyzeSentiment, getTopComments } from './sentiment';

// --- Traitement des données brutes ---

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

const getTransporteurFromChauffeur = (nomChauffeur: string, depot: string): string => {
    if (!nomChauffeur || nomChauffeur.trim() === '') return 'Inconnu';
    
    const nom = nomChauffeur.trim().toUpperCase();

    // Règle spécifique pour Vitry
    if (depot === 'Vitry' && (nom.endsWith('6') || nom.endsWith('7'))) {
        return 'GPL';
    }

    if (nom.endsWith('ID LOG')) return 'ID LOGISTICS';
    if (nom.startsWith('STT')) return 'Sous traitants';
    for (const transporteur of TRANSPORTEURS) {
        for (const suffixe of transporteur.suffixes) {
            if (suffixe && nom.endsWith(suffixe)) return transporteur.nom;
        }
    }
    return 'Inconnu';
};

const convertirDateExcel = (serial: number): Date => {
    const excelEpoch = new Date(1899, 11, 30);
    return new Date(excelEpoch.getTime() + serial * 24 * 60 * 60 * 1000);
};

export const traiterDonneesBrutes = (donneesBrutes: any[]): Livraison[] => {
  return donneesBrutes.map((ligne) => {
    const livraison: Partial<Livraison> = {};
    for (const enTeteBrut in ligne) {
      const cleMappee = HEADER_MAPPING[enTeteBrut.trim()];
      if (cleMappee) {
        (livraison as any)[cleMappee] = ligne[enTeteBrut];
      }
    }

    let dateFormatee: string = 'N/A';
    const valeurDate: any = livraison.date;

    if (valeurDate) {
        if (valeurDate instanceof Date) {
            dateFormatee = format(valeurDate, 'yyyy-MM-dd');
        } else if (typeof valeurDate === 'number' && valeurDate > 1) {
            const dateConvertie = convertirDateExcel(valeurDate);
            dateFormatee = format(dateConvertie, 'yyyy-MM-dd');
        } else if (typeof valeurDate === 'string') {
            const dateAnalysee = parse(valeurDate, 'dd/MM/yyyy', new Date());
            if (isValid(dateAnalysee)) {
                dateFormatee = format(dateAnalysee, 'yyyy-MM-dd');
            } else {
                dateFormatee = valeurDate;
            }
        } else {
            dateFormatee = String(valeurDate);
        }
    }

    const entrepot = (livraison.entrepot || 'Inconnu').trim();
    const depot = CARTE_ENTREPOT_DEPOT[entrepot] || 'Dépôt Inconnu';
    const nomChauffeur = (livraison.chauffeur || '').trim();
    
    const transporteur = getTransporteurFromChauffeur(nomChauffeur, depot);
    const chauffeur = nomChauffeur ? `${nomChauffeur} (${depot === 'Magasin' ? entrepot : depot})` : `Livreur Inconnu (${depot})`;
    
    let statut: StatutLivraison;
    switch(ligne['Statut']) {
        case 'Livré': statut = 'Livré'; break;
        case 'Non livré': statut = 'Non livré'; break;
        case 'Partiellement livré': statut = 'Partiellement livré'; break;
        default: statut = 'En attente'; break;
    }

    const note = livraison.noteLivraison ? Number(livraison.noteLivraison) : undefined;
    
    const termineParBrut = String(livraison.terminePar).toLowerCase();
    let terminePar: 'web' | 'mobile' | 'inconnu';
    if (termineParBrut.includes('web')) {
        terminePar = 'web';
    } else if (termineParBrut.includes('mobile')) {
        terminePar = 'mobile';
    } else {
        terminePar = 'inconnu';
    }

    return {
      ...livraison,
      date: dateFormatee,
      statut: statut,
      raisonEchec: statut === 'Non livré' ? livraison.raisonEchec : undefined,
      idTache: String(livraison.idTache || 'N/A'),
      entrepot: entrepot,
      chauffeur: chauffeur,
      idTournee: String(livraison.idTournee || 'N/A'),
      sequence: Number(livraison.sequence) || 0,
      retardSecondes: Number(livraison.retardSecondes) || 0,
      forceSansContact: String(livraison.forceSansContact).toLowerCase() === 'true',
      forceSurSite: String(livraison.forceSurSite).trim().toLowerCase() === 'yes' ? 'Oui' : 'Non',
      terminePar: terminePar,
      noteLivraison: (note && note >= 1 && note <= 5) ? note : undefined,
      commentaireRetour: livraison.commentaireRetour ? String(livraison.commentaireRetour) : undefined,
      depot,
      transporteur,
    } as Livraison;
  });
};

// --- Calcul des KPI ---

export function calculerNoteMoyenne(donnees: Livraison[]): { moyenne?: number, nombre: number } {
  const livraisonsNotees = donnees.filter(l => l.noteLivraison !== null && l.noteLivraison !== undefined);
  const nombre = livraisonsNotees.length;
  if (nombre === 0) return { moyenne: undefined, nombre: 0 };
  const totalNotes = livraisonsNotees.reduce((sum, l) => sum + (l.noteLivraison || 0), 0);
  return { moyenne: totalNotes / nombre, nombre };
}

export function calculerSentimentMoyen(donnees: Livraison[]): number | undefined {
    const livraisonsCommentees = donnees.filter(l => l.commentaireRetour && l.commentaireRetour.trim().length > 5);
    if (livraisonsCommentees.length === 0) return undefined;

    const scoreTotal = livraisonsCommentees.reduce((sum, l) => sum + analyzeSentiment(l.commentaireRetour!, l.noteLivraison).score, 0);
    return scoreTotal / livraisonsCommentees.length;
}

export function getStatistiquesGlobales(livraisons: Livraison[]): StatistiquesAgregees {
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
    
    const livraisonsReussies = livraisonsCloturees.filter(l => l.statut === 'Livré');
    const livraisonsAPoint = livraisonsCloturees.filter(l => l.retardSecondes !== null && l.retardSecondes >= -900 && l.retardSecondes <= 900);
    const nombreForceSurSite = livraisonsCloturees.filter(l => l.forceSurSite === 'Oui').length;
    const nombreForceSansContact = livraisonsCloturees.filter(l => l.forceSansContact).length;
    const nombreCompletionWeb = livraisonsCloturees.filter(l => l.terminePar === 'web').length;

    return {
        totalLivraisons,
        tauxReussite: (livraisonsReussies.length / totalLivraisons) * 100,
        noteMoyenne,
        tauxPonctualite: (livraisonsAPoint.length / totalLivraisons) * 100,
        tauxNotation: (nombreNotes / totalLivraisons) * 100,
        tauxForceSurSite: (nombreForceSurSite / totalLivraisons) * 100,
        tauxForceSansContact: (nombreForceSansContact / totalLivraisons) * 100,
        tauxCompletionWeb: (nombreCompletionWeb / totalLivraisons) * 100,
        sentimentMoyen: calculerSentimentMoyen(livraisonsCloturees),
        nombreNotes,
        nombreLivraisonsReussies: livraisonsReussies.length,
        nombreRetards: totalLivraisons - livraisonsAPoint.length,
        nombreForceSurSite,
        nombreForceSansContact,
        nombreCompletionWeb,
    };
}


// --- Agrégation des données ---

export const agregerStatistiquesParEntite = (donnees: Livraison[], groupBy: keyof Livraison): Record<string, StatistiquesAgregees> => {
    const statsParEntite: Record<string, Livraison[]> = {};
    donnees.forEach((livraison) => {
      const nomEntite = (livraison[groupBy] as string) || 'Inconnu';
      if (!statsParEntite[nomEntite]) {
        statsParEntite[nomEntite] = [];
      }
      statsParEntite[nomEntite].push(livraison);
    });
    
    const resultat: Record<string, StatistiquesAgregees> = {};

    for (const nomEntite in statsParEntite) {
      resultat[nomEntite] = getStatistiquesGlobales(statsParEntite[nomEntite]);
    }
    
    return resultat;
};

export const getDonneesPerformanceChauffeur = (donnees: Livraison[] | undefined): PerformanceChauffeur[] => {
    if (!donnees) {
        return [];
    }
    const livraisonsParChauffeur: Record<string, Livraison[]> = {};
    donnees.forEach(livraison => {
        if (!livraisonsParChauffeur[livraison.chauffeur]) {
            livraisonsParChauffeur[livraison.chauffeur] = [];
        }
        livraisonsParChauffeur[livraison.chauffeur].push(livraison);
    });
    return Object.entries(livraisonsParChauffeur).map(([nomChauffeur, livraisons]) => {
        const stats = getStatistiquesGlobales(livraisons);
        const premierLivraison = livraisons[0];
        const depot = premierLivraison?.depot || 'Inconnu';
        const transporteur = premierLivraison?.transporteur || 'Inconnu';
        const entrepot = premierLivraison?.entrepot || 'Inconnu';

        return { 
            chauffeur: nomChauffeur, 
            depot, 
            transporteur,
            entrepot, 
            ...stats 
        };
    });
};

// --- Analyse sémantique et catégorisation des commentaires ---

const MOTS_CLES_CATEGORIES: { categorie: CategorieProbleme, motsCles: string[] }[] = [
    { 
        categorie: "attitude livreur", 
        motsCles: [
            "pas aimable", "agressif", "impoli", "désagréable", "pas bonjour", "comportement", 
            "odieux", "odieuse", "incorrecte", "mal poli", "catastrophe", "horrible", "pas serviable", 
            "agressive", "pressé", "impatient", "sur le trottoir", "expéditif", "fait le signe pour avoir la pièce",
            "pas professionnel", "pas très aimable", "débrouillez vous", "davantage d'aide", "mauvaise foi",
            "laisser les sacs", "devant la maison", "mauvaise adresse", "porter les sacs", "irrespectueux", 
            "arrogant", "énervés", "agacé", "livrées à l'extérieur", "brutal", "insultant", "pas descendu",
            "livré à 400m", "trompent de rue", "jetant les sacs"
        ]
    },
    { 
        categorie: "casse articles", 
        motsCles: [
            "casse", "cassé", "abimé", "abîmé", "endommagé", "ecrasé", "écrasé", "produit ouvert", 
            "huevos rotos", "état lamentable", "bouteille ouverte", "trempés", "mal préparée", "mal preparée",
            "endommagés", "produit éclaté", "crème partout", "n'importe comment", "l'eau dans les sacs", "produits endommages"
        ]
    },
    { 
        categorie: "article manquant", 
        motsCles: [
            "manquant", "manque", "oubli", "pas tout", "pas reçu", "incomplet", "pas eu", 
            "produit manquant", "sac qui ne nous a pas été livré", "manquait", "pris", "mauvaise commande",
            "problèmes avec des produits dans le sac", "pas voulu reprendre", "non livrés"
        ]
    },
    { 
        categorie: "ponctualité", 
        motsCles: [
            "retard", "tard", "tôt", "en avance", "pas à l'heure", "attente", "attendu", 
            "jamais arrivé", "pas prévenu", "pas prévenue", "non livrée", "ponctualité", "avant le créneau",
            "non effectuée", "après le créneau", "respecter l'horaire", "pas encore été livrée"
        ]
    },
    { 
        categorie: "rupture chaine de froid", 
        motsCles: ["chaud", "pas frais", "pas froid", "congelé", "décongelé", "chaîne du froid", "frais"]
    },
];


function categoriserCommentaire(commentaire: string): CategorieProbleme {
    const texte = commentaire.toLowerCase();
    for (const item of MOTS_CLES_CATEGORIES) {
        if (item.motsCles.some(mot => texte.includes(mot))) {
            return item.categorie;
        }
    }
    return "autre";
}

function analyserCommentairesNegatifs(livraisons: Livraison[]): ResultatsCategorisation {
    const commentairesNegatifs = livraisons.filter(l => 
        l.commentaireRetour && 
        l.commentaireRetour.trim().length > 5 &&
        analyzeSentiment(l.commentaireRetour, l.noteLivraison).score < 5
    );

    const commentairesCategorises: CommentaireCategorise[] = commentairesNegatifs.map(l => ({
        categorie: categoriserCommentaire(l.commentaireRetour!),
        commentaire: l.commentaireRetour!,
        chauffeur: l.chauffeur
    }));

    const resultats: ResultatsCategorisation = {
        "casse articles": [], "article manquant": [], "ponctualité": [], 
        "rupture chaine de froid": [], "attitude livreur": [], "autre": []
    };

    CATEGORIES_PROBLEMES.forEach(cat => {
        const commentairesDeLaCategorie = commentairesCategorises.filter(c => c.categorie === cat);
        const chauffeursConcernes: Record<string, { recurrence: number, exemplesCommentaires: string[] }> = {};

        commentairesDeLaCategorie.forEach(c => {
            if (!chauffeursConcernes[c.chauffeur]) {
                chauffeursConcernes[c.chauffeur] = { recurrence: 0, exemplesCommentaires: [] };
            }
            chauffeursConcernes[c.chauffeur].recurrence++;
            if (!chauffeursConcernes[c.chauffeur].exemplesCommentaires.includes(c.commentaire)) {
                chauffeursConcernes[c.chauffeur].exemplesCommentaires.push(c.commentaire);
            }
        });

        resultats[cat] = Object.entries(chauffeursConcernes)
            .map(([nom, data]) => ({ nom, recurrence: data.recurrence, exemplesCommentaires: data.exemplesCommentaires }))
            .sort((a, b) => b.recurrence - a.recurrence);
    });

    return resultats;
}

export function analyserCommentaires(commentaires: string[]): Record<string, { count: number }> {
    const analyse: Record<string, { count: number }> = {};
    for (const cat of CATEGORIES_PROBLEMES) {
        analyse[cat] = { count: 0 };
    }

    commentaires.forEach(commentaire => {
        const categorie = categoriserCommentaire(commentaire);
        if (analyse[categorie]) {
            analyse[categorie].count++;
        }
    });

    return analyse;
}


export function getCategorizedNegativeComments(livraisons: Livraison[]): Record<string, CommentaireCategorise[]> {
    const commentairesNegatifs = livraisons.filter(l => 
        l.commentaireRetour && 
        l.commentaireRetour.trim().length > 5 &&
        analyzeSentiment(l.commentaireRetour, l.noteLivraison).score < 5
    );

    const categorizedComments = commentairesNegatifs.map(l => ({
        categorie: categoriserCommentaire(l.commentaireRetour!),
        commentaire: l.commentaireRetour!,
        chauffeur: l.chauffeur
    }));
    
    const groupedComments: Record<string, CommentaireCategorise[]> = {};
    
    for(const cat of CATEGORIES_PROBLEMES) {
        groupedComments[cat] = [];
    }

    categorizedComments.forEach(comment => {
        if (!groupedComments[comment.categorie]) {
            groupedComments[comment.categorie] = [];
        }
        groupedComments[comment.categorie].push(comment);
    });

    return groupedComments;
}


// --- Génération de rapport ---

const getDonneesSectionRapport = (donnees: Livraison[], groupBy: 'depot' | 'transporteur'): DonneesSectionRapport => {
    const performancesChauffeur = getDonneesPerformanceChauffeur(donnees);
    
    const livraisonsParAutreEntite: { [key: string]: Livraison[] } = {};
    donnees.forEach(l => {
        const key = groupBy === 'depot' ? l.transporteur : l.depot;
        if (!livraisonsParAutreEntite[key]) livraisonsParAutreEntite[key] = [];
        livraisonsParAutreEntite[key].push(l);
    });
    const performancesAutreEntite = Object.entries(livraisonsParAutreEntite).map(([nom, livraisons]) => ({ nom, ...getStatistiquesGlobales(livraisons) }));
    
    const getClassementsKpi = (performances: any[], kpi: keyof StatistiquesAgregees, meilleurSiEleve: boolean): { top: EntiteClassement[], flop: EntiteClassement[] } => {
        const tries = [...performances]
            .filter(p => p.totalLivraisons > 10 && p[kpi] !== undefined && p.nombreNotes > 0)
            .sort((a, b) => {
                const valA = (a[kpi] as number);
                const valB = (b[kpi] as number);
                return meilleurSiEleve ? valB - valA : valA - valB;
            });
        
        const top = tries.slice(0, 3).map(p => ({ nom: p.nom || p.chauffeur, valeur: (p[kpi] as number), totalLivraisons: p.totalLivraisons }));
        const flop = tries.slice(-3).reverse().map(p => ({ nom: p.nom || p.chauffeur, valeur: (p[kpi] as number), totalLivraisons: p.totalLivraisons }));
        return { top, flop };
    };

    const classementsKpi: ClassementsKpiParEntite = {
        chauffeurs: {
            noteMoyenne: getClassementsKpi(performancesChauffeur, 'noteMoyenne', true),
            sentimentMoyen: getClassementsKpi(performancesChauffeur, 'sentimentMoyen', true),
            tauxPonctualite: getClassementsKpi(performancesChauffeur, 'tauxPonctualite', true),
            tauxReussite: getClassementsKpi(performancesChauffeur, 'tauxReussite', true),
        },
        transporteurs: { // This key is now generic
            noteMoyenne: getClassementsKpi(performancesAutreEntite, 'noteMoyenne', true),
            sentimentMoyen: getClassementsKpi(performancesAutreEntite, 'sentimentMoyen', true),
            tauxPonctualite: getClassementsKpi(performancesAutreEntite, 'tauxPonctualite', true),
            tauxReussite: getClassementsKpi(performancesAutreEntite, 'tauxReussite', true),
        }
    };
    
    const getClassementsNotesChauffeur = (donnees: Livraison[], performancesChauffeur: PerformanceChauffeur[]): { top: EntiteClassementNoteChauffeur[], flop: EntiteClassementNoteChauffeur[] } => {
        const notesParChauffeur: { [chauffeur: string]: { positif: number, negatif: number } } = {};
        donnees.forEach(l => {
            if (l.noteLivraison) {
                if (!notesParChauffeur[l.chauffeur]) notesParChauffeur[l.chauffeur] = { positif: 0, negatif: 0 };
                if (l.noteLivraison >= 4) notesParChauffeur[l.chauffeur].positif++;
                else if (l.noteLivraison <= 2) notesParChauffeur[l.chauffeur].negatif++;
            }
        });
        
        const performancesMap = new Map(performancesChauffeur.map(p => [p.chauffeur, p.noteMoyenne]));

        const mieuxNotes = Object.entries(notesParChauffeur)
            .map(([nom, comptes]) => ({ nom, nombre: comptes.positif, noteMoyenne: performancesMap.get(nom) }))
            .filter(c => c.nombre > 0)
            .sort((a, b) => b.nombre - a.nombre)
            .slice(0, 3);
            
        const moinsBienNotes = Object.entries(notesParChauffeur)
            .map(([nom, comptes]) => ({ nom, nombre: comptes.negatif, noteMoyenne: performancesMap.get(nom) }))
            .filter(c => c.nombre > 0)
            .sort((a, b) => b.nombre - a.nombre)
            .slice(0, 3);
            
        return { top: mieuxNotes, flop: moinsBienNotes };
    }

    const commentairesNegatifs = donnees.filter(l => 
        l.commentaireRetour && l.commentaireRetour.trim().length > 5 &&
        analyzeSentiment(l.commentaireRetour, l.noteLivraison).score < 5
    );

    const classementsNotesChauffeur = getClassementsNotesChauffeur(donnees, performancesChauffeur);

    return {
        statistiques: getStatistiquesGlobales(donnees),
        classementsKpi: classementsKpi,
        meilleursCommentaires: getTopComments(donnees, 'positif', 3),
        piresCommentaires: getTopComments(donnees, 'négatif', 3),
        chauffeursMieuxNotes: classementsNotesChauffeur.top,
        chauffeursMoinsBienNotes: classementsNotesChauffeur.flop,
        resultatsCategorisation: analyserCommentairesNegatifs(donnees),
        totalCommentairesNegatifs: commentairesNegatifs.length,
    };
};

export const genererRapportPerformance = (donnees: Livraison[], groupBy: 'depot' | 'transporteur'): DonneesRapportPerformance => {
    const donneesRapportGlobal = getDonneesSectionRapport(donnees, groupBy);

    const livraisonsParEntite: { [key: string]: Livraison[] } = {};
    donnees.forEach(l => {
        let key: string;
        if (groupBy === 'depot') {
            key = l.depot === 'Magasin' ? `Magasin_${l.entrepot}` : l.depot;
        } else {
            key = l.transporteur;
        }
        if (!livraisonsParEntite[key]) livraisonsParEntite[key] = [];
        livraisonsParEntite[key].push(l);
    });

    const rapportsEntite: RapportDepot[] = Object.entries(livraisonsParEntite).map(([key, donneesEntite]) => {
        const premierLivraison = donneesEntite[0];
        return {
            nom: groupBy === 'depot' ? premierLivraison.depot : premierLivraison.transporteur,
            entrepot: (groupBy === 'depot' && premierLivraison.depot === 'Magasin') ? premierLivraison.entrepot : undefined,
            ...getDonneesSectionRapport(donneesEntite, groupBy)
        };
    });

    return {
        global: donneesRapportGlobal,
        depots: rapportsEntite.sort((a, b) => a.nom.localeCompare(b.nom)),
    };
};


// --- Fonctions de filtrage ---

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

export const getDonneesSerieTemporelle = (livraisons: Livraison[]): { date: string, tauxReussite: number, totalLivraisons: number, noteMoyenne?: number, tauxPonctualite: number }[] => {
    const livraisonsParJour: Record<string, Livraison[]> = {};

    livraisons.forEach(l => {
        const date = l.date.split('T')[0];
        if (!livraisonsParJour[date]) {
            livraisonsParJour[date] = [];
        }
        livraisonsParJour[date].push(l);
    });

    return Object.entries(livraisonsParJour).map(([date, livraisonsDuJour]) => {
        const stats = getStatistiquesGlobales(livraisonsDuJour);
        return {
            date,
            tauxReussite: stats.tauxReussite,
            totalLivraisons: stats.totalLivraisons,
            noteMoyenne: stats.noteMoyenne,
            tauxPonctualite: stats.tauxPonctualite,
        };
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};
    

    








