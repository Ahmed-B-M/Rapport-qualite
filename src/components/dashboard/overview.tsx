"use client"

import { useMemo } from 'react';
import { type Delivery } from '@/lib/definitions';
import { getOverallStats, aggregateStats } from '@/lib/data-processing';
import { StatCard } from '@/components/dashboard/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Star, Timer, Ban, Globe, Target, PenSquare } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { Bar, Pie, Cell, PieChart, BarChart as RechartsBarChart, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export function Overview({ data }: { data: Delivery[] }) {
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
            name: name.charAt(0).toUpperCase() + name.slice(1),
            value: stat.totalDeliveries
        }));
    }, [data]);

    const pieColors = ["hsl(var(--chart-1))", "hsl(var(--chart-2))"];

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <StatCard title="Note moyenne" value={`${overallStats.averageRating.toFixed(2)} / 5`} icon={Star} description={`Objectif: 4.80`} />
                <StatCard title="Taux de ponctualité" value={`${overallStats.punctualityRate.toFixed(2)}%`} icon={Timer} description={`Objectif: 95%`} />
                <StatCard title="Taux d'échec" value={`${(100 - overallStats.successRate).toFixed(2)}%`} icon={AlertCircle} description={`Objectif: 1% max`} />
                <StatCard title="Taux de notation" value={`${overallStats.ratingRate.toFixed(2)}%`} icon={PenSquare} />
                <StatCard title="Sur place forcé" value={`${overallStats.forcedOnSiteRate.toFixed(2)}%`} icon={Target} description={`Objectif: 10% max`} />
                <StatCard title="Sans contact forcé" value={`${overallStats.forcedNoContactRate.toFixed(2)}%`} icon={Ban} description={`Objectif: 10% max`} />
                <StatCard title="Validation Web" value={`${overallStats.webCompletionRate.toFixed(2)}%`} icon={Globe} />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="lg:col-span-4">
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
                <Card className="lg:col-span-3">
                    <CardHeader>
                        <CardTitle>Méthode de complétion</CardTitle>
                    </CardHeader>
                    <CardContent>
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
