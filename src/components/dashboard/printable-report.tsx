"use client";

import React, { forwardRef } from 'react';
import { type DonneesRapportPerformance, type Objectifs, type SyntheseDepot, type ResultatSynthese, type DonneesSectionRapport } from '@/lib/definitions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, TrendingUp, TrendingDown } from 'lucide-react';

// --- Sub-components for report sections ---

const KpiCard = ({ title, value, target, isRate = true, higherIsBetter = true }: { title: string, value: number | undefined, target: number, isRate?: boolean, higherIsBetter?: boolean }) => {
    if (value === undefined) {
        return (
            <div className="flex flex-col items-center justify-center p-2 text-center bg-gray-50 rounded-lg">
                <span className="text-xs font-semibold text-gray-600">{title}</span>
                <span className="text-lg font-bold text-gray-400">N/A</span>
            </div>
        );
    }

    const displayValue = isRate ? `${value.toFixed(2)}%` : value.toFixed(2);
    const isSuccess = higherIsBetter ? value >= target : value <= target;

    return (
        <div className="flex flex-col items-center justify-center p-2 text-center bg-gray-50 rounded-lg">
            <span className="text-xs font-semibold text-gray-600">{title}</span>
            <div className="flex items-center gap-1">
                <span className={`text-lg font-bold ${isSuccess ? 'text-green-600' : 'text-red-600'}`}>
                    {displayValue}
                </span>
                {isSuccess ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
            </div>
            <span className="text-xs text-gray-500">Objectif: {target.toFixed(2)}{isRate ? '%' : ''}</span>
        </div>
    );
};

const SynthesisSection = ({ title, synthesis }: { title: string, synthesis: ResultatSynthese['global'] | SyntheseDepot }) => {
    return (
        <div>
            <h3 className="text-md font-semibold mb-2">{title}</h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                    <h4 className="font-semibold flex items-center gap-1 text-green-700"><TrendingUp className="h-4 w-4" /> Forces</h4>
                    <ul className="list-disc pl-4 mt-1 space-y-1">
                        {synthesis.forces.map((force, i) => <li key={i}>{force}</li>)}
                    </ul>
                </div>
                <div>
                    <h4 className="font-semibold flex items-center gap-1 text-red-700"><TrendingDown className="h-4 w-4" /> Faiblesses</h4>
                    <ul className="list-disc pl-4 mt-1 space-y-1">
                        {synthesis.faiblesses.map((faiblesse, i) => <li key={i}>{faiblesse}</li>)}
                    </ul>
                </div>
            </div>
        </div>
    );
};

interface SectionRapportProps {
    titre: string;
    synthese: ResultatSynthese['global'] | SyntheseDepot;
    donneesRapport: {
        statistiques: {
            tauxReussite: number | undefined;
            noteMoyenne: number | undefined;
            sentimentMoyen?: number;
            tauxPonctualite: number | undefined;
        }
    };
    objectifs: Objectifs;
}

const SectionRapport = ({ titre, synthese, donneesRapport, objectifs }: SectionRapportProps) => {
    const stats = donneesRapport.statistiques;
    const tauxEchec = stats.tauxReussite !== undefined ? 100 - stats.tauxReussite : undefined;

    return (
        <Card className="break-inside-avoid-page mb-4">
            <CardHeader>
                <CardTitle className="text-lg">{titre}</CardTitle>
                {'entrepot' in synthese && synthese.entrepot && (
                    <CardDescription>{synthese.entrepot}</CardDescription>
                )}
            </CardHeader>
            <CardContent className="text-sm">
                <div className="grid grid-cols-4 gap-2 mb-4">
                    <KpiCard title="Taux d'échec" value={tauxEchec} target={objectifs.tauxEchec} higherIsBetter={false} />
                    <KpiCard title="Note Moyenne" value={stats.noteMoyenne} target={objectifs.noteMoyenne} isRate={false} />
                    <KpiCard title="Note Commentaires" value={stats.sentimentMoyen} target={objectifs.sentimentMoyen} isRate={false} />
                    <KpiCard title="Ponctualité" value={stats.tauxPonctualite} target={objectifs.tauxPonctualite} />
                </div>
                <Separator className="my-3" />
                <SynthesisSection title="Synthèse Qualitative" synthesis={synthese} />
            </CardContent>
        </Card>
    );
};


// --- Main Printable Component ---

interface PrintableReportProps {
    donneesRapport: DonneesRapportPerformance;
    donneesSynthese: ResultatSynthese;
    objectifs: Objectifs;
    dateRange: string;
    depotSelectionne: string;
}

export const PrintableReport = forwardRef<HTMLDivElement, PrintableReportProps>(
    ({ donneesRapport, donneesSynthese, objectifs, dateRange, depotSelectionne }, ref) => {
        return (
            <div ref={ref} className="bg-white text-gray-900 text-xs p-4 print-container">
                {/* Header */}
                <header className="mb-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold">Rapport de Performance Qualité</h1>
                            <p className="text-gray-600">Généré le {new Date().toLocaleDateString('fr-FR')}</p>
                        </div>
                        <div className="text-right">
                             <img src="/logos/logo-crf.jpg" alt="Logo" className="h-12" />
                        </div>
                    </div>
                    <div className="mt-4 text-sm">
                        <p><span className="font-semibold">Période :</span> {dateRange}</p>
                        <p><span className="font-semibold">Dépôt(s) :</span> {depotSelectionne}</p>
                    </div>
                </header>
                
                <main>
                    {/* Global Section */}
                    <SectionRapport
                        titre="Synthèse Globale"
                        synthese={donneesSynthese.global}
                        donneesRapport={{statistiques: donneesRapport.global.statistiques}}
                        objectifs={objectifs}
                    />
                     <Card className="break-inside-avoid-page mb-4">
                        <CardHeader>
                            <CardTitle className="text-lg">Analyse Détaillée Globale</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <AnalyseSection title="Analyse des Échecs" data={donneesRapport.global} type="echecs" />
                            <Separator className="my-3"/>
                            <AnalyseSection title="Analyse de la Satisfaction Client" data={donneesRapport.global} type="satisfaction" />
                        </CardContent>
                    </Card>

                    <div className="page-break"><!-- Page break for printing --></div>

                    {/* Depot Sections */}
                    {donneesRapport.depots.map((depotData, index) => {
                        const syntheseDepot = donneesSynthese.depots.find(d => d.nom === depotData.nom);
                        if (!syntheseDepot) return null;

                        return (
                            <React.Fragment key={depotData.nom}>
                                <SectionRapport
                                    titre={`Synthèse - ${depotData.nom}`}
                                    synthese={syntheseDepot}
                                    donneesRapport={{statistiques: depotData.statistiques}}
                                    objectifs={objectifs}
                                />
                                 <Card className="break-inside-avoid-page mb-4">
                                    <CardHeader>
                                        <CardTitle className="text-lg">Analyse Détaillée - {depotData.nom}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <AnalyseSection title="Analyse des Échecs" data={depotData} type="echecs" />
                                        <Separator className="my-3"/>
                                        <AnalyseSection title="Analyse de la Satisfaction Client" data={depotData} type="satisfaction" />
                                    </CardContent>
                                </Card>
                                {/* Add page break except for the last element */}
                                {index < donneesRapport.depots.length - 1 && <div className="page-break"></div>}
                            </React.Fragment>
                        );
                    })}
                </main>
            </div>
        );
    }
);

PrintableReport.displayName = 'PrintableReport';


const AnalyseSection = ({ title, data, type }: { title: string, data: DonneesSectionRapport, type: 'echecs' | 'satisfaction' }) => {
    const chauffeurs = type === 'echecs' 
        ? data.classementsKpi.chauffeurs.tauxReussite.flop
        : data.chauffeursMoinsBienNotes;
    
    const transporteurs = type === 'echecs' 
        ? data.classementsKpi.transporteurs.tauxReussite.flop
        : data.classementsKpi.transporteurs.noteMoyenne.flop;

    return (
        <div>
            <h3 className="font-semibold mb-2">{title}</h3>
            <div className="grid grid-cols-2 gap-x-6">
                <div className="break-inside-avoid">
                    <h4 className="font-semibold text-xs mb-1">Classement Flop Livreurs</h4>
                    <ul className="text-xs space-y-1">
                        {chauffeurs.slice(0, 5).map(c => (
                            <li key={c.nom} className="flex justify-between">
                                <span>{c.nom.replace(/\s*\([^)]*\)$/, '').trim()}</span>
                                <span className="font-semibold">
                                    {type === 'echecs' ? `${(100 - c.valeur).toFixed(2)}%` : `${(c as any).noteMoyenne.toFixed(2)}/5`}
                                    <span className="text-gray-500 text-2xs"> ({type === 'echecs' ? `${(c as any).livraisonsRatees} cas` : `${(c as any).nombre} notes`})</span>
                                </span>
                            </li>
                        ))}
                         {chauffeurs.length === 0 && <li className="text-gray-500">Aucune donnée</li>}
                    </ul>
                </div>

                <div className="break-inside-avoid">
                     <h4 className="font-semibold text-xs mb-1">Classement Flop Transporteurs</h4>
                     <ul className="text-xs space-y-1">
                        {transporteurs.slice(0, 5).map(t => (
                            <li key={t.nom} className="flex justify-between">
                                <span>{t.nom}</span>
                                <span className="font-semibold">
                                     {type === 'echecs' ? `${(100 - t.valeur).toFixed(2)}%` : `${t.valeur.toFixed(2)}/5`}
                                      <span className="text-gray-500 text-2xs"> ({type === 'echecs' ? `${(t as any).livraisonsRatees} cas` : `${(t as any).nombreNotes} notes`})</span>
                                </span>
                            </li>
                        ))}
                        {transporteurs.length === 0 && <li className="text-gray-500">Aucune donnée</li>}
                    </ul>
                </div>

                {type === 'satisfaction' && (
                     <div className="col-span-2 mt-2 break-inside-avoid">
                        <h4 className="font-semibold text-xs mb-1">Analyse des commentaires négatifs</h4>
                        <div className="grid grid-cols-2 gap-x-6">
                        {Object.entries(data.resultatsCategorisation).map(([categorie, chauffeurs]) => {
                           if (chauffeurs.length === 0) return null;
                           return (
                               <div key={categorie} className="mb-2">
                                   <h5 className="font-semibold text-2xs capitalize">{categorie} ({chauffeurs.reduce((acc, c) => acc + c.recurrence, 0)})</h5>
                                    <ul className="text-2xs list-disc pl-3">
                                        {chauffeurs.slice(0,2).map(c => (
                                             <li key={c.nom}>{c.nom.replace(/\s*\([^)]*\)$/, '').trim()} ({c.recurrence})</li>
                                        ))}
                                    </ul>
                               </div>
                           )
                        })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// Styles for printing
const PrintStyles = () => (
    <style jsx global>{`
        @media print {
            @page {
                size: A4;
                margin: 0.5in;
            }
            body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .print-container {
                font-size: 10pt;
            }
            .no-print {
                display: none;
            }
            .page-break {
                page-break-before: always;
            }
            .break-inside-avoid {
                page-break-inside: avoid;
            }
            .break-inside-avoid-page {
                 page-break-inside: avoid;
            }
        }
    `}</style>
);

interface ComponentToPrintProps {
    donneesRapport: DonneesRapportPerformance;
    donneesSynthese: ResultatSynthese;
    objectifs: Objectifs;
    dateRange: string;
    depotSelectionne: string;
}

export const ComponentToPrint = forwardRef<HTMLDivElement, ComponentToPrintProps>(
    ({ donneesRapport, donneesSynthese, objectifs, dateRange, depotSelectionne }, ref) => {
        return (
            <div>
                <PrintStyles />
                <PrintableReport 
                    ref={ref} 
                    donneesRapport={donneesRapport} 
                    donneesSynthese={donneesSynthese} 
                    objectifs={objectifs}
                    dateRange={dateRange}
                    depotSelectionne={depotSelectionne}
                />
            </div>
        );
    }
);

ComponentToPrint.displayName = 'ComponentToPrint';
