
'use client';
import React from "react";
import Image from "next/image";
import { 
    type DonneesRapportPerformance, 
    type ResultatSynthese,
    type Objectifs,
    type EntiteClassementNoteChauffeur,
    type ExempleCommentaire,
    type ResultatsCategorisation,
    CATEGORIES_PROBLEMES,
    type DonneesSectionRapport,
    type ClassementKpi,
    type EntiteClassement,
    type SerieTemporelle
} from '@/lib/definitions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
    ThumbsUp, ThumbsDown, ArrowRightCircle, Target, Smile, Frown, MessageSquare, ClipboardList, Truck,
    Star, Percent, Clock, MessageCircle, Award, UserX, Users, Warehouse, TrendingUp
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { fr } from 'date-fns/locale';
import { TrendChart } from './trend-chart';


interface RapportImprimableProps {
  donneesRapport: DonneesRapportPerformance;
  donneesSynthese: ResultatSynthese;
  objectifs: Objectifs;
  typeRapport: 'Dépôt' | 'Transporteur';
  plageDates: DateRange | undefined;
  donneesTendance: SerieTemporelle;
}

const LogoEntiteImpression = ({ nom, entrepot, type }: { nom: string, entrepot?: string, type: 'Dépôt' | 'Transporteur' }) => {
    if (type === 'Transporteur') {
        return <Truck className="h-6 w-6 inline-block mr-2 text-gray-700"/>;
    }

    const isMagasin = nom === 'Magasin' && entrepot;
    const nomLogo = (isMagasin ? entrepot! : nom).toLowerCase().replace(/\s+/g, '-');
    const urlLogo = `/logos/id-${nomLogo}.jpg`;

    return <Image src={urlLogo} alt={`Logo ${nom}`} width={30} height={30} className="rounded-full inline-block mr-2"/>;
};

// --- Composants d'aide réutilisables pour l'impression ---

const KpiBar = ({ titre, valeur, objectif, meilleurSiEleve, unite = '%' }: { titre: string, valeur: number | undefined, objectif: number, meilleurSiEleve: boolean, unite?: string }) => {
    if (valeur === undefined) return null;

    const atteintObjectif = meilleurSiEleve ? valeur >= objectif : valeur <= objectif;
    const progression = meilleurSiEleve ? (valeur / objectif) * 100 : (objectif / valeur) * 100;

    return (
        <div>
            <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium">{titre}</span>
                <span className={cn("text-xs font-bold", atteintObjectif ? "text-green-600" : "text-red-600")}>
                    {valeur.toFixed(2)}{unite}
                </span>
            </div>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Progress value={Math.min(100, progression)} className={cn("h-2", !atteintObjectif && "[&>div]:bg-red-500")} />
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Objectif: {objectif.toFixed(2)}{unite}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
    )
}

const SectionSyntheseKPIs = ({ titre, synthese, donneesRapport, objectifs }: { 
    titre: string, 
    synthese: { forces: string[], faiblesses: string[] },
    donneesRapport: {
        statistiques: {
            tauxReussite: number | undefined;
            noteMoyenne: number | undefined;
            sentimentMoyen: number | undefined;
            tauxPonctualite: number | undefined;
        }
    },
    objectifs: Objectifs
}) => (
    <Card className="mb-4 break-inside-avoid">
        <CardHeader className="p-3"><CardTitle className="flex items-center text-base"><Target className="h-4 w-4 mr-2" />{titre}</CardTitle></CardHeader>
        <CardContent className="p-3 space-y-3">
            <div>
                 <h4 className="font-semibold mb-2 text-sm">Indicateurs de Performance Clés (KPIs)</h4>
                 <div className="space-y-2">
                    <KpiBar titre="Taux de Succès" valeur={donneesRapport.statistiques.tauxReussite} objectif={100 - objectifs.tauxEchec} meilleurSiEleve={true} />
                    <KpiBar titre="Note Moyenne" valeur={donneesRapport.statistiques.noteMoyenne} objectif={objectifs.noteMoyenne} meilleurSiEleve={true} unite="/5" />
                    <KpiBar titre="Note des Commentaires" valeur={donneesRapport.statistiques.sentimentMoyen} objectif={objectifs.sentimentMoyen} meilleurSiEleve={true} unite="/10" />
                    <KpiBar titre="Ponctualité" valeur={donneesRapport.statistiques.tauxPonctualite} objectif={objectifs.tauxPonctualite} meilleurSiEleve={true} />
                 </div>
            </div>
             <Separator/>
            <div>
                <h4 className="font-semibold text-green-700 flex items-center mb-2 text-sm"><ThumbsUp className="h-4 w-4 mr-2" />Points forts</h4>
                {synthese.forces.length > 0 ? (
                    <ul className="list-disc pl-4 space-y-1">
                        {synthese.forces.map((point, index) => <li key={index} className="text-xs">{point}</li>)}
                    </ul>
                ) : <p className="text-xs text-muted-foreground">Aucun.</p>}
            </div>
            <div>
                <h4 className="font-semibold text-red-700 flex items-center mb-2 text-sm"><ThumbsDown className="h-4 w-4 mr-2" />Axes d'amélioration</h4>
                 {synthese.faiblesses.length > 0 ? (
                    <ul className="list-disc pl-4 space-y-1">
                        {synthese.faiblesses.map((point, index) => <li key={index} className="text-xs">{point}</li>)}
                    </ul>
                ) : <p className="text-xs text-muted-foreground">Aucun.</p>}
            </div>
        </CardContent>
    </Card>
);

