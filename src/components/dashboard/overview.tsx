
"use client"

import { useMemo } from 'react';
import { type Delivery, type AggregatedStats } from '@/lib/definitions';
import { type Objectives } from '@/app/page';
import { getOverallStats, aggregateStats, getRankings, type Ranking, type RankingMetric } from '@/lib/data-processing';
import { StatCard } from '@/components/dashboard/stat-card';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCircle, Star, Timer, Ban, Globe, Target, PenSquare, PackageSearch, Building2, Truck, User, ThumbsDown, ThumbsUp, Warehouse } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type RankingEntity<T> = T & { name: string } & AggregatedStats;

const RankingCard = <T,>({ title, icon, rankings, metric, unit, onDrillDown }: {
    title: string;
    icon: React.ElementType;
    rankings: Ranking<RankingEntity<T>>;
    metric: RankingMetric;
    unit: string;
    onDrillDown?: (entityType: string) => void;
}) => {
    const Icon = icon;

    const formatValue = (value: number) => {
        if (metric === 'successRate') { 
            return `${(100 - value).toFixed(2)}${unit}`;
        }
        return `${value.toFixed(2)}${unit}`;
    };

    return (
        <Card className="flex flex-col">
            <CardHeader className="pb-4">
                <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-2 text-md">
                        <Icon /> {title}
                    </CardTitle>
                    {onDrillDown && (
                        <button onClick={() => onDrillDown(title.toLowerCase())} className="text-xs text-primary hover:underline">Voir plus</button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="flex-grow grid grid-cols-2 gap-4">
                <div>
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-green-600"><ThumbsUp size={14} /> Top 3</h4>
                    <ul className="mt-2 space-y-1 text-xs">
                        {rankings.top.map(item => (
                            <li key={item.name} className="flex justify-between items-center">
                                <span className="truncate pr-2">{item.name}</span>
                                <Badge variant="secondary" className="font-mono">{formatValue(item[metric])}</Badge>
                            </li>
                        ))}
                    </ul>
                </div>
                 <div>
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-red-600"><ThumbsDown size={14} /> Flop 3</h4>
                    <ul className="mt-2 space-y-1 text-xs">
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

const ThematicRankingSection = ({ title, metric, unit, data, onDrillDown }: {
    title: string;
    metric: RankingMetric;
    unit: string;
    data: any;
    onDrillDown: (view: string) => void;
}) => (
    <div>
        <h3 className="text-xl font-semibold font-headline mb-4">{title}</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <RankingCard
                title="Dépôts"
                icon={Building2}
                rankings={data.depots[metric]}
                metric={metric}
                unit={unit}
                onDrillDown={() => onDrillDown('depots')}
            />
            <RankingCard
                title="Entrepôts"
                icon={Warehouse}
                rankings={data.warehouses[metric]}
                metric={metric}
                unit={unit}
                onDrillDown={() => onDrillDown('warehouses')}
            />
            <RankingCard
                title="Transporteurs"
                icon={Truck}
                rankings={data.carriers[metric]}
                metric={metric}
                unit={unit}
                onDrillDown={() => onDrillDown('carriers')}
            />
            <RankingCard
                title="Livreurs"
                icon={User}
                rankings={data.drivers[metric]}
                metric={metric}
                unit={unit}
                onDrillDown={() => onDrillDown('drivers')}
            />
        </div>
    </div>
);


export function Overview({ data, objectives, setActiveView }: { data: Delivery[], objectives: Objectives, setActiveView?: (view: string) => void }) {
    const overallStats = useMemo(() => getOverallStats(data), [data]);
    
    const aggregatedData = useMemo(() => {
        const depotStats = Object.entries(aggregateStats(data, 'depot')).map(([name, stat]) => ({ name, ...stat }));
        const warehouseStats = Object.entries(aggregateStats(data, 'warehouse')).map(([name, stat]) => ({ name, ...stat }));
        const carrierStats = Object.entries(aggregateStats(data, 'carrier')).map(([name, stat]) => ({ name, ...stat }));
        const driverStats = Object.entries(aggregateStats(data, 'driver')).map(([name, stat]) => ({ name, ...stat }));

        const metrics: RankingMetric[] = ['averageRating', 'punctualityRate', 'successRate', 'forcedOnSiteRate', 'forcedNoContactRate', 'webCompletionRate'];
        const higherIsBetterMetrics: RankingMetric[] = ['averageRating', 'punctualityRate', 'webCompletionRate'];

        const getRankingsForAllMetrics = (stats: any[], filterFn: (item: any) => boolean = () => true) => {
            const filteredStats = stats.filter(filterFn);
            return metrics.reduce((acc, metric) => {
                const direction = higherIsBetterMetrics.includes(metric) ? 'desc' : 'asc';
                acc[metric] = getRankings(filteredStats, metric, 3);
                return acc;
            }, {} as Record<RankingMetric, Ranking<any>>);
        };

        return {
            depots: getRankingsForAllMetrics(depotStats),
            warehouses: getRankingsForAllMetrics(warehouseStats),
            carriers: getRankingsForAllMetrics(carrierStats, c => c.name !== "Inconnu"),
            drivers: getRankingsForAllMetrics(driverStats),
        };
    }, [data]);
    
    const handleDrillDown = (view: string) => {
        if(setActiveView) {
            setActiveView(view);
        }
    }

    const rankingSections = [
        { title: "Ponctualité", metric: "punctualityRate" as RankingMetric, unit: "%" },
        { title: "Satisfaction (Note Moyenne)", metric: "averageRating" as RankingMetric, unit: "/5" },
        { title: "Taux d'Échec", metric: "successRate" as RankingMetric, unit: "%" },
        { title: "Taux de 'Sur Place Forcé'", metric: "forcedOnSiteRate" as RankingMetric, unit: "%" },
        { title: "Taux de 'Sans Contact Forcé'", metric: "forcedNoContactRate" as RankingMetric, unit: "%" },
        { title: "Taux de 'Validation Web'", metric: "webCompletionRate" as RankingMetric, unit: "%" },
    ];

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold font-headline mb-4">Indicateurs Clés de Performance (KPIs)</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <StatCard 
                        title="Note moyenne" 
                        value={overallStats.averageRating > 0 ? `${overallStats.averageRating.toFixed(2)} / 5` : 'N/A'}
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
                    <StatCard 
                        title="Taux d'échec" 
                        value={`${(100 - overallStats.successRate).toFixed(2)}%`} 
                        icon={AlertCircle} 
                        description={`Objectif: < ${objectives.failureRate}%`} 
                        isBelowObjective={(100 - overallStats.successRate) > objectives.failureRate}
                    />
                     <StatCard title="Commandes 'En attente'" value={`${overallStats.pendingDeliveries}`} icon={PackageSearch} />
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
                    <StatCard title="Taux de notation" value={`${overallStats.ratingRate.toFixed(2)}%`} icon={PenSquare} />
                </div>
            </div>

            <div>
                <h2 className="text-2xl font-bold font-headline mb-6">Classements de Performance par Thématique</h2>
                <div className="space-y-8">
                    {rankingSections.map(section => (
                        <ThematicRankingSection
                            key={section.metric}
                            title={section.title}
                            metric={section.metric}
                            unit={section.unit}
                            data={aggregatedData}
                            onDrillDown={handleDrillDown}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
