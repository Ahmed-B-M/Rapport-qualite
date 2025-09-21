
'use client';
import React from "react";
import Image from "next/image";
import { 
    type DonneesRapportPerformance, 
    type ResultatSynthese,
    type DonneesSectionRapport,
    type Objectifs,
    type EntiteClassementNoteChauffeur,
    type ExempleCommentaire,
    type ResultatsCategorisation,
    type CategorieProbleme,
    CATEGORIES_PROBLEMES
} from '@/lib/definitions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
    ThumbsUp, ThumbsDown, ArrowRightCircle, Target, Smile, Frown, MessageSquare, ClipboardList
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import ReactMarkdown from 'react-markdown';

interface RapportImprimableProps {
  donneesRapport: DonneesRapportPerformance;
  donneesSynthese: ResultatSynthese;
  objectifs: Objectifs;
}

const LogoDepotImpression = ({ nomDepot, entrepot }: { nomDepot: string, entrepot?: string }) => {
    const isMagasin = nomDepot === 'Magasin' && entrepot;
    const nomLogo = (isMagasin ? entrepot! : nomDepot).toLowerCase().replace(/\s+/g, '-');
    const urlLogo = `/logos/id-${nomLogo}.jpg`;

    return <Image src={urlLogo} alt={`Logo ${nomDepot}`} width={30} height={30} className="rounded-full inline-block mr-2"/>;
};

// --- Composants d'aide réutilisables pour l'impression ---

const rendrePoints = (points: string[], icone: React.ReactNode) => (
    <ul className="space-y-2">
        {points.map((point, index) => (
            <li key={index} className="flex items-start">
                <div className="flex-shrink-0 mr-2 mt-1">{icone}</div>
                <ReactMarkdown components={{ p: ({ children }) => <p className="mb-0 text-sm">{children}</p> }}>{point}</ReactMarkdown>
            </li>
        ))}
    </ul>
);

const SectionSyntheseImpression = ({ titre, synthese }: { titre: string, synthese: { forces: string[], faiblesses: string[] } }) => (
    <Card className="mb-4 break-inside-avoid">
        <CardHeader className="p-3"><CardTitle className="flex items-center text-base"><Target className="h-4 w-4 mr-2" />{titre}</CardTitle></CardHeader>
        <CardContent className="p-3">
            <h4 className="font-semibold text-green-700 flex items-center mb-2 text-sm"><ThumbsUp className="h-4 w-4 mr-2" />Points forts</h4>
            {synthese.forces.length > 0 ? rendrePoints(synthese.forces, <ArrowRightCircle className="h-4 w-4 text-green-500" />) : <p className="text-xs text-muted-foreground">Aucun.</p>}
            <Separator className="my-2"/>
            <h4 className="font-semibold text-red-700 flex items-center mb-2 text-sm"><ThumbsDown className="h-4 w-4 mr-2" />Axes d'amélioration</h4>
            {synthese.faiblesses.length > 0 ? rendrePoints(synthese.faiblesses, <ArrowRightCircle className="h-4 w-4 text-red-500" />) : <p className="text-xs text-muted-foreground">Aucun.</p>}
        </CardContent>
    </Card>
);

const CarteKpiImpression = ({ titre, valeur, unite = '%' }: { titre: string, valeur: number | undefined, unite?: string }) => (
    <div className="p-2 border rounded-md bg-gray-50">
      <h4 className="text-xs text-muted-foreground">{titre}</h4>
      <p className="text-lg font-bold mt-1">{valeur !== undefined ? `${valeur.toFixed(2)}${unite}` : 'N/A'}</p>
    </div>
);

const TableauClassementSimpleImpression = ({ titre, donnees, unite }: { titre: string, donnees: any[], unite: string }) => (
    <div className="break-inside-avoid">
        <h5 className="font-semibold mb-1 text-sm">{titre}</h5>
        <Table>
            <TableBody>
                {donnees.length > 0 ? donnees.map(item => (
                    <TableRow key={item.nom}>
                        <TableCell className="text-xs p-1">{item.nom}</TableCell>
                        <TableCell className="text-right font-bold text-xs p-1">{item.valeur.toFixed(2)}{unite}</TableCell>
                    </TableRow>
                )) : <TableRow><TableCell colSpan={2} className="text-muted-foreground text-center text-xs">Aucune donnée</TableCell></TableRow>}
            </TableBody>
        </Table>
    </div>
);

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

const AnalyseCategorielleImpression = ({ resultats, totalCommentairesNegatifs }: { resultats: ResultatsCategorisation, totalCommentairesNegatifs: number }) => (
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
                        <ul className="list-disc pl-4 space-y-1">
                            {chauffeurs.slice(0, 2).map(chauffeur => (
                                <li key={chauffeur.nom}>
                                    {chauffeur.nom} <span className="text-gray-500">({chauffeur.recurrence} cas)</span>
                                    {chauffeur.exempleCommentaire && <p className="text-xs text-gray-600 italic mt-0.5">"{chauffeur.exempleCommentaire}"</p>}
                                </li>
                            ))}
                        </ul>
                    </div>
                );
            })}
        </div>
    </div>
);

// --- Composant principal imprimable ---

