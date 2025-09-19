
"use client"

import { useMemo } from 'react';
import { type Delivery, type AggregatedStats } from '@/lib/definitions';
import { type Objectives } from '@/app/page';
import { getOverallStats, aggregateStats, getRankings, type Ranking, type RankingMetric } from '@/lib/data-processing';
import { StatCard } from '@/components/dashboard/stat-card';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCircle, Star, Timer, Ban, Globe, Target, PenSquare, PackageSearch, Building2, Truck, User, ThumbsDown, ThumbsUp } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { Bar, Pie, Cell, PieChart, BarChart as RechartsBarChart, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Badge } from '@/components/ui/badge';

type RankingEntity<T> = T & { name: string } & AggregatedStats;

const RankingCard = <T,>({ title, icon, rankings, metric, unit, higherIsBetter, onDrillDown }: {
    title: string;
    icon: React.ElementType;
    rankings: Ranking<RankingEntity<T>>;
    metric: RankingMetric;
    unit: string;
    higherIsBetter: boolean;
    onDrillDown?: (entityType: string) => void;
}) => {
    const Icon = icon;

    const formatValue = (value: number) => {
        if (metric === 'successRate') { // We display failure rate from successRate
            return `${(100 - value).toFixed(2)}${unit}`;
        }
        return `${value.toFixed(2)}${unit}`;
    };

    return (
        <Card className="flex flex-col">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Icon /> {title}
                    </CardTitle>
                    {onDrillDown && (
                        <button onClick={() => onDrillDown(title.toLowerCase())} className="text-xs text-primary hover:underline">Voir plus</button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="flex-grow grid grid-cols-2 gap-4">
                <div>
                    <h4 className="flex items-center gap-2 font-semibold text-green-600"><ThumbsUp size={16} /> Top 3</h4>
                    <ul className="mt-2 space-y-1 text-sm">
                        {rankings.top.map(item => (
                            <li key={item.name} className="flex justify-between items-center">
                                <span className="truncate pr-2">{item.name}</span>
                                <Badge variant="secondary" className="font-mono">{formatValue(item[metric])}</Badge>
                            </li>
                        ))}
                    </ul>
                </div>
                 <div>
                    <h4 className="flex items-center gap-2 font-semibold text-red-600"><ThumbsDown size={16} /> Flop 3</h4>
                    <ul className="mt-2 space-y-1 text-sm">
                        {rankings.flop.map(item => (
                            <li key={item.name} className="flex justify-between items-center">
                                <span className="truncate pr-2">{item.name}</span>
                                <Badge variant="destructive" className="font-mono">{formatValue(item[metric])}</Badge>
                            </li>
                        ))}
                    </ul>
                </div>
            </CardContent>
        </Card>
    );
};


export function Overview({ data, objectives, setActiveView }: { data: Delivery[], objectives: Objectives, setActiveView?: (view: string) => void }) {
    const overallStats = useMemo(() => getOverallStats(data), [data]);
    
    const aggregatedData = useMemo(() => {
        const depotStats = Object.entries(aggregateStats(data, 'depot')).map(([name, stat]) => ({ name, ...stat }));
        const carrierStats = Object.entries(aggregateStats(data, 'carrier')).map(([name, stat]) => ({ name, ...stat }));
        const driverStats = Object.entries(aggregateStats(data, 'driver')).map(([name, stat]) => ({ name, ...stat }));

        return {
            depots: {
                averageRating: getRankings(depotStats, 'averageRating'),
                punctualityRate: getRankings(depotStats, 'punctualityRate'),
                failureRate: getRankings(depotStats, 'successRate', 3, 'asc'), // Lower successRate is worse
            },
            carriers: {
                averageRating: getRankings(carrierStats.filter(c => c.name !== "Inconnu"), 'averageRating'),
                punctualityRate: getRankings(carrierStats.filter(c => c.name !== "Inconnu"), 'punctualityRate'),
                failureRate: getRankings(carrierStats.filter(c => c.name !== "Inconnu"), 'successRate', 3, 'asc'),
            },
            drivers: {
                averageRating: getRankings(driverStats, 'averageRating'),
                punctualityRate: getRankings(driverStats, 'punctualityRate'),
                failureRate: getRankings(driverStats, 'successRate', 3, 'asc'),
            }
        };
    }, [data]);
    
    const handleDrillDown = (view: string) => {
        if(setActiveView) {
            setActiveView(view);
        }
    }


    const pieColors = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold font-headline">Indicateurs Clés de Performance (KPIs)</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <StatCard 
                    title="Note moyenne" 
                    value={`${overallStats.averageRating.toFixed(2)} / 5`} 
                    icon={Star} 
                    description={`Objectif: > ${objectives.averageRating.toFixed(2)}`} 
                    isBelowObjective={overallStats.averageRating > 0 && overallStats.averageRating < objectives.averageRating}
                />
                <StatCard 
                    title="Taux de ponctualité" 
                    value={`${overallStats.punctualityRate.toFixed(2)}%`} 
                    icon={Timer} 
                    description={`Objectif: > ${objectives.punctualityRate}%`}
                    isBelowObjective={overallStats.punctualityRate < objectives.punctualityRate}
                />
                <StatCard title="Taux de notation" value={`${overallStats.ratingRate.toFixed(2)}%`} icon={PenSquare} />
                <StatCard title="Commandes 'En attente'" value={`${overallStats.pendingDeliveries}`} icon={PackageSearch} />
                <StatCard 
                    title="Taux d'échec" 
                    value={`${(100 - overallStats.successRate).toFixed(2)}%`} 
                    icon={AlertCircle} 
                    description={`Objectif: < ${objectives.failureRate}%`} 
                    isBelowObjective={(100 - overallStats.successRate) > objectives.failureRate}
                />
                <StatCard 
                    title="Sur place forcé" 
                    value={`${overallStats.forcedOnSiteRate.toFixed(2)}%`} 
                    icon={Target} 
                    description={`Objectif: < ${objectives.forcedOnSiteRate}%`}
                    isBelowObjective={overallStats.forcedOnSiteRate > objectives.forcedOnSiteRate}
                />
                <StatCard 
                    title="Sans contact forcé" 
                    value={`${overallStats.forcedNoContactRate.toFixed(2)}%`} 
                    icon={Ban} 
                    description={`Objectif: < ${objectives.forcedNoContactRate}%`}
                    isBelowObjective={overallStats.forcedNoContactRate > objectives.forcedNoContactRate}
                />
                <StatCard title="Validation Web" value={`${overallStats.webCompletionRate.toFixed(2)}%`} icon={Globe} />
            </div>

            <h2 className="text-2xl font-bold font-headline mt-8">Classements de Performance</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                 <RankingCard
                    title="Dépôts"
                    icon={Building2}
                    rankings={aggregatedData.depots.punctualityRate}
                    metric="punctualityRate"
                    unit="%"
                    higherIsBetter={true}
                    onDrillDown={() => handleDrillDown('depots')}
                />
                <RankingCard
                    title="Transporteurs"
                    icon={Truck}
                    rankings={aggregatedData.carriers.punctualityRate}
                    metric="punctualityRate"
                    unit="%"
                    higherIsBetter={true}
                    onDrillDown={() => handleDrillDown('carriers')}
                />
                <RankingCard
                    title="Livreurs"
                    icon={User}
                    rankings={aggregatedData.drivers.punctualityRate}
                    metric="punctualityRate"
                    unit="%"
                    higherIsBetter={true}
                    onDrillDown={() => handleDrillDown('drivers')}
                />
                 <RankingCard
                    title="Dépôts"
                    icon={Building2}
                    rankings={aggregatedData.depots.failureRate}
                    metric="successRate"
                    unit="% échecs"
                    higherIsBetter={false}
                    onDrillDown={() => handleDrillDown('depots')}
                />
                <RankingCard
                    title="Transporteurs"
                    icon={Truck}
                    rankings={aggregatedData.carriers.failureRate}
                    metric="successRate"
                    unit="% échecs"
                    higherIsBetter={false}
                    onDrillDown={() => handleDrillDown('carriers')}
                />
                <RankingCard
                    title="Livreurs"
                    icon={User}
                    rankings={aggregatedData.drivers.failureRate}
                    metric="successRate"
                    unit="% échecs"
                    higherIsBetter={false}
                    onDrillDown={() => handleDrillDown('drivers')}
                />
            </div>
        </div>
    );
}
