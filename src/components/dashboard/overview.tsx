

'use client';

import { useState, useMemo } from 'react';
import { GlobalPerformance } from './global-performance';
import { type Livraison, type StatistiquesAgregees } from '@/lib/definitions';
import { filtrerDonneesParDepot, getStatistiquesGlobales, agregerStatistiquesParEntite } from '@/lib/analysis';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList, CartesianGrid } from 'recharts';
import { StatCard } from './stat-card';
import { CheckCircle, XCircle, Star, Clock, Percent, Users, User, Truck } from 'lucide-react';


interface ApercuProps {
  donnees: Livraison[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-2 bg-background border rounded-md shadow-md">
          <p className="font-bold">{label}</p>
          <p className="text-sm">{`${payload[0].name}: ${payload[0].value.toFixed(2)}%`}</p>
        </div>
      );
    }
    return null;
};

const TransporteurPerformanceChart = ({ data }: { data: (StatistiquesAgregees & { nom: string })[]}) => {
    
    const chartData = [
        { name: 'Taux de Succès', kpi: 'tauxReussite' },
        { name: 'Ponctualité', kpi: 'tauxPonctualite' }
    ];

    const noteMoyenneData = data.map(d => ({
        nom: d.nom,
        valeur: d.noteMoyenne || 0
    }));

    return (
        <div className="grid md:grid-cols-3 gap-6">
             <Card>
                <CardHeader>
                    <CardTitle className="text-base">Note Moyenne / Transporteur</CardTitle>
                </CardHeader>
                <CardContent>
                     <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={noteMoyenneData} layout="vertical" margin={{ top: 5, right: 20, left: 50, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} />
                            <YAxis type="category" dataKey="nom" width={50} tick={{ fontSize: 12 }} />
                            <Tooltip formatter={(value: number) => `${value.toFixed(2)}/5`} />
                            <Bar dataKey="valeur" name="Note Moyenne" fill="hsl(var(--primary))" barSize={20}>
                                <LabelList dataKey="valeur" position="right" formatter={(value: number) => value.toFixed(2)} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
             </Card>

            {chartData.map(chart => (
                 <Card key={chart.name}>
                    <CardHeader>
                        <CardTitle className="text-base">{chart.name} / Transporteur</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                             <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 50, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" domain={[0, 100]} unit="%" />
                                <YAxis type="category" dataKey="nom" width={50} tick={{ fontSize: 12 }}/>
                                <Tooltip formatter={(value: number) => `${value.toFixed(2)}%`} />
                                <Bar dataKey={chart.kpi} name={chart.name} fill="hsl(var(--primary))" barSize={20}>
                                    <LabelList dataKey={chart.kpi} position="right" formatter={(value: number) => `${value.toFixed(2)}%`} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

export function Overview({ donnees }: ApercuProps) {
  const [depotActif, setDepotActif] = useState<string>('all');

  const depotsUniques = useMemo(() => {
    const depots = new Set(donnees.map(d => d.depot));
    return ['all', ...Array.from(depots).sort()];
  }, [donnees]);

  const donneesDepot = useMemo(() => filtrerDonneesParDepot(donnees, depotActif), [donnees, depotActif]);
  
  const statistiquesGlobalesDepot = useMemo(() => {
    if (!donneesDepot) return null;
    return getStatistiquesGlobales(donneesDepot);
  }, [donneesDepot]);

  const statsTransporteurs = useMemo(() => {
    const stats = agregerStatistiquesParEntite(donneesDepot, 'transporteur');
    return Object.entries(stats).map(([nom, stat]) => ({ nom, ...stat }))
      .sort((a, b) => b.totalLivraisons - a.totalLivraisons);
  }, [donneesDepot]);

  if (!statistiquesGlobalesDepot) {
      return <div className="p-4 text-center">Chargement des données...</div>
  }

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Aperçu de la Performance</h2>
            <div className="w-64">
                <Select value={depotActif} onValueChange={setDepotActif}>
                    <SelectTrigger><SelectValue placeholder="Filtrer par dépôt..." /></SelectTrigger>
                    <SelectContent>
                    {depotsUniques.map(d => <SelectItem key={d} value={d}>{d === 'all' ? 'Tous les dépôts' : d}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Indicateurs Clés - {depotActif === 'all' ? 'Global' : depotActif}</CardTitle>
                <CardDescription>Performance globale pour la sélection actuelle ({statistiquesGlobalesDepot.totalLivraisons} livraisons).</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard titre="Taux de Succès" valeur={`${statistiquesGlobalesDepot.tauxReussite.toFixed(2)}%`} icone={<CheckCircle className="text-green-500" />} description={`${statistiquesGlobalesDepot.nombreLivraisonsReussies} livraisons réussies`} />
                <StatCard titre="Taux d'Échec" valeur={`${(100 - statistiquesGlobalesDepot.tauxReussite).toFixed(2)}%`} icone={<XCircle className="text-red-500" />} description={`${statistiquesGlobalesDepot.totalLivraisons - statistiquesGlobalesDepot.nombreLivraisonsReussies} échecs`} />
                <StatCard titre="Note Moyenne" valeur={statistiquesGlobalesDepot.noteMoyenne ? statistiquesGlobalesDepot.noteMoyenne.toFixed(2) : 'N/A'} icone={<Star className="text-yellow-400" />} description={`${statistiquesGlobalesDepot.nombreNotes} évaluations`} />
                <StatCard titre="Ponctualité" valeur={`${statistiquesGlobalesDepot.tauxPonctualite.toFixed(2)}%`} icone={<Clock className="text-blue-500" />} description={`${statistiquesGlobalesDepot.nombreRetards} retards`} />
            </CardContent>
             <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard titre="Taux de Notation" valeur={`${statistiquesGlobalesDepot.tauxNotation.toFixed(2)}%`} icone={<Percent />} description={`${statistiquesGlobalesDepot.nombreNotes} livraisons notées`} />
                <StatCard titre="Forcé Sur Place" valeur={`${statistiquesGlobalesDepot.tauxForceSurSite.toFixed(2)}%`} icone={<User />} description={`${statistiquesGlobalesDepot.nombreForceSurSite} cas`} />
                <StatCard titre="Forcé Sans Contact" valeur={`${statistiquesGlobalesDepot.tauxForceSansContact.toFixed(2)}%`} icone={<User />} description={`${statistiquesGlobalesDepot.nombreForceSansContact} cas`} />
                <StatCard titre="Validation Web" valeur={`${statistiquesGlobalesDepot.tauxCompletionWeb.toFixed(2)}%`} icone={<Truck />} description={`${statistiquesGlobalesDepot.nombreCompletionWeb} cas`} />
            </CardContent>
        </Card>

        {statsTransporteurs.length > 0 && (
            <Card>
                <CardHeader>
                    <CardTitle>Performance par Transporteur - {depotActif === 'all' ? 'Global' : depotActif}</CardTitle>
                    <CardDescription>Comparaison des transporteurs sur les indicateurs clés pour la sélection actuelle.</CardDescription>
                </CardHeader>
                <CardContent>
                    <TransporteurPerformanceChart data={statsTransporteurs} />
                </CardContent>
            </Card>
        )}

      <GlobalPerformance 
        data={donneesDepot} 
        depotsUniques={depotsUniques}
        depotActif={depotActif}
        setDepotActif={setDepotActif}
      />
    </div>
  );
}
