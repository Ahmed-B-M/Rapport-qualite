"use client"

import { useMemo, useState, useEffect } from 'react';
import { type Delivery, type StatsByEntity } from '@/lib/definitions';
import { aggregateStats } from '@/lib/data-processing';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { analyzeDepotDelivery } from '@/ai/flows/depot-delivery-analysis';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Bot, Loader2 } from 'lucide-react';

export function DepotAnalytics({ data }: { data: Delivery[] }) {
    const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
    const [loadingAi, setLoadingAi] = useState(true);

    const depotStats = useMemo(() => {
        const stats = aggregateStats(data, 'depot');
        return Object.entries(stats).map(([name, stat]) => ({ name, ...stat }));
    }, [data]);

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

    const formatDelay = (seconds: number) => {
        const minutes = Math.floor(Math.abs(seconds) / 60);
        return `${seconds < 0 ? '-' : ''}${minutes}m`;
    };

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Taux de réussite par dépôt</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={depotStats}>
                                <XAxis dataKey="name" />
                                <YAxis unit="%" domain={[0, 100]} />
                                <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} contentStyle={{ background: "hsl(var(--background))" }} />
                                <Bar dataKey="successRate" fill="hsl(var(--chart-1))" name="Taux de réussite" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Retard moyen par dépôt</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={depotStats}>
                                <XAxis dataKey="name" />
                                <YAxis unit="m" formatter={val => Math.floor(val/60).toString()} />
                                <Tooltip formatter={(value) => formatDelay(Number(value))} contentStyle={{ background: "hsl(var(--background))" }}/>
                                <Bar dataKey="averageDelay" fill="hsl(var(--chart-2))" name="Retard moy." />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
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
                                <TableHead className="text-right">Retard moy.</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {depotStats.map((stat) => (
                                <TableRow key={stat.name}>
                                    <TableCell className="font-medium">{stat.name}</TableCell>
                                    <TableCell className="text-right">{stat.totalDeliveries}</TableCell>
                                    <TableCell className="text-right">{stat.successRate.toFixed(1)}%</TableCell>
                                    <TableCell className="text-right">{formatDelay(stat.averageDelay)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
