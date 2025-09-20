"use client"

import { useMemo, useState, useEffect } from 'react';
import { type Delivery, type AggregatedStats } from '@/lib/definitions';
import { type Objectives, type DetailViewState } from '@/app/page';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Star, MessageSquareQuote, ThumbsDown, User, Building, Truck, Warehouse as WarehouseIcon, AlertTriangle, Search, Printer, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import { Button } from '../ui/button';
import * as XLSX from 'xlsx';
import { getRankings, aggregateStats } from '@/lib/data-processing';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { DriverStat } from './driver-analytics';

type GroupingKey = "depot" | "warehouse" | "carrier" | "driver";

type Comment = {
    comment: string;
    rating: number;
    driver: string;
    depot: string;
    warehouse: string;
    carrier: string;
};

type RatingData = {
    name: string;
    count: number;
}

const getSatisfactionComments = (data: Delivery[], groupBy: GroupingKey): Record<string, { comments: Comment[], negativeComments: Comment[] }> => {
    const entities: Record<string, { comments: Comment[], negativeComments: Comment[] }> = {};

    data.forEach(d => {
        const entityName = d[groupBy];
        if (!entities[entityName]) {
            entities[entityName] = { comments: [], negativeComments: [] };
        }
        
        if (d.feedbackComment) {
            const comment = {
                comment: d.feedbackComment,
                rating: d.deliveryRating || 0,
                driver: d.driver,
                depot: d.depot,
                warehouse: d.warehouse,
                carrier: d.carrier
            };
            entities[entityName].comments.push(comment);
            if ((d.deliveryRating || 0) <= 3) {
                 entities[entityName].negativeComments.push(comment);
            }
        }
    });
    return entities;
}

