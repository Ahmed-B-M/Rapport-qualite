
"use client"

import { useMemo } from 'react';
import { type Delivery, type AggregatedStats } from '@/lib/definitions';
import { type Objectives } from '@/app/page';
import { getOverallStats, aggregateStats, getRankings, type Ranking, type RankingMetric } from '@/lib/data-processing';
import { StatCard } from '@/components/dashboard/stat-card';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCircle, Star, Timer, Ban, Globe, Target, PenSquare, PackageSearch, Building2, Truck, User, Warehouse as WarehouseIcon, TrendingDown, TrendingUp, ChevronsRight } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { Badge } from '@/components/ui/badge';

type RankingEntity = { name: string } & AggregatedStats;

const CustomTooltip = ({ active, payload, label, metric, unit, isFlop }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const recurrence = getRecurrence(data, metric as RankingMetric, isFlop);
        const value = formatValue(data[metric], metric as RankingMetric, unit);
        
        return (
            <div className="bg-background border border-border p-2 rounded-lg shadow-lg text-sm">
                <p className="font-bold">{label}</p>
                <p>Valeur : <span className="font-semibold">{value}</span></p>
                <p>Récurrence : <span className="font-semibold">{recurrence}</span></p>
            </div>
        );
    }
    return null;
};

const formatValue = (value: number, metric: RankingMetric, unit: string) => {
    if (metric === 'averageRating' && value === 0) return 'N/A';
    if (metric === 'successRate') { 
        return `${(100 - value).toFixed(2)}${unit}`;
    }
    return `${value.toFixed(2)}${unit}`;
};

const getRecurrence = (item: RankingEntity, metric: RankingMetric, isFlop: boolean) => {
    switch (metric) {
        case 'successRate':
            return isFlop ? `${item.failedDeliveries} échecs` : `${item.successfulDeliveries} succès`;
        case 'punctualityRate':
             return isFlop ? `${item.totalDeliveries - item.onTimeDeliveries} retards` : `${item.onTimeDeliveries} à l'heure`;
        case 'forcedOnSiteRate':
        case 'forcedNoContactRate':
        case 'webCompletionRate':
            const count = metric === 'forcedOnSiteRate' ? item.forcedOnSiteCount : (metric === 'forcedNoContactRate' ? item.forcedNoContactCount : item.webCompletionCount);
            return `${count} cas`;
        case 'averageRating':
            return `${item.ratedDeliveries} notes`;
        default:
            return `${item.totalDeliveries} livraisons`;
    }
};

