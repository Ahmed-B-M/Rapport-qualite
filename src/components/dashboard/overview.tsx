"use client"

import { useMemo } from 'react';
import { type Delivery } from '@/lib/definitions';
import { type Objectives } from '@/app/page';
import { getOverallStats, aggregateStats } from '@/lib/data-processing';
import { StatCard } from '@/components/dashboard/stat-card';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCircle, Star, Timer, Ban, Globe, Target, PenSquare } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { Bar, Pie, Cell, PieChart, BarChart as RechartsBarChart, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export function Overview({ data, objectives }: { data: Delivery[], objectives: Objectives }) {
    const overallStats = useMemo(() => getOverallStats(data), [data]);
    
    const statsByDay = useMemo(() => {
        const grouped = data.reduce((acc, curr) => {
            const day = new Date(curr.date).toLocaleDateString('en-CA');
            if (!acc[day]) {
                acc[day] = { date: day, total: 0, delivered: 0, failed: 0 };
            }
            acc[day].total++;
            if (curr.status === 'Livré') acc[day].delivered++;
            else acc[day].failed++;
            return acc;
        }, {} as Record<string, {date: string; total: number; delivered: number; failed: number}>);

        return Object.values(grouped).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [data]);
    
    const completionStats = useMemo(() => {
        const stats = aggregateStats(data, 'completedBy');
        return Object.entries(stats).map(([name, stat]) => ({
            name: name === 'web' ? 'Web' : name === 'mobile' ? 'Mobile' : 'Inconnu',
            value: stat.totalDeliveries
        }));
    }, [data]);

    const carrierPerformance = useMemo(() => {
        const stats = aggregateStats(data, 'carrier');
        return Object.entries(stats).map(([name, stat]) => ({
            name,
            failureRate: 100 - stat.successRate,
        })).sort((a, b) => b.failureRate - a.failureRate).slice(0, 5);
    }, [data]);

    const topFailureReasons = useMemo(() => {
        const reasons = getOverallStats(data).failureReasons;
        return Object.entries(reasons)
            .map(([name, value]) => ({ name, value }))
            .sort((a,b) => b.value - a.value)
            .slice(0, 5);
    }, [data]);

    const pieColors = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))"];

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <StatCard title="Note moyenne" value={`${overallStats.averageRating.toFixed(2)} / 5`} icon={Star} description={`Objectif: ${objectives.averageRating.toFixed(2)}`} />
                <StatCard title="Taux de ponctualité" value={`${overallStats.punctualityRate.toFixed(2)}%`} icon={Timer} description={`Objectif: ${objectives.punctualityRate}%`} />
                <StatCard title="Taux d'échec" value={`${(100 - overallStats.successRate).toFixed(2)}%`} icon={AlertCircle} description={`Objectif: ${objectives.failureRate}% max`} />
                <StatCard title="Taux de notation" value={`${overallStats.ratingRate.toFixed(2)}%`} icon={PenSquare} />
                <StatCard title="Sur place forcé" value={`${overallStats.forcedOnSiteRate.toFixed(2)}%`} icon={Target} description={`Objectif: ${objectives.forcedOnSiteRate}% max`} />
                <StatCard title="Sans contact forcé" value={`${overallStats.forcedNoContactRate.toFixed(2)}%`} icon={Ban} description={`Objectif: ${objectives.forcedNoContactRate}% max`} />
                <StatCard title="Validation Web" value={`${overallStats.webCompletionRate.toFixed(2)}%`} icon={Globe} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                 <Card>
                    <CardHeader>
                        <CardTitle>Livraisons au fil du temps</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <RechartsBarChart data={statsByDay}>
                                <XAxis dataKey="date" tickFormatter={(str) => new Date(str).toLocaleDateString('fr-FR', { month:'short', day: 'numeric'})} />
                                <YAxis />
                                <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
                                <ChartLegend />
                                <Bar dataKey="delivered" stackId="a" fill="hsl(var(--chart-1))" name="Livré" />
                                <Bar dataKey="failed" stackId="a" fill="hsl(var(--chart-2))" name="Échoué" />
                            </RechartsBarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                <div className="grid gap-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Taux d'échec par transporteur</CardTitle>
                            <CardDescription>Top 5 des transporteurs avec le taux d'échec le plus élevé.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={150}>
                                <RechartsBarChart data={carrierPerformance} layout="vertical">
                                    <XAxis type="number" dataKey="failureRate" unit="%" hide />
                                    <YAxis type="category" dataKey="name" width={80} tick={{fontSize: 12}} />
                                    <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} formatter={(value) => `${(value as number).toFixed(2)}%`} />
                                    <Bar dataKey="failureRate" fill="hsl(var(--destructive))" name="Taux d'échec" radius={[0, 4, 4, 0]} />
                                </RechartsBarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Top 5 des raisons d'échec</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <ResponsiveContainer width="100%" height={150}>
                                <RechartsBarChart data={topFailureReasons} layout="vertical">
                                    <XAxis type="number" dataKey="value" hide />
                                    <YAxis type="category" dataKey="name" width={200} tick={{fontSize: 12}} />
                                    <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
                                    <Bar dataKey="value" fill="hsl(var(--chart-2))" name="Nombre d'échecs" radius={[0, 4, 4, 0]} />
                                </RechartsBarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>
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
