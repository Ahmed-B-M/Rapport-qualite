
"use client"

import { useMemo, useState, useEffect } from 'react';
import ReactMarkdown from "react-markdown";
import { type Delivery, type AggregatedStats } from '@/lib/definitions';
import { type Objectives } from '@/app/page';
import { getOverallStats, aggregateStats, getRankings, type Ranking, type RankingMetric } from '@/lib/data-processing';
import { generateOverviewSummary } from '@/ai/flows/generate-overview-summary';
import { StatCard } from '@/components/dashboard/stat-card';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Star, Timer, Ban, Globe, Target, PenSquare, PackageSearch, Building2, Truck, User, Warehouse as WarehouseIcon, ChevronsRight, ThumbsUp, ThumbsDown, Bot, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

type RankingEntity = { name: string } & AggregatedStats;

const CustomTooltip = ({ active, payload, label, metric, unit, isFlop }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const recurrence = getRecurrence(data, metric as RankingMetric, isFlop);
        const value = formatValue(data.value, metric as RankingMetric, unit);
        
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
    return `${value.toFixed(2)}${unit}`;
};

const getRecurrence = (item: RankingEntity, metric: RankingMetric, isFlop: boolean) => {
    if (!item) return '';
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

const RankingChart = ({ rankings, metric, unit, isFlop }: {
    rankings: RankingEntity[];
    metric: RankingMetric;
    unit: string;
    isFlop: boolean;
}) => {
    const chartData = useMemo(() => rankings.map(item => ({
        name: item.name,
        value: metric === 'successRate' ? 100 - item.successRate : item[metric],
        ...item
    })), [rankings, metric]);

    const renderCustomizedLabel = (props: any) => {
        const { x, y, width, height, value, payload } = props;
        const recurrence = getRecurrence(payload, metric, isFlop);
        const formattedValue = formatValue(value, metric, unit);

        return (
            <g>
                <text x={x + width + 5} y={y + height / 2} fill="hsl(var(--foreground))" textAnchor="start" dominantBaseline="middle" className="text-xs font-semibold">
                    {formattedValue}
                </text>
                 <text x={x + width + 60} y={y + height / 2} fill="hsl(var(--muted-foreground))" textAnchor="start" dominantBaseline="middle" className="text-xs">
                    ({recurrence})
                </text>
            </g>
        );
    };

    return (
        <div>
            {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 120, left: 120, bottom: 0 }}>
                        <XAxis type="number" dataKey="value" hide />
                        <YAxis 
                            type="category" 
                            dataKey="name" 
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            width={120}
                            interval={0}
                        />
                        <Tooltip content={<CustomTooltip metric={metric} unit={unit} isFlop={isFlop} />} cursor={{fill: 'hsl(var(--muted))'}} />
                        <Bar dataKey="value" barSize={16}>
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
        </div>
    );
};