const RatingChart = ({ data }: { data: RatingData[] }) => {
    const ratingDistribution = [
        { name: '5 ★', count: 0 },
        { name: '4 ★', count: 0 },
        { name: '3 ★', count: 0 },
        { name: '2 ★', count: 0 },
        { name: '1 ★', count: 0 },
    ];
    
    data.forEach(item => {
        const index = ratingDistribution.findIndex(rd => rd.name === item.name);
        if (index !== -1) {
            ratingDistribution[index].count = item.count;
        }
    });

    return (
        <ResponsiveContainer width="100%" height={150}>
            <BarChart data={ratingDistribution} layout="vertical" margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                <RechartsTooltip
                    cursor={{ fill: 'hsl(var(--muted))' }}
                    contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}
                />
                <Bar dataKey="count" name="Nombre" barSize={20} radius={[4, 4, 0, 0]}>
                    {ratingDistribution.map((entry, index) => {
                        const rating = parseInt(entry.name.charAt(0));
                        const color = rating <= 3 ? "hsl(var(--destructive))" : (rating === 4 ? "hsl(var(--primary))" : "hsl(var(--chart-1))");
                        return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};

const CommentsList = ({ title, comments, icon }: { title: string; comments: Comment[], icon: React.ElementType }) => {
    const Icon = icon;
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg"><Icon className="h-5 w-5" /> {title}</CardTitle>
                <CardDescription>{comments.length} commentaire{comments.length > 1 ? 's' : ''}</CardDescription>
            </CardHeader>
            <CardContent>
                {comments.length > 0 ? (
                    <ScrollArea className="h-auto max-h-80">
                        <div className="space-y-4 pr-4">
                        {comments.map((c, i) => (
                            <div key={i} className="p-3 border rounded-lg bg-muted/20">
                                <div className="flex justify-between items-start">
                                    <p className="text-sm italic">"{c.comment}"</p>
                                    <Badge variant={c.rating <= 3 ? "destructive": "default"}>
                                        {c.rating} <Star className="h-3 w-3 ml-1" />
                                    </Badge>
                                </div>
                                <div className="flex items-center justify-start mt-2 text-xs text-muted-foreground">
                                    <span>Livreur: {c.driver}</span>
                                </div>
                            </div>
                        ))}
                        </div>
                    </ScrollArea>
                ) : (
                    <div className="flex h-64 flex-col items-center justify-center text-center text-muted-foreground">
                        <MessageSquareQuote className="h-10 w-10 mb-4" />
                        <p className="font-semibold">Aucun {title.toLowerCase()}.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
};

const ObjectiveIndicator = ({ value, objective, higherIsBetter, tooltipLabel, unit = '' }: { value: number, objective: number, higherIsBetter: boolean, tooltipLabel: string, unit?: string }) => {
    const isBelowObjective = higherIsBetter ? value < objective : value > objective;
    if (!isBelowObjective || (higherIsBetter && value <= 0)) return null;

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger>
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                </TooltipTrigger>
                <TooltipContent>
                    <p>{tooltipLabel}: {value.toFixed(2)}{unit} (Objectif: {higherIsBetter ? '>' : '<'} {objective}{unit})</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};

type EntityWithComments = AggregatedStats & {
    name: string;
    comments: Comment[];
    negativeComments: Comment[];
    ratingDistribution: RatingData[];
    carrier?: string;
}

const EntitySatisfactionView = ({ stats, objectives, onNavigate, groupBy }: { 
    stats: EntityWithComments[], 
    objectives: Objectives,
    onNavigate: (view: string, detail?: Partial<DetailViewState>) => void;
    groupBy: GroupingKey;
}) => {
    if (stats.length === 0) {
         return (
            <div className="flex h-96 flex-col items-center justify-center text-center text-muted-foreground">
                 <Star className="h-12 w-12 mb-4" />
                <p className="font-semibold text-lg">Aucune donnée de notation disponible.</p>
                <p>Aucune livraison dans cet ensemble de données n'a encore été notée pour ce groupe.</p>
            </div>
        )
    }
    
    const handleEntityClick = (entity: EntityWithComments) => {
        if (groupBy === 'driver') {
            onNavigate('drivers', { driver: entity as unknown as DriverStat });
        } else if (groupBy === 'depot') {
            onNavigate('depots');
        } else if (groupBy === 'carrier') {
            onNavigate('carriers');
        } else if (groupBy === 'warehouse') {
            onNavigate('warehouses');
        }
    };
    
    return (
       <ScrollArea className="h-[75vh]">
         <div className="space-y-6 pr-4">
            {stats.map(entity => (
                <Card key={entity.name} className="overflow-hidden">
                    <CardHeader>
                        <CardTitle 
                             className="cursor-pointer hover:underline"
                             onClick={() => handleEntityClick(entity)}
                        >
                            {entity.name}
                        </CardTitle>
                        <CardDescription className="flex flex-wrap items-center gap-x-4 gap-y-1">
                           <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 text-yellow-500"/>
                                Note: {entity.averageRating.toFixed(2)} ({entity.totalRatings} notes)
                                <ObjectiveIndicator 
                                    value={entity.averageRating}
                                    objective={objectives.averageRating}
                                    higherIsBetter={true}
                                    tooltipLabel="Note moyenne"
                                />
                           </div>
                           <div className="flex items-center gap-1">
                                Ponctualité: {entity.punctualityRate.toFixed(2)}%
                                <ObjectiveIndicator 
                                    value={entity.punctualityRate}
                                    objective={objectives.punctualityRate}
                                    higherIsBetter={true}
                                    tooltipLabel="Ponctualité"
                                    unit="%"
                                />
                           </div>
                           <div className="flex items-center gap-1">
                                Taux d'échec: {(100 - entity.successRate).toFixed(2)}%
                                 <ObjectiveIndicator 
                                    value={100 - entity.successRate}
                                    objective={objectives.failureRate}
                                    higherIsBetter={false}
                                    tooltipLabel="Taux d'échec"
                                    unit="%"
                                />
                           </div>
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-6 lg:grid-cols-2">
                        <div>
                             <h4 className="font-semibold mb-2 text-center">Distribution des notes</h4>
                             <RatingChart data={entity.ratingDistribution} />
                        </div>
                       <CommentsList title="Commentaires Négatifs (≤ 3★)" comments={entity.negativeComments} icon={ThumbsDown} />
                    </CardContent>
                </Card>
            ))}
        </div>
       </ScrollArea>
    )
};

interface CustomerSatisfactionProps {
    data: Delivery[];
    objectives: Objectives;
    onNavigate: (view: string, detail?: Partial<DetailViewState>) => void;
}

export function CustomerSatisfaction({ data, objectives, onNavigate }: CustomerSatisfactionProps) {
    const [activeTab, setActiveTab] = useState<GroupingKey>("depot");

    const satisfactionStats = useMemo(() => {
        const getStatsForGroup = (groupBy: GroupingKey) => {
            const aggregated = aggregateStats(data, groupBy);
            const commentsData = getSatisfactionComments(data, groupBy);
            
            return Object.entries(aggregated).map(([name, stats]) => {
                const ratingCounts: Record<number, number> = {1:0, 2:0, 3:0, 4:0, 5:0};
                data.forEach(d => {
                    if (d[groupBy] === name && d.deliveryRating) {
                         ratingCounts[d.deliveryRating]++;
                    }
                });

                return {
                    ...stats,
                    name,
                    comments: commentsData[name]?.comments || [],
                    negativeComments: commentsData[name]?.negativeComments || [],
                    ratingDistribution: Object.entries(ratingCounts).map(([rating, count]) => ({ name: `${rating} ★`, count })).reverse(),
                    carrier: groupBy === 'driver' ? data.find(d => d.driver === name)?.carrier : undefined,
                };
            }).sort((a,b) => b.totalRatings - a.totalRatings);
        };

        return {
            depot: getStatsForGroup("depot"),
            warehouse: getStatsForGroup("warehouse"),
            carrier: getStatsForGroup("carrier"),
            driver: getStatsForGroup("driver"),
        }
    }, [data]);
    

    const allComments = useMemo(() => {
        return data.filter(d => d.feedbackComment)
            .map(d => ({
                comment: d.feedbackComment!,
                rating: d.deliveryRating!,
                driver: d.driver,
                depot: d.depot,
                warehouse: d.warehouse,
                carrier: d.carrier
            }));
    }, [data]);
    
    const allNegativeComments = useMemo(() => allComments.filter(c => c.rating <= 3), [allComments]);
    
    const tabs : {id: GroupingKey, label: string, icon: React.ElementType}[] = [
        { id: "depot", label: "Par Dépôt", icon: Building },
        { id: "warehouse", label: "Par Entrepôt", icon: WarehouseIcon },
        { id: "carrier", label: "Par Transporteur", icon: Truck },
        { id: "driver", label: "Par Livreur", icon: User },
    ]

    const handlePrint = () => {
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.classList.add('print-satisfaction-report');
            window.print();
            mainContent.classList.remove('print-satisfaction-report');
        }
    };

    const handleExcelExport = async () => {
        const wb = XLSX.utils.book_new();

        // Sheet 1: Rankings
        const depotRankings = getRankings(satisfactionStats.depot, 'averageRating', 5);
        const carrierRankings = getRankings(satisfactionStats.carrier, 'averageRating', 5);
        const driverRankings = getRankings(satisfactionStats.driver, 'averageRating', 10);
        
        const formatTopRankingData = (ranking: any[], entityName: string) => 
            ranking.map(r => ({
                [entityName]: r.name,
                "Note Moyenne": r.averageRating.toFixed(2),
                "Nombre de notes": r.totalRatings
            }));

        const formatFlopRankingData = (ranking: any[], entityName: string) => 
            ranking.map(r => ({
                [entityName]: r.name,
                "Note Moyenne": r.averageRating.toFixed(2),
                "Nombre de notes": r.totalRatings,
                "Mauvaises Notes (≤3★)": r.negativeComments.length
            }));

        const rankingData: any[] = [
            { "Classements": "Satisfaction Client" },
            {},
            { "Classements": "TOP 5 Dépôts" },
            ...formatTopRankingData(depotRankings.top, "Dépôt"),
            {},
            { "Classements": "FLOP 5 Dépôts" },
            ...formatFlopRankingData(depotRankings.flop, "Dépôt"),
            {},
            { "Classements": "TOP 5 Transporteurs" },
            ...formatTopRankingData(carrierRankings.top, "Transporteur"),
            {},
            { "Classements": "FLOP 5 Transporteurs" },
            ...formatFlopRankingData(carrierRankings.flop, "Transporteur"),
            {},
            { "Classements": "TOP 10 Livreurs" },
            ...formatTopRankingData(driverRankings.top, "Livreur"),
            {},
            { "Classements": "FLOP 10 Livreurs" },
            ...formatFlopRankingData(driverRankings.flop, "Livreur"),
        ];

        const rankingSheet = XLSX.utils.json_to_sheet(rankingData, {skipHeader: true});
        XLSX.utils.book_append_sheet(wb, rankingSheet, "Classements Satisfaction");

        // Sheet 2: Detail par depot
        const depotData = satisfactionStats.depot.map(d => ({
            "Dépôt": d.name,
            "Note Moyenne": d.averageRating.toFixed(2),
            "Nombre de notes": d.totalRatings,
            "Mauvaises Notes (≤3★)": d.negativeComments.length,
        }));
        const depotSheet = XLSX.utils.json_to_sheet(depotData);
        XLSX.utils.book_append_sheet(wb, depotSheet, "Détail par Dépôt");

        // Sheet 3: Detail par transporteur
        const carrierData = satisfactionStats.carrier.map(c => ({
            "Transporteur": c.name,
            "Note Moyenne": c.averageRating.toFixed(2),
            "Nombre de notes": c.totalRatings,
            "Mauvaises Notes (≤3★)": c.negativeComments.length,
        }));
        const carrierSheet = XLSX.utils.json_to_sheet(carrierData);
        XLSX.utils.book_append_sheet(wb, carrierSheet, "Détail par Transporteur");
        
        // Sheet 4: Negative comments
        const negativeCommentExport = allNegativeComments.map(c => ({
            "Note": c.rating,
            "Commentaire": c.comment,
            "Livreur": c.driver,
            "Dépôt": c.depot,
        }));
        const analysisSheet = XLSX.utils.json_to_sheet(negativeCommentExport);
        XLSX.utils.book_append_sheet(wb, analysisSheet, "Commentaires Négatifs");

        XLSX.writeFile(wb, "rapport_satisfaction.xlsx");
    };
    
    return (
        <>
            <div className="no-print">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold font-headline">Satisfaction Client</h2>
                    <div className="flex gap-2">
                        <Button onClick={handleExcelExport} variant="outline">
                            <Download className="mr-2 h-4 w-4" />
                            Exporter en Excel
                        </Button>
                        <Button onClick={handlePrint} variant="outline">
                            <Printer className="mr-2 h-4 w-4" />
                            Exporter en PDF
                        </Button>
                    </div>
                </div>
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as GroupingKey)}>
                    <TabsList className="grid w-full grid-cols-4">
                        {tabs.map(tab => (
                            <TabsTrigger key={tab.id} value={tab.id}><tab.icon className="mr-2 h-4 w-4" />{tab.label}</TabsTrigger>
                        ))}
                    </TabsList>
                    <TabsContent value="depot">
                        <EntitySatisfactionView stats={satisfactionStats.depot} objectives={objectives} onNavigate={onNavigate} groupBy="depot" />
                    </TabsContent>
                    <TabsContent value="warehouse">
                        <EntitySatisfactionView stats={satisfactionStats.warehouse} objectives={objectives} onNavigate={onNavigate} groupBy="warehouse" />
                    </TabsContent>
                    <TabsContent value="carrier">
                        <EntitySatisfactionView stats={satisfactionStats.carrier} objectives={objectives} onNavigate={onNavigate} groupBy="carrier" />
                    </TabsContent>
                    <TabsContent value="driver">
                        <EntitySatisfactionView stats={satisfactionStats.driver} objectives={objectives} onNavigate={onNavigate} groupBy="driver" />
                    </TabsContent>
                </Tabs>
            </div>
             <div className="print-only print-satisfaction-content">
                <div className="print-satisfaction-page">
                    <h1 className="text-2xl font-bold mb-4">Rapport de Satisfaction Client - Global</h1>
                    <CommentsList title={`Commentaires Négatifs (≤ 3★) - Tous les dépôts`} comments={allNegativeComments} icon={ThumbsDown} />
                </div>
                {satisfactionStats.depot.map(depotStat => (
                    <div key={depotStat.name} className="print-satisfaction-page">
                        <h1 className="text-2xl font-bold mb-4">Rapport de Satisfaction Client - Dépôt: {depotStat.name}</h1>
                        <CommentsList title={`Commentaires Négatifs (≤ 3★) - ${depotStat.name}`} comments={depotStat.negativeComments} icon={ThumbsDown} />
                    </div>
                ))}
            </div>
        </>
    );
}
