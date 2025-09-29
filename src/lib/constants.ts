
import { CategorieProbleme } from "./definitions";

export const CARTE_ENTREPOT_DEPOT: Record<string, string> = {
  'Vitry': 'Vitry',
  'Vitry SC': 'Vitry',
  'Rungis': 'Rungis',
  'Aix': 'Aix',
  'Aix-en-Provence': 'Aix',
  'Antibes': 'Antibes',
  'Catries': 'Catries',
  'VLG': 'VLG',
  'CRF Rungis': 'CRF',
  'Entrepôt Magasin': 'Magasin'
};

export const TRANSPORTEURS = [
  { nom: 'ID LOGISTICS', suffixes: ['ID LOG', 'IDL'] },
  { nom: 'STEF', suffixes: ['STEF'] },
  { nom: 'STAR SERVICE', suffixes: ['STAR'] },
  { nom: 'GPL', suffixes: ['GPL', '6', '7'] },
  { nom: 'FRIGO', suffixes: ['FRIGO'] },
  { nom: 'Sous traitants', suffixes: ['STT'] },
  { nom: 'Autres', suffixes: [] }
];
export const MOTS_CLES_CATEGORIES: { categorie: CategorieProbleme, motsCles: string[] }[] = [
    { categorie: "attitude livreur", motsCles: ["pas aimable", "agressif", "impoli", "désagréable", "pas bonjour", "comportement", "odieux", "odieuse", "incorrecte", "mal poli", "catastrophe", "horrible", "pas serviable", "agressive", "pressé", "impatient", "sur le trottoir", "expéditif", "fait le signe pour avoir la pièce", "pas professionnel", "pas très aimable", "débrouillez vous", "davantage d'aide", "mauvaise foi", "laisser les sacs", "devant la maison", "mauvaise adresse", "porter les sacs", "irrespectueux", "arrogant", "énervés", "agacé", "livrées à l'extérieur", "brutal", "insultant", "pas descendu", "livré à 400m", "trompent de rue", "jetant les sacs", "pas agréable", "contrarié", "pas poli", "au téléphone"] },
    { categorie: "produit(s) cassé(s)", motsCles: ["casse", "cassé", "abimé", "abîmé", "endommagé", "ecrasé", "écrasé", "produit ouvert", "huevos rotos", "état lamentable", "bouteille ouverte", "trempés", "mal préparée", "mal preparée", "endommagés", "produit éclaté", "crème partout", "n'importe comment", "l'eau dans les sacs", "produits endommages"] },
    { categorie: "produits manquants", motsCles: ["manquant", "manque", "oubli", "pas tout", "pas reçu", "incomplet", "pas eu", "produit manquant", "sac qui ne nous a pas été livré", "manquait", "pris", "mauvaise commande", "problèmes avec des produits dans le sac", "pas voulu reprendre", "non livrés", "pas livré"] },
    { categorie: "ponctualité", motsCles: ["retard", "tard", "tôt", "en avance", "pas à l'heure", "attente", "attendu", "jamais arrivé", "pas prévenu", "pas prévenue", "non livrée", "ponctualité", "avant le créneau", "non effectuée", "après le créneau", "respecter l'horaire", "pas encore été livrée"] },
    { categorie: "rupture chaine de froid", motsCles: ["chaud", "pas frais", "pas froid", "congelé", "décongelé", "chaîne du froid", "frais"] },
    { categorie: "non pertinent", motsCles: ["magasin", "stock", "site", "application", "preparateur", "préparateur", "carrefour", "leclerc", "intermarche", "auchan"] },
    { categorie: "autre", motsCles: [] },
];
