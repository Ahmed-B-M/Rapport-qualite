"use client"

import { useMemo, useState, useEffect } from 'react';
import { type Delivery, type AggregatedStats } from '@/lib/definitions';
import { aggregateStats, getRankings, type Ranking, type RankingMetric } from '@/lib/data-processing';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { analyzeDepotDelivery } from '@/ai/flows/depot-delivery-analysis';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bot, Loader2, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type DepotStat = { name: string } & AggregatedStats;

export function DepotAnalytics({ data }: { data: Delivery[] }) {
    const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
    const [loadingAi, setLoadingAi] = useState(true);

    const depotStats: DepotStat[] = useMemo(() => {
        const stats = aggregateStats(data, 'depot');
        return Object.entries(stats).map(([name, stat]) => ({ name, ...stat }));
    }, [data]);
    
    const rankings = useMemo(() => ({
        averageRating: getRankings(depotStats, 'averageRating'),
        punctualityRate: getRankings(depotStats, 'punctualityRate'),
        failureRate: getRankings(depotStats, 'successRate', 3, 'desc'), // Now using successRate and descending to get the worst
        forcedOnSiteRate: getRankings(depotStats, 'forcedOnSiteRate', 3, 'desc'),
        forcedNoContactRate: getRankings(depotStats, 'forcedNoContactRate', 3, 'desc'),
        webCompletionRate: getRankings(depotStats, 'webCompletionRate', 3, 'desc'),
    }), [depotStats]);

    useEffect(() => {
        const generateAnalysis = async () => {
            setLoadingAi(true);
            try {
                const relevantData = data.map(d => ({
                    depot: d.depot,
                    status: d.status,
                    delaySeconds: d.delaySeconds,
                }));
                
                const csvHeader = "depot,status,delaySeconds\n";
                const csvRows = relevantData.map(d => `${d.depot},${d.status},${d.delaySeconds}`).join("\n");
                const csvData = csvHeader + csvRows;

                const result = await analyzeDepotDelivery({ deliveryData: csvData });
                setAiAnalysis(result.analysisResults);
            } catch (error) {
                console.error("L'analyse IA a échoué:", error);
                setAiAnalysis("Nous n'avons pas pu générer d'analyse IA pour le moment. Veuillez réessayer plus tard.");
            }
            setLoadingAi(false);
        };
        generateAnalysis();
    }, [data]);

    const RankingList = ({ title, ranking, metric, unit, higherIsBetter }: { title: string, ranking: Ranking<DepotStat>, metric: RankingMetric, unit: string, higherIsBetter: boolean }) => {
        const formatValue = (value: number) => {
            return value.toFixed(2) + unit;
        }

        const getMetricValue = (stat: DepotStat) => {
            if (metric === 'successRate') {
                return 100 - stat.successRate; // Display failure rate
            }
            return stat[metric];
        }

        return (
            <Card>
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <h4 className="flex items-center gap-2 font-semibold text-green-600"><ThumbsUp /> Top 3</h4>
                        <ul className="list-disc pl-5 text-sm space-y-1 mt-2">
                            {ranking.top.map(d => (
                                <li key={d.name}>{d.name} <Badge variant="secondary">{formatValue(getMetricValue(d))}</Badge></li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h4 className="flex items-center gap-2 font-semibold text-red-600"><ThumbsDown /> Flop 3</h4>
                        <ul className="list-disc pl-5 text-sm space-y-1 mt-2">
                             {ranking.flop.map(d => (
                                <li key={d.name}>{d.name} <Badge variant="destructive">{formatValue(getMetricValue(d))}</Badge></li>
                            ))}
                        </ul>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <RankingList title="Classement par Note Moyenne" ranking={rankings.averageRating} metric="averageRating" unit="/5" higherIsBetter={true} />
                <RankingList title="Classement par Ponctualité" ranking={rankings.punctualityRate} metric="punctualityRate" unit="%" higherIsBetter={true} />
                <RankingList title="Classement Taux d'Échec" ranking={rankings.failureRate} metric="successRate" unit="%" higherIsBetter={false} />
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <RankingList title="Taux de 'Sur Place Forcé'" ranking={rankings.forcedOnSiteRate} metric="forcedOnSiteRate" unit="%" higherIsBetter={false} />
                <RankingList title="Taux de 'Sans Contact Forcé'" ranking={rankings.forcedNoContactRate} metric="forcedNoContactRate" unit="%" higherIsBetter={false} />
                <RankingList title="Taux de 'Validation Web'" ranking={rankings.webCompletionRate} metric="webCompletionRate" unit="%" higherIsBetter={true} />
            </div>
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bot />
                        Analyse de dépôt par l'IA
                    </CardTitle>
                    <CardDescription>
                        Une analyse automatisée des performances des dépôts.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                     {loadingAi ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="animate-spin h-4 w-4" />
                            <span>Génération de l'analyse...</span>
                        </div>
                    ) : (
                        <Alert>
                            <AlertDescription className="whitespace-pre-wrap">
                                {aiAnalysis}
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Données sur la performance des dépôts</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Dépôt</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead className="text-right">Note moy.</TableHead>
                                <TableHead className="text-right">Ponctualité</TableHead>
                                <TableHead className="text-right">Taux d'échec</TableHead>
                                <TableHead className="text-right">Sur place forcé</TableHead>
                                <TableHead className="text-right">Sans contact forcé</TableHead>
                                <TableHead className="text-right">Validation Web</TableHead>
                                <TableHead className="text-right">Taux de notation</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {depotStats.map((stat) => (
                                <TableRow key={stat.name}>
                                    <TableCell className="font-medium">{stat.name}</TableCell>
                                    <TableCell className="text-right">{stat.totalDeliveries}</TableCell>
                                    <TableCell className="text-right">{stat.averageRating > 0 ? stat.averageRating.toFixed(2) : 'N/A'}</TableCell>
                                    <TableCell className="text-right">{stat.punctualityRate.toFixed(2)}%</TableCell>
                                    <TableCell className="text-right">{(100 - stat.successRate).toFixed(2)}%</TableCell>
                                    <TableCell className="text-right">{stat.forcedOnSiteRate.toFixed(2)}%</TableCell>
                                    <TableCell className="text-right">{stat.forcedNoContactRate.toFixed(2)}%</TableCell>
                                    <TableCell className="text-right">{stat.webCompletionRate.toFixed(2)}%</TableCell>
                                    <TableCell className="text-right">{stat.ratingRate.toFixed(2)}%</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