const ThematicRankingSection = ({ data, metric, unit, title, onDrillDown }: {
    data: any;
    metric: RankingMetric;
    unit: string;
    title: string;
    onDrillDown: (view: string) => void;
}) => {
    const entityTypes = [
        { id: 'depots', name: 'Dépôts', icon: Building2 },
        { id: 'warehouses', name: 'Entrepôts', icon: WarehouseIcon },
        { id: 'carriers', name: 'Transporteurs', icon: Truck },
        { id: 'drivers', name: 'Livreurs', icon: User },
    ];
    
    return (
        <div className="space-y-6 print-section">
            <h3 className="text-xl font-bold font-headline mb-4 print-title">{title}</h3>
            <div className="grid gap-6 md:grid-cols-2">
                {entityTypes.map(entity => (
                    <Card key={entity.id}>
                        <CardHeader>
                             <div className="flex justify-between items-center">
                                <CardTitle className="flex items-center gap-2 text-md">
                                    <entity.icon /> {entity.name}
                                </CardTitle>
                                {onDrillDown && (
                                    <button onClick={() => onDrillDown(entity.id)} className="text-xs text-primary hover:underline flex items-center gap-1 no-print">
                                        Voir plus <ChevronsRight className="h-3 w-3"/>
                                    </button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <h4 className="flex items-center gap-2 font-semibold text-green-600 mb-2"><ThumbsUp /> Top 5</h4>
                                <RankingChart
                                    rankings={data[entity.id][metric].top}
                                    metric={metric}
                                    unit={unit}
                                    isFlop={false}
                                />
                            </div>
                            <div>
                                <h4 className="flex items-center gap-2 font-semibold text-red-600 mb-2"><ThumbsDown /> Flop 5</h4>
                                <RankingChart
                                    rankings={data[entity.id][metric].flop}
                                    metric={metric}
                                    unit={unit}
                                    isFlop={true}
                                />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
};


export function Overview({ data, objectives, setActiveView }: { data: Delivery[], objectives: Objectives, setActiveView?: (view: string) => void }) {
    const [summary, setSummary] = useState<string | null>(null);
    const [loadingSummary, setLoadingSummary] = useState(true);

    const overallStats = useMemo(() => getOverallStats(data), [data]);
    
    const aggregatedData = useMemo(() => {
        const depotStats = Object.entries(aggregateStats(data, 'depot')).map(([name, stat]) => ({ name, ...stat }));
        const warehouseStats = Object.entries(aggregateStats(data, 'warehouse')).map(([name, stat]) => ({ name, ...stat }));
        const carrierStats = Object.entries(aggregateStats(data, 'carrier')).map(([name, stat]) => ({ name, ...stat }));
        const driverStats = Object.entries(aggregateStats(data, 'driver')).map(([name, stat]) => ({ name, ...stat, driver: name }));

        const metrics: RankingMetric[] = ['averageRating', 'punctualityRate', 'successRate', 'forcedOnSiteRate', 'forcedNoContactRate', 'webCompletionRate'];

        const getRankingsForAllMetrics = (stats: any[], filterFn: (item: any) => boolean = () => true) => {
            const filteredStats = stats.filter(filterFn);
            return metrics.reduce((acc, metric) => {
                const take = 5;
                const higherIsBetter = !['successRate', 'forcedOnSiteRate', 'forcedNoContactRate', 'webCompletionRate'].includes(metric);
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
    
    useEffect(() => {
        const fetchSummary = async () => {
            setLoadingSummary(true);
            try {
                const result = await generateOverviewSummary({
                    overallStats: JSON.stringify(overallStats),
                    rankings: JSON.stringify(aggregatedData),
                });
                setSummary(result.summary);
            } catch (error) {
                console.error("Failed to generate overview summary:", error);
                setSummary("L'analyse par IA n'a pas pu être générée pour le moment.");
            }
            setLoadingSummary(false);
        };

        fetchSummary();
    }, [overallStats, aggregatedData]);

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
            <div className="print-section">
                <h2 className="text-2xl font-bold font-headline mb-4">Résumé Exécutif par IA</h2>
                <Alert>
                     <Bot className="h-4 w-4" />
                    <AlertDescription>
                        {loadingSummary ? (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Loader2 className="animate-spin h-4 w-4" />
                                <span>Génération de la synthèse...</span>
                            </div>
                        ) : (
                            <ReactMarkdown className="prose prose-sm max-w-none dark:prose-invert" components={{ p: ({node, ...props}) => <p className="m-0" {...props} /> }}>
                                {summary || ""}
                            </ReactMarkdown>
                        )}
                    </AlertDescription>
                </Alert>
            </div>

            <div className="print-section">
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

            <div className="no-print">
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
                                title={section.title}
                                metric={section.metric}
                                unit={section.unit}
                                data={aggregatedData}
                                onDrillDown={handleDrillDown}
                            />
                        </TabsContent>
                    ))}
                </Tabs>
            </div>
            
            <div className="print-only space-y-12">
                <h2 className="text-2xl font-bold font-headline mb-6">Classements de Performance par Thématique</h2>
                {rankingSections.map((section) => (
                     <ThematicRankingSection
                        key={section.metric}
                        title={section.title}
                        metric={section.metric}
                        unit={section.unit}
                        data={aggregatedData}
                        onDrillDown={() => {}} // No drill-down in print view
                    />
                ))}
            </div>

        </div>
    );
}

    