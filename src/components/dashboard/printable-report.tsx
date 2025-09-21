
'use client';
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

const LogoDepotImpression = ({ nomDepot }: { nomDepot: string }) => {
    const nomLogo = nomDepot.toLowerCase().replace(/\s+/g, '-');
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

const AnalyseCategorielleImpression = ({ resultats }: { resultats: ResultatsCategorisation }) => (
    <div className="mt-4 break-inside-avoid">
        <h4 className="text-base font-semibold mb-2 flex items-center"><ClipboardList className="h-4 w-4 mr-2"/>Analyse des Commentaires Négatifs</h4>
        <div className="space-y-3">
            {CATEGORIES_PROBLEMES.map(cat => {
                const chauffeurs = resultats[cat];
                if (chauffeurs.length === 0) return null;

                return (
                    <div key={cat} className="p-2 border rounded-md text-xs">
                        <h5 className="font-bold capitalize mb-1">{cat}</h5>
                        <ul className="list-disc pl-4">
                            {chauffeurs.map(chauffeur => (
                                <li key={chauffeur.nom}>{chauffeur.nom} <span className="text-gray-500">({chauffeur.recurrence} cas)</span></li>
                            ))}
                        </ul>
                    </div>
                );
            })}
        </div>
    </div>
);


const SectionAnalyseDetailleeImpression = ({ donneesRapport }: { donneesRapport: DonneesSectionRapport }) => (
    <Card className="mb-4 break-inside-avoid">
        <CardHeader className="p-3">
            <CardTitle className="text-base">Analyse Détaillée</CardTitle>
            <CardDescription className="text-xs">{donneesRapport.statistiques.totalLivraisons} livraisons analysées.</CardDescription>
        </CardHeader>
        <CardContent className="p-3 space-y-3">
            <div className="grid grid-cols-4 gap-2">
                <CarteKpiImpression titre="Taux de Succès" valeur={donneesRapport.statistiques.tauxReussite} unite="%" />
                <CarteKpiImpression titre="Note Moyenne" valeur={donneesRapport.statistiques.noteMoyenne} unite="/5" />
                <CarteKpiImpression titre="Note Comms" valeur={donneesRapport.statistiques.sentimentMoyen} unite="/10" />
                <CarteKpiImpression titre="Ponctualité" valeur={donneesRapport.statistiques.tauxPonctualite} unite="%" />
            </div>
            <Separator/>
            <ClassementsNotesChauffeurImpression top={donneesRapport.chauffeursMieuxNotes} flop={donneesRapport.chauffeursMoinsBienNotes} />
            <Separator/>
            <div>
                 <h4 className="text-base font-semibold mb-2">Classements par Indicateur Clé (KPI)</h4>
                 <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    <TableauClassementSimpleImpression titre="Note Moyenne (Livreurs)" donnees={donneesRapport.classementsKpi.chauffeurs.noteMoyenne.top} unite="/5" />
                    <TableauClassementSimpleImpression titre="Note Moyenne (Transporteurs)" donnees={donneesRapport.classementsKpi.transporteurs.noteMoyenne.top} unite="/5" />
                    <TableauClassementSimpleImpression titre="Taux de Succès (Livreurs)" donnees={donneesRapport.classementsKpi.chauffeurs.tauxReussite.top} unite="%" />
                    <TableauClassementSimpleImpression titre="Taux de Succès (Transporteurs)" donnees={donneesRapport.classementsKpi.transporteurs.tauxReussite.top} unite="%" />
                 </div>
            </div>
            <ExemplesCommentairesImpression top={donneesRapport.meilleursCommentaires} flop={donneesRapport.piresCommentaires} />
            <AnalyseCategorielleImpression resultats={donneesRapport.resultatsCategorisation} />
        </CardContent>
    </Card>
);

// --- Composant principal imprimable ---

export function PrintableReport({ donneesRapport, donneesSynthese, objectifs }: RapportImprimableProps) {
  return (
    <div className="printable-content">
        <div className="text-center mb-4 break-after-avoid flex items-center justify-center">
            <Image src="/logos/logo-crf.jpg" alt="Logo CLCV" width={80} height={80} className="rounded-lg mr-4"/>
            <div>
                <h1 className="text-2xl font-bold text-primary">Rapport Qualité des Livraisons</h1>
                <p className="text-sm text-muted-foreground">Analyse détaillée pour la période sélectionnée</p>
            </div>
        </div>

        <div className="break-inside-avoid">
            <h2 className="text-xl font-bold mb-2">Conclusion & Recommandations</h2>
            <ReactMarkdown components={{ p: ({ children }) => <p className="text-sm mb-2">{children}</p> }}>{donneesSynthese.conclusion}</ReactMarkdown>
        </div>
        
        <Separator className="my-4"/>

        {/* Section globale */}
        <div className="mb-4 break-inside-avoid">
            <h2 className="text-xl font-bold mb-2">Vision d'Ensemble</h2>
            <SectionSyntheseImpression titre="Synthèse Globale" synthese={donneesSynthese.global} />
            <SectionAnalyseDetailleeImpression donneesRapport={donneesRapport.global} />
        </div>

        {/* Sections par dépôt */}
        {donneesRapport.depots.map((depot) => {
            const syntheseDepot = donneesSynthese.depots.find(d => d.nom === depot.nom);
            if (!syntheseDepot) return null;
            
            return (
                <div key={depot.nom} className="page-break mb-4 break-inside-avoid">
                    <h2 className="text-xl font-bold mb-2 flex items-center">
                        <LogoDepotImpression nomDepot={depot.nom} />
                        Analyse du Dépôt: {depot.nom}
                    </h2>
                    <SectionSyntheseImpression titre={`Synthèse ${depot.nom}`} synthese={syntheseDepot} />
                    <SectionAnalyseDetailleeImpression donneesRapport={depot} />
                </div>
            );
        })}
    </div>
  );
}
