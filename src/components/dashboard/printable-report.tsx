
'use client';

import React from 'react';
import { type DonneesRapportPerformance, type Objectifs } from '@/lib/definitions';
import { ReportHeader } from '../report/report-header';
import { ReportSection } from '../report/report-section';
import { KpiGrid } from '../report/kpi-grid';
import { CommentsSection } from '../report/comments-section';
import { Rankings } from '../report/rankings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, LabelList } from 'recharts';

interface RapportImprimableProps {
    donnees: DonneesRapportPerformance;
    objectifs: Objectifs;
    depotSelectionne: string;
    plageDates: string;
    typeRapport: 'hebdomadaire' | 'mensuel' | 'personnalise';
}

export const PrintableReport = React.forwardRef<HTMLDivElement, RapportImprimableProps>(
    ({ donnees, objectifs, depotSelectionne, plageDates, typeRapport }, ref) => {
        const depotData = donnees.depots.find(d => d.nom === depotSelectionne) || donnees.global;
        if (!depotData) return <div ref={ref}>Aucune donnée pour le rapport.</div>;

        const kpis = [
            { title: "Taux de Succès", value: depotData.statistiques.tauxReussite, target: 100 - objectifs.tauxEchec, higherIsBetter: true },
            { title: "Note Moyenne", value: depotData.statistiques.noteMoyenne, target: objectifs.noteMoyenne, isRate: false, higherIsBetter: true },
            { title: "Ponctualité", value: depotData.statistiques.tauxPonctualite, target: objectifs.tauxPonctualite, higherIsBetter: true },
            { title: "Taux de Notation", value: depotData.statistiques.tauxNotation, target: 80, higherIsBetter: true },
        ];
        
        const commentaireData = Object.entries(depotData.resultatsCategorisation)
            .map(([categorie, chauffeurs]) => ({
                categorie,
                nombre: chauffeurs.reduce((acc, curr) => acc + curr.recurrence, 0)
            }))
            .filter(item => item.nombre > 0)
            .sort((a, b) => b.nombre - a.nombre);

        return (
            <div ref={ref} className="bg-white text-gray-900 p-8 font-sans">
                <ReportHeader typeRapport={typeRapport} depotSelectionne={depotSelectionne} plageDates={plageDates} />

                <ReportSection title="Indicateurs de Performance Clés (KPIs)" description="Vue d'ensemble des principaux indicateurs de performance pour la période sélectionnée.">
                    <KpiGrid kpis={kpis} />
                </ReportSection>

                <ReportSection title="Classements des Chauffeurs" description="Identification des chauffeurs les plus et les moins performants sur les indicateurs clés.">
                    <div className="grid grid-cols-2 gap-8">
                        <Rankings title="Note Moyenne" top={depotData.classementsKpi.chauffeurs.noteMoyenne.top} flop={depotData.classementsKpi.chauffeurs.noteMoyenne.flop} unit="/5" />
                        <Rankings title="Taux de Succès" top={depotData.classementsKpi.chauffeurs.tauxReussite.top} flop={depotData.classementsKpi.chauffeurs.tauxReussite.flop} unit="%" />
                        <Rankings title="Ponctualité" top={depotData.classementsKpi.chauffeurs.tauxPonctualite.top} flop={depotData.classementsKpi.chauffeurs.tauxPonctualite.flop} unit="%" />
                    </div>
                </ReportSection>

                <ReportSection title="Analyse des Retours Clients" description="Examen qualitatif des retours clients pour identifier les points forts et les axes d'amélioration.">
                    <CommentsSection positiveComments={depotData.meilleursCommentaires} negativeComments={depotData.piresCommentaires} />
                </ReportSection>
                
                <ReportSection title="Analyse des Commentaires Négatifs" description="Répartition des commentaires négatifs par catégorie de problème.">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-xl">Répartition par Catégorie</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={commentaireData} layout="vertical" margin={{ left: 100, right: 40 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" />
                                    <YAxis type="category" dataKey="categorie" tick={{ fontSize: 12 }} />
                                    <Tooltip />
                                    <Bar dataKey="nombre" name="Nombre de mentions" fill="#3b82f6">
                                        <LabelList dataKey="nombre" position="right" />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </ReportSection>
            </div>
        );
    }
);

PrintableReport.displayName = 'PrintableReport';
