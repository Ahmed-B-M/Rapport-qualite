
'use client';
import Image from 'next/image';
import { useMemo, useState, useEffect } from 'react';
import { 
    type Livraison, 
    type DonneesRapportPerformance, 
    type Objectifs, 
    type DonneesSectionRapport, 
    type ExempleCommentaire, 
    type EntiteClassement,
    type ResultatSynthese,
    type SyntheseDepot,
    type ResultatsCategorisation,
    CATEGORIES_PROBLEMES,
    type RapportDepot,
    type CommentaireCategorise,
    type CategorieProbleme
} from '@/lib/definitions';
import { genererRapportPerformance } from '@/lib/analysis';
import { generateSynthesis } from '@/lib/synthesis';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
    ThumbsUp, ThumbsDown, GraduationCap, ArrowRightCircle, Target, CheckCircle, XCircle, 
    Clock, Star, MessageCircle, Truck, Award, UserX, Smile, Frown, Users, Percent, BarChart, ClipboardList, ChevronsUpDown
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import ReactMarkdown from 'react-markdown';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';

// --- Définition des Props ---

interface RapportQualiteProps {
  donnees: Livraison[];
  objectifs: Objectifs;
}

const LogoDepot = ({ nomDepot, entrepot }: { nomDepot: string, entrepot?: string }) => {
    const isMagasin = nomDepot === 'Magasin' && entrepot;
    const nomLogo = (isMagasin ? entrepot! : nomDepot).toLowerCase().replace(/\s+/g, '-');
    const urlLogo = `/logos/id-${nomLogo}.jpg`;

    return <Image src={urlLogo} alt={`Logo ${nomDepot}`} width={40} height={40} className="rounded-full inline-block mr-2"/>;
};


// --- Composants d'aide ---

const rendrePoints = (points: string[], icone: React.ReactNode) => (
    <ul className="space-y-3">
        {points.map((point, index) => (
            <li key={index} className="flex items-start">
                <div className="flex-shrink-0 mr-3 mt-1">{icone}</div>
                <ReactMarkdown components={{ p: ({ children }) => <p className="mb-0 text-sm">{children}</p> }}>{point}</ReactMarkdown>
            </li>
        ))}
    </ul>
);