const RankingChart = ({ title, icon, rankings, metric, unit, isFlop, onDrillDown }: {
    title: string;
    icon: React.ElementType;
    rankings: RankingEntity[];
    metric: RankingMetric;
    unit: string;
    isFlop: boolean;
    onDrillDown?: (entityType: string) => void;
}) => {
    const Icon = icon;
    const chartData = useMemo(() => rankings.map(item => ({
        name: item.name,
        value: metric === 'successRate' ? 100 - item.successRate : item[metric],
        ...item
    })), [rankings, metric]);

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-2 text-md">
                        <Icon /> {title}
                    </CardTitle>
                    {onDrillDown && (
                        <button onClick={() => onDrillDown(title.toLowerCase().replace(/s$/, ''))} className="text-xs text-primary hover:underline flex items-center gap-1">
                            Voir plus <ChevronsRight className="h-3 w-3"/>
                        </button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={160}>
                        <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                            <XAxis type="number" hide />
                            <YAxis 
                                type="category" 
                                dataKey="name" 
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                width={80}
                                tickFormatter={(value) => value.length > 12 ? `${value.substring(0, 12)}...` : value}
                            />
                            <Tooltip content={<CustomTooltip metric={metric} unit={unit} isFlop={isFlop} />} cursor={{fill: 'hsl(var(--muted))'}} />
                            <Bar dataKey="value" barSize={20}>
                                 {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={isFlop ? "hsl(var(--destructive))" : "hsl(var(--primary))"} radius={[0, 4, 4, 0]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
                        Pas de données à afficher
                    </div>
                )}
            </CardContent>
        </Card>
    );
};


const ThematicRankingSection = ({ data, metric, unit, onDrillDown }: {
    data: any;
    metric: RankingMetric;
    unit: string;
    onDrillDown: (view: string) => void;
}) => (
    <div className="space-y-6">
        <div>
            <h4 className="flex items-center gap-2 font-semibold text-green-600 mb-3"><TrendingUp /> Top 5</h4>
            <div className="grid gap-4 md:grid-cols-2">
                <RankingChart
                    title="Dépôts"
                    icon={Building2}
                    rankings={data.depots[metric].top}
                    metric={metric}
                    unit={unit}
                    isFlop={false}
                    onDrillDown={onDrillDown}
                />
                <RankingChart
                    title="Entrepôts"
                    icon={WarehouseIcon}
                    rankings={data.warehouses[metric].top}
                    metric={metric}
                    unit={unit}
                    isFlop={false}
                    onDrillDown={onDrillDown}
                />
                <RankingChart
                    title="Transporteurs"
                    icon={Truck}
                    rankings={data.carriers[metric].top}
                    metric={metric}
                    unit={unit}
                    isFlop={false}
                    onDrillDown={onDrillDown}
                />
                <RankingChart
                    title="Livreurs"
                    icon={User}
                    rankings={data.drivers[metric].top}
                    metric={metric}
                    unit={unit}
                    isFlop={false}
                    onDrillDown={onDrillDown}
                />
            </div>
        </div>
         <div>
            <h4 className="flex items-center gap-2 font-semibold text-red-600 mb-3"><TrendingDown /> Flop 5</h4>
            <div className="grid gap-4 md:grid-cols-2">
                <RankingChart
                    title="Dépôts"
                    icon={Building2}
                    rankings={data.depots[metric].flop}
                    metric={metric}
                    unit={unit}
                    isFlop={true}
                    onDrillDown={onDrillDown}
                />
                <RankingChart
                    title="Entrepôts"
                    icon={WarehouseIcon}
                    rankings={data.warehouses[metric].flop}
                    metric={metric}
                    unit={unit}
                    isFlop={true}
                    onDrillDown={onDrillDown}
                />
                <RankingChart
                    title="Transporteurs"
                    icon={Truck}
                    rankings={data.carriers[metric].flop}
                    metric={metric}
                    unit={unit}
                    isFlop={true}
                    onDrillDown={onDrillDown}
                />
                <RankingChart
                    title="Livreurs"
                    icon={User}
                    rankings={data.drivers[metric].flop}
                    metric={metric}
                    unit={unit}
                    isFlop={true}
                    onDrillDown={onDrillDown}
                />
            </div>
        </div>
    </div>
);


export function Overview({ data, objectives, setActiveView }: { data: Delivery[], objectives: Objectives, setActiveView?: (view: string) => void }) {
    const overallStats = useMemo(() => getOverallStats(data), [data]);
    
    const aggregatedData = useMemo(() => {
        const depotStats = Object.entries(aggregateStats(data, 'depot')).map(([name, stat]) => ({ name, ...stat }));
        const warehouseStats = Object.entries(aggregateStats(data, 'warehouse')).map(([name, stat]) => ({ name, ...stat }));
        const carrierStats = Object.entries(aggregateStats(data, 'carrier')).map(([name, stat]) => ({ name, ...stat }));
        const driverStats = Object.entries(aggregateStats(data, 'driver')).map(([name, stat]) => {
            const depot = data.find(d => d.driver === name)?.depot || '';
            return { ...stat, name: `${name.replace(` (${depot})`,'')}`};
        });

        const metrics: RankingMetric[] = ['averageRating', 'punctualityRate', 'successRate', 'forcedOnSiteRate', 'forcedNoContactRate', 'webCompletionRate'];

        const getRankingsForAllMetrics = (stats: any[], filterFn: (item: any) => boolean = () => true) => {
            const filteredStats = stats.filter(filterFn);
            return metrics.reduce((acc, metric) => {
                const take = 5;
                const higherIsBetter = metric === 'averageRating' || metric === 'punctualityRate';
                acc[metric] = getRankings(filteredStats, metric, take, higherIsBetter ? 'asc' : 'desc');
                return acc;
            }, {} as Record<RankingMetric, Ranking<any>>);
        };

        return {
            depots: getRankingsForAllMetrics(depotStats),
            warehouses: getRankingsForAllMetrics(warehouseStats),
            carriers: getRankingsForAllMetrics(carrierStats, c => c.name !== "Inconnu"),
            drivers: getRankingsForAllMetrics(driverStats, d => !d.name.startsWith("Livreur Inconnu")),
        };
    }, [data]);
    
    const handleDrillDown = (view: string) => {
        if(setActiveView) {
            setActiveView(view);
        }
    }

    const rankingSections = [
        { title: "Ponctualité", metric: "punctualityRate" as RankingMetric, unit: "%", icon: Timer },
        { title: "Satisfaction", metric: "averageRating" as RankingMetric, unit: "/5", icon: Star },
        { title: "Taux d'Échec", metric: "successRate" as RankingMetric, unit: "%", icon: AlertCircle },
        { title: "'Sur Place Forcé'", metric: "forcedOnSiteRate" as RankingMetric, unit: "%", icon: Target },
        { title: "'Sans Contact Forcé'", metric: "forcedNoContactRate" as RankingMetric, unit: "%", icon: Ban },
        { title: "'Validation Web'", metric: "webCompletionRate" as RankingMetric, unit: "%", icon: Globe },
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
                    <StatCard 
                        title="Validation Web" 
                        value={`${overallStats.webCompletionRate.toFixed(2)}%`} 
                        icon={Globe}
                        description={`Objectif: < ${objectives.webCompletionRate}%`}
                        isBelowObjective={overallStats.webCompletionRate > objectives.webCompletionRate}
                     />
                    <StatCard title="Taux de notation" value={`${overallStats.ratingRate.toFixed(2)}%`} icon={PenSquare} />
                </div>
            </div>

            <div>
                <h2 className="text-2xl font-bold font-headline mb-6">Classements de Performance par Thématique</h2>
                <Tabs defaultValue={rankingSections[0].metric}>
                    <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-6 mb-4">
                        {rankingSections.map((section) => (
                           <TabsTrigger key={section.metric} value={section.metric}>
                               <section.icon className="mr-2 h-4 w-4" />
                               {section.title}
                           </TabsTrigger>
                        ))}
                    </TabsList>
                    {rankingSections.map((section) => (
                        <TabsContent key={section.metric} value={section.metric}>
                            <ThematicRankingSection
                                metric={section.metric}
                                unit={section.unit}
                                data={aggregatedData}
                                onDrillDown={handleDrillDown}
                            />
                        </TabsContent>
                    ))}
                </Tabs>
            </div>
        </div>
    );
}
