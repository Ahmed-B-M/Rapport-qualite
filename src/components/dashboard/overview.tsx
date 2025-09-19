"use client"

import { useMemo } from 'react';
import { type Delivery } from '@/lib/definitions';
import { type Objectives } from '@/app/page';
import { getOverallStats, aggregateStats } from '@/lib/data-processing';
import { StatCard } from '@/components/dashboard/stat-card';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCircle, Star, Timer, Ban, Globe, Target, PenSquare, PackageSearch } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { Bar, Pie, Cell, PieChart, BarChart as RechartsBarChart, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export function Overview({ data, objectives }: { data: Delivery[], objectives: Objectives }) {
    const overallStats = useMemo(() => getOverallStats(data), [data]);
    
    const ratingDistribution = useMemo(() => {
        const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        data.forEach(d => {
            if (d.deliveryRating) {
                counts[d.deliveryRating]++;
            }
        });
        return Object.entries(counts).map(([rating, count]) => ({ name: `${rating} ★`, value: count })).reverse();
    }, [data]);

    const carrierPunctuality = useMemo(() => {
        const stats = aggregateStats(data, 'carrier');
        return Object.entries(stats).map(([name, stat]) => ({
            name,
            punctualityRate: stat.punctualityRate,
        })).sort((a, b) => b.punctualityRate - a.punctualityRate).slice(0, 10);
    }, [data]);
    
    const completionStats = useMemo(() => {
        const stats = aggregateStats(data, 'completedBy');
        return Object.entries(stats).map(([name, stat]) => ({
            name: name === 'web' ? 'Web' : name === 'mobile' ? 'Mobile' : 'Inconnu',
            value: stat.totalDeliveries
        }));
    }, [data]);


    const pieColors = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <StatCard title="Note moyenne" value={`${overallStats.averageRating.toFixed(2)} / 5`} icon={Star} description={`Objectif: ${objectives.averageRating.toFixed(2)}`} />
                <StatCard title="Taux de ponctualité" value={`${overallStats.punctualityRate.toFixed(2)}%`} icon={Timer} description={`Objectif: ${objectives.punctualityRate}%`} />
                <StatCard title="Taux de notation" value={`${overallStats.ratingRate.toFixed(2)}%`} icon={PenSquare} />
                <StatCard title="Commandes 'En attente'" value={`${overallStats.pendingDeliveries}`} icon={PackageSearch} />
                <StatCard title="Taux d'échec" value={`${(100 - overallStats.successRate).toFixed(2)}%`} icon={AlertCircle} description={`Objectif: ${objectives.failureRate}% max`} />
                <StatCard title="Sur place forcé" value={`${overallStats.forcedOnSiteRate.toFixed(2)}%`} icon={Target} description={`Objectif: ${objectives.forcedOnSiteRate}% max`} />
                <StatCard title="Sans contact forcé" value={`${overallStats.forcedNoContactRate.toFixed(2)}%`} icon={Ban} description={`Objectif: ${objectives.forcedNoContactRate}% max`} />
                <StatCard title="Validation Web" value={`${overallStats.webCompletionRate.toFixed(2)}%`} icon={Globe} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                 <Card>
                    <CardHeader>
                        <CardTitle>Distribution des notes</CardTitle>
                        <CardDescription>Aperçu de la satisfaction client sur l'ensemble des livraisons notées.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <RechartsBarChart data={ratingDistribution} layout="vertical">
                                <XAxis type="number" hide />
                                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
                                <Bar dataKey="value" barSize={35} name="Nombre de notes">
                                     {ratingDistribution.map((entry, index) => {
                                        const rating = parseInt(entry.name.charAt(0));
                                        const color = rating <= 3 ? "hsl(var(--destructive))" : (rating === 4 ? "hsl(var(--primary))" : "hsl(var(--chart-1))");
                                        return <Cell key={`cell-${index}`} fill={color} />;
                                    })}
                                </Bar>
                            </RechartsBarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Ponctualité par transporteur</CardTitle>
                        <CardDescription>Top 10 des transporteurs les plus ponctuels.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <RechartsBarChart data={carrierPunctuality}>
                                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{fontSize: 12}} />
                                <YAxis unit="%" />
                                <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} formatter={(value) => `${(value as number).toFixed(2)}%`} />
                                <Bar dataKey="punctualityRate" fill="hsl(var(--chart-1))" name="Taux de ponctualité" radius={[4, 4, 0, 0]} />
                            </RechartsBarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                 <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Méthode de complétion</CardTitle>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        <ChartContainer config={{}} className="mx-auto aspect-square h-[300px]">
                            <PieChart>
                                <Tooltip content={<ChartTooltipContent hideLabel />} />
                                <Pie data={completionStats} dataKey="value" nameKey="name" innerRadius={60} strokeWidth={5}>
                                    {completionStats.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                                    ))}
                                </Pie>
                                <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                            </PieChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
