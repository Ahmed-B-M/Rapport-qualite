

'use client';

import { useState, useMemo } from 'react';
import { GlobalPerformance } from './global-performance';
import { type Livraison, type StatistiquesAgregees } from '@/lib/definitions';
import { filtrerDonneesParDepot, getStatistiquesGlobales, agregerStatistiquesParEntite, analyserCommentaires, getDonneesSerieTemporelle } from '@/lib/analysis';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList, CartesianGrid, LineChart, Line, Legend } from 'recharts';
import { StatCard } from './stat-card';
import { CheckCircle, XCircle, Star, Clock, Percent, Users, User, Truck, MessageCircle } from 'lucide-react';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { subDays } from 'date-fns';

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

const FeedbackChart = ({ data }: { data: { categorie: string, nombre: number }[] }) => {
    if (!data || data.length === 0) {
        return <div className="text-center text-sm text-muted-foreground">Aucun retour client à analyser pour cette sélection.</div>;
    }

    return (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="categorie" tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="nombre" name="Nombre de mentions" fill="hsl(var(--primary))">
                    <LabelList dataKey="nombre" position="right" />
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};

const TrendChart = ({ data, lineKey, yAxisLabel, yAxisId = "left", color, domain }: { data: any[], lineKey: string, yAxisLabel: string, yAxisId?: "left" | "right", color: string, domain?: [number, number] }) => {
    return (
        <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis yAxisId={yAxisId} orientation={yAxisId} stroke={color} tick={{ fontSize: 10 }} domain={domain} label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', offset: 0, style: { textAnchor: 'middle', fill: color } }} />
                <Tooltip />
                <Legend />
                <Line yAxisId={yAxisId} type="monotone" dataKey={lineKey} name={yAxisLabel} stroke={color} dot={false} />
            </LineChart>
        </ResponsiveContainer>
    );
};


export function Overview({ donnees }: ApercuProps) {
  const [depotActif, setDepotActif] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 29),
    to: new Date(),
  });

  const depotsUniques = useMemo(() => {
    const depots = new Set(donnees.map(d => d.depot));
    return ['all', ...Array.from(depots).sort()];
  }, [donnees]);

  const donneesFiltrees = useMemo(() => {
    let data = donnees;
    if (dateRange?.from && dateRange?.to) {
        data = data.filter(d => {
            const date = new Date(d.date);
            return date >= (dateRange.from as Date) && date <= (dateRange.to as Date);
        });
    }
    return filtrerDonneesParDepot(data, depotActif);
  }, [donnees, depotActif, dateRange]);

  const statistiquesGlobalesDepot = useMemo(() => {
    if (!donneesFiltrees) return null;
    return getStatistiquesGlobales(donneesFiltrees);
  }, [donneesFiltrees]);

  const statsTransporteurs = useMemo(() => {
    const stats = agregerStatistiquesParEntite(donneesFiltrees, 'transporteur');
    return Object.entries(stats).map(([nom, stat]) => ({ nom, ...stat }))
      .sort((a, b) => b.totalLivraisons - a.totalLivraisons);
  }, [donneesFiltrees]);

  const feedbackData = useMemo(() => {
    const commentaires = donneesFiltrees.map(d => d.commentaireRetour).filter(Boolean) as string[];
    const analyse = analyserCommentaires(commentaires);
    return Object.entries(analyse)
        .map(([categorie, { count }]) => ({ categorie, nombre: count }))
        .filter(item => item.nombre > 0)
        .sort((a, b) => b.nombre - a.nombre);
  }, [donneesFiltrees]);

  const trendData = useMemo(() => {
      return getDonneesSerieTemporelle(donneesFiltrees);
  }, [donneesFiltrees]);

  if (!statistiquesGlobalesDepot) {
      return <div className="p-4 text-center">Chargement des données ou aucune donnée pour la sélection...</div>
  }

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <h2 className="text-2xl font-bold">Aperçu de la Performance</h2>
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                <DateRangePicker date={dateRange} onDateChange={setDateRange} />
                <div className="w-full sm:w-64">
                    <Select value={depotActif} onValueChange={setDepotActif}>
                        <SelectTrigger><SelectValue placeholder="Filtrer par dépôt..." /></SelectTrigger>
                        <SelectContent>
                        {depotsUniques.map(d => <SelectItem key={d} value={d}>{d === 'all' ? 'Tous les dépôts' : d}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
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

        <Card>
            <CardHeader>
                <CardTitle>Evolution du Taux de Succès</CardTitle>
                <CardDescription>Tendances du taux de succès sur la période sélectionnée.</CardDescription>
            </CardHeader>
            <CardContent>
                <TrendChart data={trendData} lineKey="tauxReussite" yAxisLabel="Taux de Succès (%)" color="hsl(var(--primary))" domain={[0, 100]} />
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>Evolution de la Note Moyenne</CardTitle>
                <CardDescription>Tendances de la note moyenne sur la période sélectionnée.</CardDescription>
            </CardHeader>
            <CardContent>
                 <TrendChart data={trendData} lineKey="noteMoyenne" yAxisLabel="Note Moyenne" color="hsl(var(--primary))" domain={[1, 5]} />
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Evolution de la Ponctualité</CardTitle>
                <CardDescription>Tendances de la ponctualité sur la période sélectionnée.</CardDescription>
            </CardHeader>
            <CardContent>
                 <TrendChart data={trendData} lineKey="tauxPonctualite" yAxisLabel="Taux de Ponctualité (%)" color="hsl(var(--primary))" domain={[0, 100]} />
            </CardContent>
        </Card>


        <div className="grid lg:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Analyse des Retours Clients</CardTitle>
                    <CardDescription>Principaux motifs d'insatisfaction mentionnés dans les commentaires.</CardDescription>
                </CardHeader>
                <CardContent>
                    <FeedbackChart data={feedbackData} />
                </CardContent>
            </Card>

            {statsTransporteurs.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Performance par Transporteur</CardTitle>
                        <CardDescription>Note moyenne des transporteurs sur la période.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={statsTransporteurs.map(d => ({ nom: d.nom, valeur: d.noteMoyenne || 0 }))} layout="vertical" margin={{ left: 50 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} />
                                <YAxis type="category" dataKey="nom" tick={{ fontSize: 12 }} />
                                <Tooltip formatter={(value: number) => `${value.toFixed(2)}/5`} />
                                <Bar dataKey="valeur" name="Note Moyenne" fill="hsl(var(--primary))">
                                    <LabelList dataKey="valeur" position="right" formatter={(value: number) => value.toFixed(2)} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}
        </div>
      <GlobalPerformance 
        data={donneesFiltrees} 
        depotsUniques={depotsUniques}
        depotActif={depotActif}
        setDepotActif={setDepotActif}
      />
    </div>
  );
}