const SectionSynthese = ({ synthese }: { synthese: { forces: string[], faiblesses: string[] } }) => (
    <Card className="shadow-md mb-6">
        <CardHeader><CardTitle className="flex items-center text-xl"><Target className="h-5 w-5 mr-2 text-gray-700" />Synthèse</CardTitle></CardHeader>
        <CardContent className="space-y-6">
            <div>
                <h3 className="font-bold text-lg mb-3 text-green-700 flex items-center"><ThumbsUp className="h-5 w-5 mr-2" />Points forts</h3>
                {synthese.forces.length > 0 ? rendrePoints(synthese.forces, <ArrowRightCircle className="h-4 w-4 text-green-500" />) : <p className="text-sm text-muted-foreground">Aucun point fort majeur identifié.</p>}
            </div>
            <Separator/>
            <div>
                <h3 className="font-bold text-lg mb-3 text-red-700 flex items-center"><ThumbsDown className="h-5 w-5 mr-2" />Axes d'amélioration</h3>
                {synthese.faiblesses.length > 0 ? rendrePoints(synthese.faiblesses, <ArrowRightCircle className="h-4 w-4 text-red-500" />) : <p className="text-sm text-muted-foreground">Aucun axe d'amélioration majeur identifié.</p>}
            </div>
        </CardContent>
    </Card>
);

const CarteKpi = ({ titre, valeur, objectif, meilleurSiEleve, unite = '%' }: { titre: string, valeur: number | undefined, objectif: number, meilleurSiEleve: boolean, unite?: string }) => {
  if (valeur === undefined) {
    return (
        <div className="flex flex-col p-4 border rounded-lg bg-gray-50">
            <h4 className="text-sm text-muted-foreground">{titre}</h4>
            <div className="flex items-center justify-between mt-2"><p className="text-2xl font-bold">N/A</p>{ objectif && <Badge variant="secondary">Objectif: {objectif.toFixed(2)}{unite}</Badge> }</div>
        </div>
    );
  }
  const atteintObjectif = meilleurSiEleve ? valeur >= objectif : valeur <= objectif;
  return (
    <div className="flex flex-col p-4 border rounded-lg bg-white">
      <h4 className="text-sm text-muted-foreground">{titre}</h4>
      <div className="flex items-center justify-between mt-2">
        <p className="text-2xl font-bold">{valeur.toFixed(2)}{unite}</p>
        <Badge variant={atteintObjectif ? 'default' : 'destructive'} className="flex items-center gap-1">
          {atteintObjectif ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          Objectif: {objectif.toFixed(2)}{unite}
        </Badge>
      </div>
    </div>
  );
};

const TableauClassementSimple = ({ titre, icone, donnees, unite }: { titre: string, icone: React.ReactNode, donnees: any[], unite: string }) => (
    <div>
        <h4 className="font-semibold flex items-center mb-2">{icone}{titre}</h4>
        <Table>
            <TableBody>
                {donnees.length > 0 ? donnees.map(item => (
                    <TableRow key={item.nom}>
                        <TableCell>{item.nom}</TableCell>
                        <TableCell className="text-right font-bold">{item.valeur.toFixed(2)}{unite}</TableCell>
                    </TableRow>
                )) : <TableRow><TableCell className="text-muted-foreground text-center">Aucune donnée</TableCell></TableRow>}
            </TableBody>
        </Table>
    </div>
);


const OngletsClassementKpi = ({ donneesRapport }: { donneesRapport: DonneesSectionRapport }) => {
    const kpis = [
        { key: 'noteMoyenne', name: 'Note Moyenne', icon: <Star className="h-4 w-4 mr-2"/>, unit: '/5' },
        { key: 'tauxReussite', name: 'Taux de Succès', icon: <Percent className="h-4 w-4 mr-2"/>, unit: '%' },
        { key: 'tauxPonctualite', name: 'Ponctualité', icon: <Clock className="h-4 w-4 mr-2"/>, unit: '%' },
        { key: 'sentimentMoyen', name: 'Note des Comms', icon: <MessageCircle className="h-4 w-4 mr-2"/>, unit: '/10' }
    ];

    return (
        <div>
            <h3 className="text-lg font-semibold mb-4">Classements par Indicateur Clé (KPI)</h3>
            <Tabs defaultValue="noteMoyenne" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    {kpis.map(kpi => <TabsTrigger key={kpi.key} value={kpi.key}>{kpi.icon}{kpi.name}</TabsTrigger>)}
                </TabsList>
                {kpis.map(kpi => (
                    <TabsContent key={kpi.key} value={kpi.key}>
                        <Card>
                            <CardContent className="p-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <h4 className="font-semibold text-gray-800 mb-2 flex items-center"><Users className="h-5 w-5 mr-2"/> Classement Livreurs</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <TableauClassementSimple titre="Top 3" icone={<Award className="h-4 w-4 mr-1 text-green-600"/>} donnees={donneesRapport.classementsKpi.chauffeurs[kpi.key as keyof typeof donneesRapport.classementsKpi.chauffeurs].top} unite={kpi.unit} />
                                            <TableauClassementSimple titre="Flop 3" icone={<UserX className="h-4 w-4 mr-1 text-red-600"/>} donnees={donneesRapport.classementsKpi.chauffeurs[kpi.key as keyof typeof donneesRapport.classementsKpi.chauffeurs].flop} unite={kpi.unit} />
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-800 mb-2 flex items-center"><Truck className="h-5 w-5 mr-2"/> Classement Transporteurs</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                             <TableauClassementSimple titre="Top 3" icone={<Award className="h-4 w-4 mr-1 text-green-600"/>} donnees={donneesRapport.classementsKpi.transporteurs[kpi.key as keyof typeof donneesRapport.classementsKpi.transporteurs].top} unite={kpi.unit} />
                                            <TableauClassementSimple titre="Flop 3" icone={<UserX className="h-4 w-4 mr-1 text-red-600"/>} donnees={donneesRapport.classementsKpi.transporteurs[kpi.key as keyof typeof donneesRapport.classementsKpi.transporteurs].flop} unite={kpi.unit} />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
};

const ClassementsNotesChauffeur = ({ top, flop }: { top: EntiteClassement[], flop: EntiteClassement[] }) => (
    <div>
        <h3 className="text-lg font-semibold mb-4">Classement des Livreurs par Volume de Notes</h3>
        <div className="grid md:grid-cols-2 gap-6">
            <div>
                <h4 className="font-semibold flex items-center text-green-600 mb-2"><Smile className="h-4 w-4 mr-2" /> Top Notes Positives (4-5 étoiles)</h4>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Livreur</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>{top.map((item, i) => 
                        <TableRow key={i}>
                            <TableCell>
                                {item.nom} {item.noteMoyenne && <span className="text-xs text-muted-foreground">({item.noteMoyenne.toFixed(2)}/5)</span>}
                                <span className="font-bold float-right">({item.nombre})</span>
                            </TableCell>
                        </TableRow>)}
                    </TableBody>
                </Table>
            </div>
            <div>
                <h4 className="font-semibold flex items-center text-red-600 mb-2"><Frown className="h-4 w-4 mr-2" /> Top Notes Négatives (1-2 étoiles)</h4>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Livreur</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>{flop.map((item, i) => 
                        <TableRow key={i}>
                             <TableCell>
                                {item.nom} {item.noteMoyenne && <span className="text-xs text-muted-foreground">({item.noteMoyenne.toFixed(2)}/5)</span>}
                                <span className="font-bold float-right">({item.nombre})</span>
                            </TableCell>
                        </TableRow>)}
                    </TableBody>
                </Table>
            </div>
        </div>
    </div>
);


const ExemplesCommentaires = ({ top, flop }: { top: ExempleCommentaire[], flop: ExempleCommentaire[] }) => (
    <div>
        <h3 className="text-lg font-semibold mb-4">Exemples de Commentaires</h3>
        <div className="grid md:grid-cols-2 gap-6">
            <div>
                <h4 className="font-semibold flex items-center text-green-600 mb-2"><ThumbsUp className="h-4 w-4 mr-2" /> Meilleurs Commentaires</h4>
                {top.map((c, i) => (<div key={i} className="border-l-2 border-green-600 pl-3 mb-3 text-sm italic">"{c.commentaire}"<p className="text-xs text-muted-foreground mt-1 not-italic">- {c.chauffeur} (Note: {c.score.toFixed(2)}/10)</p></div>))}
            </div>
            <div>
                <h4 className="font-semibold flex items-center text-red-600 mb-2"><ThumbsDown className="h-4 w-4 mr-2" /> Pires Commentaires</h4>
                {flop.map((c, i) => (<div key={i} className="border-l-2 border-red-600 pl-3 mb-3 text-sm italic">"{c.commentaire}"<p className="text-xs text-muted-foreground mt-1 not-italic">- {c.chauffeur} (Note: {c.score.toFixed(2)}/10)</p></div>))}
            </div>
        </div>
    </div>
)

const StatefulAnalyseCategorielle = ({ commentaires: initialCommentaires }: { commentaires: CommentaireCategorise[] }) => {
    const [commentaires, setCommentaires] = useState<CommentaireCategorise[]>(initialCommentaires);
    const [openPopover, setOpenPopover] = useState<string | null>(null);

    useEffect(() => {
        setCommentaires(initialCommentaires);
    }, [initialCommentaires]);

    const handleCategoryChange = (commentaire: CommentaireCategorise, newCategory: CategorieProbleme) => {
        setCommentaires(prevCommentaires => 
            prevCommentaires.map(c => 
                c.commentaire === commentaire.commentaire && c.chauffeur === commentaire.chauffeur 
                    ? { ...c, categorie: newCategory } 
                    : c
            )
        );
        setOpenPopover(null); 
    };
    
    const commentairesParCategorie = useMemo(() => {
        return commentaires.reduce((acc, comm) => {
            if (!acc[comm.categorie]) {
                acc[comm.categorie] = [];
            }
            acc[comm.categorie].push(comm);
            return acc;
        }, {} as Record<CategorieProbleme, CommentaireCategorise[]>);
    }, [commentaires]);

    const categoriesAvecCommentaires = CATEGORIES_PROBLEMES.filter(cat => commentairesParCategorie[cat]?.length > 0);

    if (categoriesAvecCommentaires.length === 0) {
        return null;
    }

    return (
        <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center"><ClipboardList className="h-5 w-5 mr-2" />Analyse des Commentaires Négatifs</h3>
            <Tabs defaultValue={categoriesAvecCommentaires[0]} className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    {CATEGORIES_PROBLEMES.map(cat => (
                        <TabsTrigger key={cat} value={cat} disabled={!commentairesParCategorie[cat] || commentairesParCategorie[cat].length === 0}>{cat}</TabsTrigger>
                    ))}
                </TabsList>
                {categoriesAvecCommentaires.map(cat => (
                    <TabsContent key={cat} value={cat}>
                        <Card>
                            <CardContent className="p-4">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-2/5">Commentaire</TableHead>
                                            <TableHead>Livreur</TableHead>
                                            <TableHead>Dépôt</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {commentairesParCategorie[cat].map((comm, index) => (
                                            <TableRow key={index}>
                                                <TableCell className="max-w-[300px] truncate italic">"{comm.commentaire}"</TableCell>
                                                <TableCell>{comm.chauffeur}</TableCell>
                                                <TableCell>{comm.depot}</TableCell>
                                                <TableCell className="text-right">
                                                    <Popover open={openPopover === `${cat}-${index}`} onOpenChange={(isOpen) => setOpenPopover(isOpen ? `${cat}-${index}` : null)}>
                                                        <PopoverTrigger asChild>
                                                            <Button variant="outline" role="combobox" aria-expanded={openPopover === `${cat}-${index}`} className="w-[150px] justify-between text-xs h-8">
                                                                Déplacer vers...
                                                                <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-[200px] p-0">
                                                            <Command>
                                                                <CommandInput placeholder="Changer catégorie..." />
                                                                <CommandEmpty>Aucune catégorie.</CommandEmpty>
                                                                <CommandGroup>
                                                                    {CATEGORIES_PROBLEMES.filter(c => c !== cat).map(newCat => (
                                                                        <CommandItem
                                                                            key={newCat}
                                                                            onSelect={() => handleCategoryChange(comm, newCat)}
                                                                        >
                                                                            {newCat}
                                                                        </CommandItem>
                                                                    ))}
                                                                </CommandGroup>
                                                            </Command>
                                                        </PopoverContent>
                                                    </Popover>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
};


const SectionAnalyseDetaillee = ({ donneesRapport, objectifs }: { donneesRapport: DonneesSectionRapport, objectifs: Objectifs }) => {
    return (
    <Card>
        <CardHeader>
            <CardTitle className="flex items-center"><BarChart className="h-5 w-5 mr-2" />Analyse Détaillée</CardTitle>
            <CardDescription>Total de {donneesRapport.statistiques.totalLivraisons} livraisons analysées.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <CarteKpi titre="Taux de Succès" valeur={donneesRapport.statistiques.tauxReussite} objectif={100 - objectifs.tauxEchec} meilleurSiEleve={true} />
                <CarteKpi titre="Note Moyenne" valeur={donneesRapport.statistiques.noteMoyenne} objectif={objectifs.noteMoyenne} meilleurSiEleve={true} unite="/5" />
                <CarteKpi titre="Note des Commentaires" valeur={donneesRapport.statistiques.sentimentMoyen} objectif={objectifs.sentimentMoyen} meilleurSiEleve={true} unite="/10" />
                <CarteKpi titre="Ponctualité" valeur={donneesRapport.statistiques.tauxPonctualite} objectif={objectifs.tauxPonctualite} meilleurSiEleve={true} />
            </div>
            <Separator />
            <ClassementsNotesChauffeur top={donneesRapport.chauffeursMieuxNotes} flop={donneesRapport.chauffeursMoinsBienNotes} />
            <Separator />
            <ExemplesCommentaires top={donneesRapport.meilleursCommentaires} flop={donneesRapport.piresCommentaires} />
            <Separator />
            <StatefulAnalyseCategorielle commentaires={donneesRapport.commentaires} />
            <Separator />
            <OngletsClassementKpi donneesRapport={donneesRapport} />
        </CardContent>
    </Card>
)};

// --- Composant Principal du Rapport ---

export function QualityReport({ donnees, objectifs }: RapportQualiteProps) {
  const donneesRapport = useMemo(() => {
      if (!donnees) return null;
      return genererRapportPerformance(donnees, 'depot');
  }, [donnees]);

  const donneesSynthese = useMemo(() => {
      if (!donneesRapport) return null;
      return generateSynthesis(donneesRapport, objectifs);
  }, [donneesRapport, objectifs]);

  if (!donneesRapport || !donneesSynthese) {
      return <div>Génération du rapport en cours...</div>;
  }

  return (
    <div className="bg-gray-50 p-4 sm:p-6 rounded-lg">
        <div className="mb-8">
             <div className="mb-6 print-header"><h1 className="text-3xl font-bold font-headline text-primary mb-2 print-title">Rapport Qualité</h1><p className="text-muted-foreground">Analyse globale et par dépôt.</p></div>
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-lg">
                <CardHeader><CardTitle className="flex items-center text-2xl font-bold text-blue-800"><GraduationCap className="h-6 w-6 mr-3 text-blue-600" />Conclusion & Recommandations</CardTitle></CardHeader>
                <CardContent><ReactMarkdown components={{ p: ({ children }) => <p className="text-base text-gray-700 leading-relaxed">{children}</p> }}>{donneesSynthese.conclusion}</ReactMarkdown></CardContent>
            </Card>
        </div>
        <Tabs defaultValue="global">
            <TabsList className="h-auto flex-wrap justify-start gap-1">
                <TabsTrigger value="global">Vision d'Ensemble</TabsTrigger>
                {donneesSynthese.depots.map((depot: SyntheseDepot) => {
                    const rapportDepot = donneesRapport.depots.find((d: RapportDepot) => d.nom === depot.nom && d.entrepot === depot.entrepot);
                    if (!rapportDepot) return null;
                    const key = depot.entrepot ? `${depot.nom}_${depot.entrepot}` : depot.nom;
                    const label = depot.entrepot ? `${depot.nom} (${depot.entrepot})` : depot.nom;
                    return (
                        <TabsTrigger key={key} value={key}>
                            <LogoDepot nomDepot={rapportDepot.nom} entrepot={rapportDepot.entrepot} />
                            {label}
                        </TabsTrigger>
                    )
                })}
            </TabsList>
            <TabsContent value="global" className="mt-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    <div className="lg:col-span-1"><SectionSynthese synthese={donneesSynthese.global} /></div>
                    <div className="lg:col-span-2"><SectionAnalyseDetaillee donneesRapport={donneesRapport.global} objectifs={objectifs} /></div>
                </div>
            </TabsContent>
            {donneesRapport.depots.map((rapportDepot) => {
                const syntheseDepot = donneesSynthese.depots.find((d: SyntheseDepot) => d.nom === rapportDepot.nom && d.entrepot === rapportDepot.entrepot);
                 const key = rapportDepot.entrepot ? `${rapportDepot.nom}_${rapportDepot.entrepot}` : rapportDepot.nom;
                return (
                    <TabsContent key={key} value={key} className="mt-4">
                         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                            <div className="lg:col-span-1">{syntheseDepot && <SectionSynthese synthese={syntheseDepot} />}</div>
                            <div className="lg:col-span-2"><SectionAnalyseDetaillee donneesRapport={rapportDepot} objectifs={objectifs}/></div>
                        </div>
                    </TabsContent>
                )
            })}
        </Tabs>
    </div>
  );
}
