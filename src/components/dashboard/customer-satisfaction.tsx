"use client"

import { useMemo, useState, useEffect } from 'react';
import { type Delivery } from '@/lib/definitions';
import { type Objectives, type AICache } from '@/app/page';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Star, MessageSquareQuote, ThumbsDown, User, Building, Truck, Warehouse as WarehouseIcon, Bot, Loader2, AlertTriangle, Search, Printer, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import { analyzeCustomerFeedback, type AnalyzeCustomerFeedbackOutput } from '@/ai/flows/analyze-customer-feedback';
import { Button } from '../ui/button';
import * as XLSX from 'xlsx';
import { getRankings } from '@/lib/data-processing';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

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

type EntitySatisfactionStats = {
    name: string;
    averageRating: number;
    totalRatings: number;
    badRatings: number;
    ratingDistribution: RatingData[];
    comments: Comment[];
    negativeComments: Comment[];
    // Add missing fields for getRankings
    totalDeliveries: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    pendingDeliveries: number;
    successRate: number;
    failureReasons: Record<string, number>;
    totalRating: number;
    ratedDeliveries: number;
    onTimeDeliveries: number;
    punctualityRate: number;
    forcedNoContactCount: number;
    forcedNoContactRate: number;
    forcedOnSiteCount: number;
    forcedOnSiteRate: number;
    webCompletionCount: number;
    webCompletionRate: number;
    ratingRate: number;
}

const getSatisfactionStats = (data: Delivery[], groupBy: GroupingKey): EntitySatisfactionStats[] => {
    const entities: Record<string, { totalRating: number, count: number, comments: Comment[], ratingCounts: Record<number, number>, badRatings: number }> = {};

    data.forEach(d => {
        if (d.deliveryRating) {
            const entityName = d[groupBy];
            if (!entities[entityName]) {
                entities[entityName] = { totalRating: 0, count: 0, comments: [], ratingCounts: {1:0, 2:0, 3:0, 4:0, 5:0}, badRatings: 0 };
            }
            entities[entityName].totalRating += d.deliveryRating;
            entities[entityName].count++;
            entities[entityName].ratingCounts[d.deliveryRating]++;
            
            if (d.deliveryRating <= 3) {
                entities[entityName].badRatings++;
            }
            
            if (d.feedbackComment) {
                entities[entityName].comments.push({
                    comment: d.feedbackComment,
                    rating: d.deliveryRating,
                    driver: d.driver,
                    depot: d.depot,
                    warehouse: d.warehouse,
                    carrier: d.carrier
                });
            }
        }
    });

    return Object.entries(entities).map(([name, stats]) => ({
        name,
        averageRating: stats.count > 0 ? stats.totalRating / stats.count : 0,
        totalRatings: stats.count,
        ratedDeliveries: stats.count,
        badRatings: stats.badRatings,
        ratingDistribution: Object.entries(stats.ratingCounts).map(([rating, count]) => ({ name: `${rating} ★`, count })).reverse(),
        comments: stats.comments,
        negativeComments: stats.comments.filter(c => c.rating <= 3),
        // Add dummy fields to satisfy getRankings
        totalDeliveries: stats.count,
        successfulDeliveries: 0,
        failedDeliveries: 0,
        pendingDeliveries: 0,
        successRate: 0,
        failureReasons: {},
        totalRating: stats.totalRating,
        onTimeDeliveries: 0,
        punctualityRate: 0,
        forcedNoContactCount: 0,
        forcedNoContactRate: 0,
        forcedOnSiteCount: 0,
        forcedOnSiteRate: 0,
        webCompletionCount: 0,
        webCompletionRate: 0,
        ratingRate: 0,
    })).sort((a,b) => b.totalRatings - a.totalRatings);
}

const RatingChart = ({ data }: { data: RatingData[] }) => (
    <ResponsiveContainer width="100%" height={150}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
            <RechartsTooltip
                cursor={{ fill: 'hsl(var(--muted))' }}
                contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}
            />
            <Bar dataKey="count" name="Nombre" barSize={20} radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => {
                    const rating = parseInt(entry.name.charAt(0));
                    const color = rating <= 3 ? "hsl(var(--destructive))" : (rating === 4 ? "hsl(var(--primary))" : "hsl(var(--chart-1))");
                    return <Cell key={`cell-${index}`} fill={color} />;
                })}
            </Bar>
        </BarChart>
    </ResponsiveContainer>
);

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

