"use client"

import { useMemo } from 'react';
import { type Delivery } from '@/lib/definitions';
import { getOverallStats, aggregateStats } from '@/lib/data-processing';
import { StatCard } from '@/components/dashboard/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Clock, Percent, AlertCircle, Truck, PackageCheck, PackageX } from 'lucide-react';
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
    const statusColors = ["hsl(var(--chart-1))", "hsl(var(--chart-4))"];

    const formatDelay = (seconds: number) => {
        const minutes = Math.floor(Math.abs(seconds) / 60);
        const secs = Math.abs(seconds) % 60;
        const sign = seconds < 0 ? "-" : "";
        return `${sign}${minutes}m ${secs.toFixed(0)}s`;
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Livraisons totales" value={overallStats.totalDeliveries.toLocaleString()} icon={Truck} />
                <StatCard title="Taux de réussite" value={`${overallStats.successRate.toFixed(1)}%`} icon={Percent} description={`${overallStats.successfulDeliveries.toLocaleString()} livrées`} />
                <StatCard title="Livraisons échouées" value={overallStats.failedDeliveries.toLocaleString()} icon={AlertCircle} description={`${(100 - overallStats.successRate).toFixed(1)}% échouées`} />
                <StatCard title="Retard moyen" value={formatDelay(overallStats.averageDelay)} icon={Clock} description={overallStats.averageDelay > 0 ? "En retard en moyenne" : "En avance en moyenne"} />
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