const TableauClassementSimpleImpression = ({ titre, icone, donnees, unite }: { titre: string; icone: React.ReactNode; donnees: EntiteClassement[]; unite: string; }) => (
    <div>
        <h5 className="font-semibold flex items-center mb-1 text-sm">{icone}{titre}</h5>
        <Table>
            <TableBody>
                {donnees.length > 0 ? (
                    donnees.map(item => (
                        <TableRow key={item.nom}>
                            <TableCell className="text-xs p-1 truncate max-w-[100px]">{item.nom}</TableCell>
                            <TableCell className="text-right font-bold text-xs p-1">{item.valeur.toFixed(2)}{unite}</TableCell>
                        </TableRow>
                    ))
                ) : <TableRow><TableCell colSpan={2} className="text-xs text-center text-gray-500 p-1">N/A</TableCell></TableRow>}
            </TableBody>
        </Table>
    </div>
);


const ClassementsKpiImpression = ({ donneesRapport, typeRapport }: { donneesRapport: DonneesSectionRapport, typeRapport: 'Dépôt' | 'Transporteur' }) => {
    const kpis = [
        { key: 'noteMoyenne', name: 'Note Moyenne', icon: <Star className="h-4 w-4 mr-2"/>, unit: '/5' },
        { key: 'tauxReussite', name: 'Taux de Succès', icon: <Percent className="h-4 w-4 mr-2"/>, unit: '%' },
        { key: 'tauxPonctualite', name: 'Ponctualité', icon: <Clock className="h-4 w-4 mr-2"/>, unit: '%' },
        { key: 'sentimentMoyen', name: 'Note des Comms', icon: <MessageCircle className="h-4 w-4 mr-2"/>, unit: '/10' }
    ];

    const entiteSecondaireNom = typeRapport === 'Dépôt' ? 'Transporteurs' : 'Dépôts';
    const entiteSecondaireIcone = typeRapport === 'Dépôt' ? <Truck className="h-5 w-5 mr-2"/> : <Warehouse className="h-5 w-5 mr-2"/>;

    return (
        <div className="break-inside-avoid mt-4">
            <h4 className="text-base font-semibold mb-2">Classements par Indicateur Clé (KPI)</h4>
            <div className="space-y-4">
                {kpis.map(kpi => (
                    <div key={kpi.key} className="p-2 border rounded-md">
                        <h5 className="font-bold text-sm mb-2 flex items-center">{kpi.icon} {kpi.name}</h5>
                         <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h6 className="font-semibold text-gray-800 mb-2 flex items-center text-sm"><Users className="h-5 w-5 mr-2"/> Livreurs</h6>
                                <div className="grid grid-cols-2 gap-2">
                                    <TableauClassementSimpleImpression titre="Top 3" icone={<Award className="h-4 w-4 mr-1 text-green-600"/>} donnees={donneesRapport.classementsKpi.chauffeurs[kpi.key as keyof typeof donneesRapport.classementsKpi.chauffeurs].top} unite={kpi.unit} />
                                    <TableauClassementSimpleImpression titre="Flop 3" icone={<UserX className="h-4 w-4 mr-1 text-red-600"/>} donnees={donneesRapport.classementsKpi.chauffeurs[kpi.key as keyof typeof donneesRapport.classementsKpi.chauffeurs].flop} unite={kpi.unit} />
                                </div>
                            </div>
                             <div>
                                <h6 className="font-semibold text-gray-800 mb-2 flex items-center text-sm">{entiteSecondaireIcone} {entiteSecondaireNom}</h6>
                                <div className="grid grid-cols-2 gap-2">
                                     <TableauClassementSimpleImpression titre="Top 3" icone={<Award className="h-4 w-4 mr-1 text-green-600"/>} donnees={donneesRapport.classementsKpi.transporteurs[kpi.key as keyof typeof donneesRapport.classementsKpi.transporteurs].top} unite={kpi.unit} />
                                    <TableauClassementSimpleImpression titre="Flop 3" icone={<UserX className="h-4 w-4 mr-1 text-red-600"/>} donnees={donneesRapport.classementsKpi.transporteurs[kpi.key as keyof typeof donneesRapport.classementsKpi.transporteurs].flop} unite={kpi.unit} />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
};


const ClassementsNotesChauffeurImpression = ({ top, flop }: { top: EntiteClassementNoteChauffeur[], flop: EntiteClassementNoteChauffeur[] }) => (
    <div className="break-inside-avoid">
        <h4 className="text-base font-semibold mb-2">Classement par Volume de Notes</h4>
        <div className="grid grid-cols-2 gap-4">
            <div>
                <h5 className="font-semibold flex items-center text-green-600 mb-1 text-sm"><Smile className="h-4 w-4 mr-2" /> Top Positives</h5>
                <Table>
                     <TableBody>{top.map((item, i) => <TableRow key={i}><TableCell className="text-xs p-1">{item.nom} <span className="text-gray-500">({(item.noteMoyenne || 0).toFixed(2)}/5)</span></TableCell><TableCell className="text-right font-bold text-xs p-1">{item.nombre}</TableCell></TableRow>)}</TableBody>
                </Table>
            </div>
            <div>
                <h5 className="font-semibold flex items-center text-red-600 mb-1 text-sm"><Frown className="h-4 w-4 mr-2" /> Top Négatives</h5>
                <Table>
                    <TableBody>{flop.map((item, i) => <TableRow key={i}><TableCell className="text-xs p-1">{item.nom} <span className="text-gray-500">({(item.noteMoyenne || 0).toFixed(2)}/5)</span></TableCell><TableCell className="text-right font-bold text-xs p-1">{item.nombre}</TableCell></TableRow>)}</TableBody>
                </Table>
            </div>
        </div>
    </div>
);

const ExemplesCommentairesImpression = ({ top, flop }: { top: ExempleCommentaire[], flop: ExempleCommentaire[] }) => (
    <div className="break-inside-avoid mt-4">
        <h4 className="text-base font-semibold mb-2 flex items-center"><MessageSquare className="h-4 w-4 mr-2"/>Exemples de Commentaires</h4>
        <div className="grid grid-cols-2 gap-x-4">
            <div>
                <h5 className="font-semibold flex items-center text-green-600 mb-1 text-sm"><ThumbsUp className="h-4 w-4 mr-2" /> Positifs</h5>
                {top.slice(0, 2).map((c, i) => (<div key={i} className="border-l-2 border-green-500 pl-2 mb-2 text-xs italic">"{c.commentaire}"<p className="text-xs text-gray-500 mt-1 not-italic">- {c.chauffeur}</p></div>))}
            </div>
            <div>
                <h5 className="font-semibold flex items-center text-red-600 mb-1 text-sm"><ThumbsDown className="h-4 w-4 mr-2" /> Négatifs</h5>
                 {flop.slice(0, 2).map((c, i) => (<div key={i} className="border-l-2 border-red-500 pl-2 mb-2 text-xs italic">"{c.commentaire}"<p className="text-xs text-gray-500 mt-1 not-italic">- {c.chauffeur}</p></div>))}
            </div>
        </div>
    </div>
);

const AnalyseCategorielleImpression = ({ resultats, totalCommentairesNegatifs, afficherDetailsCommentaires = true }: { resultats: ResultatsCategorisation, totalCommentairesNegatifs: number, afficherDetailsCommentaires?: boolean }) => (
    <div className="mt-4 break-inside-avoid">
        <h4 className="text-base font-semibold mb-2 flex items-center"><ClipboardList className="h-4 w-4 mr-2"/>Analyse des Commentaires Négatifs</h4>
        <div className="space-y-3">
            {CATEGORIES_PROBLEMES.map(cat => {
                const chauffeurs = resultats[cat];
                if (chauffeurs.length === 0) return null;

                const totalCasCategorie = chauffeurs.reduce((acc, curr) => acc + curr.recurrence, 0);
                const pourcentageCategorie = totalCommentairesNegatifs > 0 ? (totalCasCategorie / totalCommentairesNegatifs) * 100 : 0;

                return (
                    <div key={cat} className="p-2 border rounded-md text-xs">
                        <div className="flex justify-between items-center mb-1">
                            <h5 className="font-bold capitalize">{cat}</h5>
                            <span className="font-semibold">{totalCasCategorie} cas ({pourcentageCategorie.toFixed(1)}%)</span>
                        </div>
                        {afficherDetailsCommentaires && (
                            <ul className="list-disc pl-4 space-y-2 mt-2">
                                {chauffeurs.map(chauffeur => (
                                    <li key={chauffeur.nom}>
                                        <span className="font-medium">{chauffeur.nom}</span> <span className="text-gray-500">({chauffeur.recurrence} cas)</span>
                                        <ul className="list-['-_'] pl-4 mt-1 space-y-1">
                                            {chauffeur.exemplesCommentaires.map((commentaire, index) => (
                                                <li key={index} className="text-gray-600 italic">"{commentaire}"</li>
                                            ))}
                                        </ul>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                );
            })}
        </div>
    </div>
);

const SectionTendanceImpression = ({ donneesTendance, objectifs }: { donneesTendance: SerieTemporelle, objectifs: Objectifs }) => {
    
    const getChartDomain = (minVal: number, maxVal: number, objective?: number): [number, number] => {
        let min = minVal;
        let max = maxVal;
        if (objective !== undefined) {
          min = Math.min(min, objective);
          max = Math.max(max, objective);
        }
        const padding = (max - min) * 0.1 || 1;
        return [Math.max(0, min - padding), Math.min(100, max + padding)];
    }

    const successDomain = getChartDomain(donneesTendance.domaines.tauxReussite.min, donneesTendance.domaines.tauxReussite.max, 100 - objectifs.tauxEchec);
    const ratingDomain = getChartDomain(donneesTendance.domaines.noteMoyenne.min, donneesTendance.domaines.noteMoyenne.max, objectifs.noteMoyenne);
    const punctualityDomain = getChartDomain(donneesTendance.domaines.tauxPonctualite.min, donneesTendance.domaines.tauxPonctualite.max, objectifs.tauxPonctualite);

    const chartConfig = { height: 150, fontSize: 10 };

    return (
        <div className="break-inside-avoid mt-4">
            <h4 className="text-base font-semibold mb-2 flex items-center"><TrendingUp className="h-4 w-4 mr-2"/>Évolution des Indicateurs</h4>
            <div className="space-y-4">
                 <Card>
                    <CardHeader className="p-2"><CardTitle className="text-sm">Évolution du Taux de Succès</CardTitle></CardHeader>
                    <CardContent className="p-2">
                        <TrendChart 
                            data={donneesTendance.points} 
                            lineKey="tauxReussite" 
                            yAxisLabel="Succès (%)" 
                            color="hsl(var(--primary))" 
                            objective={100 - objectifs.tauxEchec}
                            domain={successDomain}
                            height={chartConfig.height}
                            fontSize={chartConfig.fontSize}
                        />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="p-2"><CardTitle className="text-sm">Évolution de la Note Moyenne</CardTitle></CardHeader>
                    <CardContent className="p-2">
                        <TrendChart 
                            data={donneesTendance.points} 
                            lineKey="noteMoyenne" 
                            yAxisLabel="Note Moy." 
                            color="hsl(var(--primary))" 
                            objective={objectifs.noteMoyenne}
                            domain={ratingDomain}
                            height={chartConfig.height}
                            fontSize={chartConfig.fontSize}
                        />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="p-2"><CardTitle className="text-sm">Évolution de la Ponctualité</CardTitle></CardHeader>
                    <CardContent className="p-2">
                        <TrendChart 
                            data={donneesTendance.points} 
                            lineKey="tauxPonctualite" 
                            yAxisLabel="Ponctualité (%)" 
                            color="hsl(var(--primary))"
                            objective={objectifs.tauxPonctualite}
                            domain={punctualityDomain}
                            height={chartConfig.height}
                            fontSize={chartConfig.fontSize}
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

// --- Composant principal imprimable ---
export function PrintableReport({ donneesRapport, donneesSynthese, objectifs, typeRapport, plageDates, donneesTendance }: RapportImprimableProps) {
  if (!donneesRapport || !donneesSynthese) return null;
  
  const formattedDateRange = plageDates?.from ? 
    (plageDates.to ? 
        `Période du ${format(plageDates.from, "d LLLL yyyy", { locale: fr })} au ${format(plageDates.to, "d LLLL yyyy", { locale: fr })}` 
      : `Jour du ${format(plageDates.from, "d LLLL yyyy", { locale: fr })}`)
    : "Toutes les dates";

  return (
    <div className="printable-content">
        <div className="page-break flex flex-col items-center justify-center h-screen text-center">
            <Image src="/logos/logo-crf.jpg" alt="Logo CLCV" width={120} height={120} className="rounded-lg mb-6"/>
            <h1 className="text-4xl font-bold text-primary">Rapport Qualité des Livraisons</h1>
            <p className="text-lg text-muted-foreground mt-2">Analyse par {typeRapport}</p>
            <p className="text-md text-muted-foreground mt-4">{formattedDateRange}</p>
            <p className="text-sm text-muted-foreground mt-8">Généré le: {new Date().toLocaleDateString('fr-FR')}</p>
        </div>

        {/* Section globale */}
        <div className="page-break">
            <h2 className="text-2xl font-bold mb-4">Vision d'Ensemble</h2>
            <div className="grid grid-cols-2 gap-4 items-start">
                 <SectionSyntheseKPIs 
                    titre="Synthèse Globale"
                    synthese={donneesSynthese.global}
                    donneesRapport={{statistiques: donneesRapport.global.statistiques}}
                    objectifs={objectifs}
                />
                 <Card>
                    <CardHeader className="p-3">
                        <CardTitle className="text-base">Analyse Détaillée</CardTitle>
                        <CardDescription className="text-xs">{donneesRapport.global.statistiques.totalLivraisons} livraisons analysées.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-3 space-y-3">
                         <ClassementsNotesChauffeurImpression top={donneesRapport.global.chauffeursMieuxNotes} flop={donneesRapport.global.chauffeursMoinsBienNotes} />
                        <Separator/>
                         <ExemplesCommentairesImpression top={donneesRapport.global.meilleursCommentaires} flop={donneesRapport.global.piresCommentaires} />
                    </CardContent>
                </Card>
            </div>
             <div className="grid grid-cols-2 gap-4 items-start mt-4">
                 <AnalyseCategorielleImpression 
                    resultats={donneesRapport.global.resultatsCategorisation} 
                    totalCommentairesNegatifs={donneesRapport.global.totalCommentairesNegatifs}
                    afficherDetailsCommentaires={false}
                />
                <SectionTendanceImpression donneesTendance={donneesTendance} objectifs={objectifs} />
            </div>
             <ClassementsKpiImpression donneesRapport={donneesRapport.global} typeRapport={typeRapport} />
        </div>

        {/* Sections par entité (dépôt ou transporteur) */}
        {donneesRapport.depots.map((entite) => {
            const syntheseEntite = donneesSynthese.depots.find(d => (d.nom === entite.nom) && (d.entrepot === entite.entrepot));
            if (!syntheseEntite) return null;
            
            const titreEntite = entite.entrepot ? `${entite.nom} (${entite.entrepot})` : entite.nom;

            return (
                <div className="page-break" key={titreEntite}>
                    <h2 className="text-2xl font-bold mb-4 flex items-center">
                        <LogoEntiteImpression nom={entite.nom} entrepot={entite.entrepot} type={typeRapport} />
                        {titreEntite}
                    </h2>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                        <SectionSyntheseKPIs 
                            titre={`Synthèse ${titreEntite}`}
                            synthese={syntheseEntite}
                            donneesRapport={entite}
                            objectifs={objectifs}
                        />
                         <Card>
                            <CardHeader className="p-3">
                                <CardTitle className="text-base">Analyse Détaillée - {titreEntite}</CardTitle>
                                <CardDescription className="text-xs">{entite.statistiques.totalLivraisons} livraisons analysées.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-3 space-y-3">
                                 <ClassementsNotesChauffeurImpression top={entite.chauffeursMieuxNotes} flop={entite.chauffeursMoinsBienNotes} />
                                <Separator/>
                                <ExemplesCommentairesImpression top={entite.meilleursCommentaires} flop={entite.piresCommentaires} />
                                <Separator/>
                                <AnalyseCategorielleImpression 
                                    resultats={entite.resultatsCategorisation} 
                                    totalCommentairesNegatifs={entite.totalCommentairesNegatifs}
                                    afficherDetailsCommentaires={true}
                                />
                                <Separator/>
                                <ClassementsKpiImpression donneesRapport={entite} typeRapport={typeRapport} />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            );
        })}
    </div>
  );
}
