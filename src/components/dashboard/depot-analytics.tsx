"use client"

import { useMemo, useState, useEffect } from 'react';
import { type Delivery, type AggregatedStats } from '@/lib/definitions';
import { aggregateStats, getRankings, type Ranking } from '@/lib/data-processing';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { analyzeDepotDelivery } from '@/ai/flows/depot-delivery-analysis';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
        successRate: getRankings(depotStats, 'successRate'),
        averageRating: getRankings(depotStats, 'averageRating'),
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

    const RankingList = ({ title, ranking, metric }: { title: string, ranking: Ranking<DepotStat>, metric: 'successRate' | 'averageRating' }) => (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <h4 className="flex items-center gap-2 font-semibold text-green-600"><ThumbsUp /> Top 3</h4>
                    <ul className="list-disc pl-5 text-sm space-y-1 mt-2">
                        {ranking.top.map(d => (
                            <li key={d.name}>{d.name} <Badge variant="secondary">{d[metric].toFixed(1) + (metric === 'averageRating' ? '/5' : '%')}</Badge></li>
                        ))}
                    </ul>
                </div>
                <div>
                    <h4 className="flex items-center gap-2 font-semibold text-red-600"><ThumbsDown /> Flop 3</h4>
                    <ul className="list-disc pl-5 text-sm space-y-1 mt-2">
                         {ranking.flop.map(d => (
                            <li key={d.name}>{d.name} <Badge variant="destructive">{d[metric].toFixed(1) + (metric === 'averageRating' ? ' /5' : '%')}</Badge></li>
                        ))}
                    </ul>
                </div>
            </CardContent>
        </Card>
    )

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <RankingList title="Classement par Taux de Réussite" ranking={rankings.successRate} metric="successRate" />
                <RankingList title="Classement par Note Moyenne" ranking={rankings.averageRating} metric="averageRating" />
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
                                <TableHead className="text-right">Taux de réussite</TableHead>
                                <TableHead className="text-right">Note moy.</TableHead>
                                <TableHead className="text-right">Sans contact forcé</TableHead>
                                <TableHead className="text-right">Validation Web</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {depotStats.map((stat) => (
                                <TableRow key={stat.name}>
                                    <TableCell className="font-medium">{stat.name}</TableCell>
                                    <TableCell className="text-right">{stat.totalDeliveries}</TableCell>
                                    <TableCell className="text-right">{stat.successRate.toFixed(1)}%</TableCell>
                                    <TableCell className="text-right">{stat.averageRating > 0 ? stat.averageRating.toFixed(2) : 'N/A'}</TableCell>
                                    <TableCell className="text-right">{stat.forcedNoContactRate.toFixed(1)}%</TableCell>
                                    <TableCell className="text-right">{stat.webCompletionRate.toFixed(1)}%</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