export function PrintableReport({ donneesRapport, donneesSynthese, objectifs }: RapportImprimableProps) {
  return (
    <div className="printable-content">
        <div className="page-break flex flex-col items-center justify-center h-screen text-center">
            <Image src="/logos/logo-crf.jpg" alt="Logo CLCV" width={120} height={120} className="rounded-lg mb-6"/>
            <h1 className="text-4xl font-bold text-primary">Rapport Qualité des Livraisons</h1>
            <p className="text-lg text-muted-foreground mt-2">Analyse détaillée pour la période sélectionnée</p>
            <p className="text-sm text-muted-foreground mt-8">Généré le: {new Date().toLocaleDateString('fr-FR')}</p>
        </div>

        {/* Section globale - Page 1 */}
        <div className="page-break">
            <h2 className="text-2xl font-bold mb-4">Vision d'Ensemble - Page 1/2</h2>
            <SectionSyntheseImpression titre="Synthèse Globale" synthese={donneesSynthese.global} />
            <Card className="break-inside-avoid">
                 <CardHeader className="p-3">
                    <CardTitle className="text-base">Indicateurs de Performance Clés (KPIs)</CardTitle>
                 </CardHeader>
                 <CardContent className="p-3">
                    <div className="grid grid-cols-4 gap-2">
                        <CarteKpiImpression titre="Taux de Succès" valeur={donneesRapport.global.statistiques.tauxReussite} unite="%" />
                        <CarteKpiImpression titre="Note Moyenne" valeur={donneesRapport.global.statistiques.noteMoyenne} unite="/5" />
                        <CarteKpiImpression titre="Note Comms" valeur={donneesRapport.global.statistiques.sentimentMoyen} unite="/10" />
                        <CarteKpiImpression titre="Ponctualité" valeur={donneesRapport.global.statistiques.tauxPonctualite} unite="%" />
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* Section globale - Page 2 */}
        <div className="page-break">
             <h2 className="text-2xl font-bold mb-4">Vision d'Ensemble - Page 2/2</h2>
             <Card>
                <CardHeader className="p-3">
                    <CardTitle className="text-base">Analyse Détaillée</CardTitle>
                    <CardDescription className="text-xs">{donneesRapport.global.statistiques.totalLivraisons} livraisons analysées.</CardDescription>
                </CardHeader>
                <CardContent className="p-3 space-y-3">
                    <ClassementsNotesChauffeurImpression top={donneesRapport.global.chauffeursMieuxNotes} flop={donneesRapport.global.chauffeursMoinsBienNotes} />
                    <Separator/>
                    <ExemplesCommentairesImpression top={donneesRapport.global.meilleursCommentaires} flop={donneesRapport.global.piresCommentaires} />
                    <Separator/>
                    <AnalyseCategorielleImpression resultats={donneesRapport.global.resultatsCategorisation} totalCommentairesNegatifs={donneesRapport.global.totalCommentairesNegatifs} />
                </CardContent>
            </Card>
        </div>

        {/* Sections par dépôt */}
        {donneesRapport.depots.map((depot) => {
            const syntheseDepot = donneesSynthese.depots.find(d => d.nom === depot.nom && d.entrepot === depot.entrepot);
            if (!syntheseDepot) return null;
            
            const titreDepot = depot.nom === 'Magasin' ? `Magasin (${depot.entrepot})` : depot.nom;

            return (
                <React.Fragment key={titreDepot}>
                    {/* Dépôt - Page 1 */}
                    <div className="page-break">
                        <h2 className="text-2xl font-bold mb-4 flex items-center">
                            <LogoDepotImpression nomDepot={depot.nom} entrepot={depot.entrepot} />
                            {titreDepot}
                        </h2>
                        <SectionSyntheseImpression titre={`Synthèse ${titreDepot}`} synthese={syntheseDepot} />
                        <Card className="break-inside-avoid">
                             <CardHeader className="p-3">
                                <CardTitle className="text-base">Indicateurs de Performance Clés (KPIs) - {titreDepot}</CardTitle>
                             </CardHeader>
                             <CardContent className="p-3">
                                <div className="grid grid-cols-4 gap-2">
                                    <CarteKpiImpression titre="Taux de Succès" valeur={depot.statistiques.tauxReussite} unite="%" />
                                    <CarteKpiImpression titre="Note Moyenne" valeur={depot.statistiques.noteMoyenne} unite="/5" />
                                    <CarteKpiImpression titre="Note Comms" valeur={depot.statistiques.sentimentMoyen} unite="/10" />
                                    <CarteKpiImpression titre="Ponctualité" valeur={depot.statistiques.tauxPonctualite} unite="%" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Dépôt - Page 2 */}
                    <div className="page-break">
                        <h2 className="text-2xl font-bold mb-4 flex items-center">
                           <LogoDepotImpression nomDepot={depot.nom} entrepot={depot.entrepot} />
                           {titreDepot}
                        </h2>
                        <Card>
                            <CardHeader className="p-3">
                                <CardTitle className="text-base">Analyse Détaillée - {titreDepot}</CardTitle>
                                <CardDescription className="text-xs">{depot.statistiques.totalLivraisons} livraisons analysées.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-3 space-y-3">
                                 <ClassementsNotesChauffeurImpression top={depot.chauffeursMieuxNotes} flop={depot.chauffeursMoinsBienNotes} />
                                <Separator/>
                                <ExemplesCommentairesImpression top={depot.meilleursCommentaires} flop={depot.piresCommentaires} />
                                <Separator/>
                                <AnalyseCategorielleImpression resultats={depot.resultatsCategorisation} totalCommentairesNegatifs={depot.totalCommentairesNegatifs}/>
                            </CardContent>
                        </Card>
                    </div>
                </React.Fragment>
            );
        })}
    </div>
  );
}

    