const NegativeFeedbackAIAnalysis = ({ comments, title, cacheKey, aiCache, setAiCache, loadingAi, setLoadingAi }: { 
    comments: Comment[], 
    title?: string,
    cacheKey: string,
    aiCache: AICache,
    setAiCache: React.Dispatch<React.SetStateAction<AICache>>,
    loadingAi: Record<string, boolean>,
    setLoadingAi: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
}) => {
    const analysis = aiCache.customerFeedbackAnalysis?.[cacheKey] as AnalyzeCustomerFeedbackOutput | undefined;
    const isLoading = loadingAi[`customerFeedback_${cacheKey}`];

    useEffect(() => {
        const performAnalysis = async () => {
            if (analysis) return;
            
            setLoadingAi(prev => ({ ...prev, [`customerFeedback_${cacheKey}`]: true }));
            try {
                const commentTexts = comments.map(c => c.comment);
                const result = await analyzeCustomerFeedback({ comments: commentTexts });
                setAiCache(prev => ({
                    ...prev,
                    customerFeedbackAnalysis: { ...prev.customerFeedbackAnalysis, [cacheKey]: result }
                }));
            } catch (error) {
                console.error("AI feedback analysis failed:", error);
                const errorResult = { categoryCounts: {}, analysisSummary: "L'analyse par IA a échoué." };
                 setAiCache(prev => ({
                    ...prev,
                    customerFeedbackAnalysis: { ...prev.customerFeedbackAnalysis, [cacheKey]: errorResult }
                }));
            }
            setLoadingAi(prev => ({ ...prev, [`customerFeedback_${cacheKey}`]: false }));
        };
        performAnalysis();
    }, [comments, analysis, cacheKey, setAiCache, setLoadingAi]);
    
    const analysisData = useMemo(() => (
        analysis ? Object.entries(analysis.categoryCounts)
            .map(([name, count]) => ({ name, count }))
            .filter(item => item.count > 0)
            .sort((a,b) => b.count - a.count) 
        : []
    ), [analysis]);

    if (comments.length === 0) {
        return null;
    }

    return (
        <Card className="mt-6 col-span-full">
            <CardHeader>
                 <CardTitle className="flex items-center gap-2">
                    <Search /> {title || "Analyse des retours négatifs"}
                </CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading || !analysis ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="animate-spin h-4 w-4" />
                        <span>Analyse des commentaires en cours...</span>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2">
                        <div>
                             <h4 className="font-semibold mb-2">Résumé de l'analyse</h4>
                             <p className="text-sm text-muted-foreground">{analysis.analysisSummary}</p>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-2">Catégories de problèmes</h4>
                            {analysisData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={150}>
                                    <BarChart data={analysisData} layout="vertical" margin={{ top: 5, right: 20, left: 100, bottom: 5 }}>
                                        <XAxis type="number" hide />
                                        <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={100} tick={{fontSize: 11}} />
                                        <RechartsTooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
                                        <Bar dataKey="count" name="Nombre" fill="hsl(var(--destructive))" barSize={20} radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <p className="text-sm text-muted-foreground">Aucune catégorie spécifique n'a été identifiée.</p>
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
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


const EntitySatisfactionView = ({ stats, objectives, ...aiProps }: { 
    stats: EntitySatisfactionStats[], 
    objectives: Objectives,
    aiCache: AICache;
    setAiCache: React.Dispatch<React.SetStateAction<AICache>>;
    loadingAi: Record<string, boolean>;
    setLoadingAi: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}) => {
    if (stats.length === 0) {
         return (
            <div className="flex h-96 flex-col items-center justify-center text-center text-muted-foreground">
                 <Star className="h-12 w-12 mb-4" />
                <p className="font-semibold text-lg">Aucune donnée de notation disponible.</p>
                <p>Aucune livraison dans cet ensemble de données n'a encore été notée.</p>
            </div>
        )
    }
    
    return (
       <ScrollArea className="h-[75vh]">
         <div className="space-y-6 pr-4">
            {stats.map(entity => (
                <Card key={entity.name} className="overflow-hidden">
                    <CardHeader>
                        <CardTitle>{entity.name}</CardTitle>
                        <CardDescription className="flex items-center gap-2">
                           <div className="flex items-center gap-1">
                                Note moyenne de {entity.averageRating.toFixed(2)} sur {entity.totalRatings} notations
                                <ObjectiveIndicator 
                                    value={entity.averageRating}
                                    objective={objectives.averageRating}
                                    higherIsBetter={true}
                                    tooltipLabel="Note moyenne"
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
                       <NegativeFeedbackAIAnalysis 
                            comments={entity.negativeComments} 
                            cacheKey={entity.name}
                            {...aiProps}
                        />
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
    aiCache: AICache;
    setAiCache: React.Dispatch<React.SetStateAction<AICache>>;
    loadingAi: Record<string, boolean>;
    setLoadingAi: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

export function CustomerSatisfaction({ data, objectives, aiCache, setAiCache, loadingAi, setLoadingAi }: CustomerSatisfactionProps) {
    const [activeTab, setActiveTab] = useState<GroupingKey>("depot");

    const satisfactionStats = useMemo(() => ({
        depot: getSatisfactionStats(data, "depot"),
        warehouse: getSatisfactionStats(data, "warehouse"),
        carrier: getSatisfactionStats(data, "carrier"),
        driver: getSatisfactionStats(data, "driver"),
    }), [data]);

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
    const allPositiveComments = useMemo(() => allComments.filter(c => c.rating > 3), [allComments]);
    
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
                "Mauvaises Notes (≤3★)": r.badRatings
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
            "Mauvaises Notes (≤3★)": d.badRatings,
        }));
        const depotSheet = XLSX.utils.json_to_sheet(depotData);
        XLSX.utils.book_append_sheet(wb, depotSheet, "Détail par Dépôt");

        // Sheet 3: Detail par transporteur
        const carrierData = satisfactionStats.carrier.map(c => ({
            "Transporteur": c.name,
            "Note Moyenne": c.averageRating.toFixed(2),
            "Nombre de notes": c.totalRatings,
            "Mauvaises Notes (≤3★)": c.badRatings,
        }));
        const carrierSheet = XLSX.utils.json_to_sheet(carrierData);
        XLSX.utils.book_append_sheet(wb, carrierSheet, "Détail par Transporteur");
        
        // Sheet 4: Analyse des commentaires
        try {
            const negativeCommentTexts = allNegativeComments.map(c => c.comment);
            const analysisResult = await analyzeCustomerFeedback({ comments: negativeCommentTexts });
            
            const categoryData = Object.entries(analysisResult.categoryCounts)
                .map(([name, count]) => ({ "Catégorie": name, "Nombre de commentaires": count }))
                .sort((a, b) => b["Nombre de commentaires"] - a["Nombre de commentaires"]);

            const negativeCommentExport = allNegativeComments.map(c => ({
                "Note": c.rating,
                "Commentaire": c.comment,
                "Livreur": c.driver,
                "Dépôt": c.depot,
            }));
            
            const positiveCommentExport = allPositiveComments.map(c => ({
                "Note": c.rating,
                "Commentaire": c.comment,
                "Livreur": c.driver,
                "Dépôt": c.depot,
            }));

            const analysisSheetData : any[] = [
                {"Analyse des Commentaires": "Classement des catégories (commentaires négatifs)"},
                ...categoryData,
                {},
                {"Analyse des Commentaires": `Liste des Commentaires Négatifs (${allNegativeComments.length})`},
                ...negativeCommentExport,
                {},
                {"Analyse des Commentaires": `Liste des Commentaires Positifs (${allPositiveComments.length})`},
                ...positiveCommentExport
            ];

            const analysisSheet = XLSX.utils.json_to_sheet(analysisSheetData, {skipHeader: false});
            XLSX.utils.book_append_sheet(wb, analysisSheet, "Analyse Commentaires");

        } catch (e) {
            console.error("Failed to generate AI analysis for Excel export:", e);
            // Optionally add a sheet indicating the failure
            const errorSheet = XLSX.utils.json_to_sheet([{ Error: "L'analyse IA des commentaires a échoué et n'a pas pu être incluse." }]);
            XLSX.utils.book_append_sheet(wb, errorSheet, "Erreur Analyse IA");
        }


        XLSX.writeFile(wb, "rapport_satisfaction.xlsx");
    };
    
    const aiProps = { aiCache, setAiCache, loadingAi, setLoadingAi };

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
                        <EntitySatisfactionView stats={satisfactionStats.depot} objectives={objectives} {...aiProps} />
                    </TabsContent>
                    <TabsContent value="warehouse">
                        <EntitySatisfactionView stats={satisfactionStats.warehouse} objectives={objectives} {...aiProps} />
                    </TabsContent>
                    <TabsContent value="carrier">
                        <EntitySatisfactionView stats={satisfactionStats.carrier} objectives={objectives} {...aiProps} />
                    </TabsContent>
                    <TabsContent value="driver">
                        <EntitySatisfactionView stats={satisfactionStats.driver} objectives={objectives} {...aiProps} />
                    </TabsContent>
                </Tabs>
            </div>
             <div className="print-only print-satisfaction-content">
                <div className="print-satisfaction-page">
                    <h1 className="text-2xl font-bold mb-4">Rapport de Satisfaction Client - Global</h1>
                    <CommentsList title={`Commentaires Négatifs (≤ 3★) - Tous les dépôts`} comments={allNegativeComments} icon={ThumbsDown} />
                    <NegativeFeedbackAIAnalysis comments={allNegativeComments} title="Analyse Globale des Retours Négatifs" cacheKey="global" {...aiProps} />
                </div>
                {satisfactionStats.depot.map(depotStat => (
                    <div key={depotStat.name} className="print-satisfaction-page">
                        <h1 className="text-2xl font-bold mb-4">Rapport de Satisfaction Client - Dépôt: {depotStat.name}</h1>
                        <CommentsList title={`Commentaires Négatifs (≤ 3★) - ${depotStat.name}`} comments={depotStat.negativeComments} icon={ThumbsDown} />
                        <NegativeFeedbackAIAnalysis comments={depotStat.negativeComments} title={`Analyse des Retours Négatifs - ${depotStat.name}`} cacheKey={depotStat.name} {...aiProps} />
                    </div>
                ))}
            </div>
        </>
    );
}

    
