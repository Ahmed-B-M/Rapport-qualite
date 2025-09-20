
"use client";

import { useMemo } from 'react';
import { type Delivery, type AggregatedStats } from '@/lib/definitions';
import { type RankingMetric } from '@/lib/data-processing';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ThumbsDown, Building2, Truck, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const METRIC_CONFIG: Record<RankingMetric, { title: string; description: string; unit: string; valueLabel: string; isFailureRate?: boolean; higherIsBetter: boolean; }> = {
    successRate: {
        title: "Analyse du Taux d'Échec",
        description: "Détails des raisons d'échec et des entités les plus impactées.",
        unit: '%',
        valueLabel: "Taux d'échec",
        isFailureRate: true,
        higherIsBetter: false,
    },
    averageRating: { 
        title: "Analyse de la Note Moyenne",
        description: "Détails sur les entités avec les notes moyennes les plus basses.",
        unit: '/5',
        valueLabel: "Note Moyenne",
        higherIsBetter: true,
    },
    punctualityRate: {
        title: "Analyse de la Ponctualité",
        description: "Détails sur les entités avec les taux de ponctualité les plus bas.",
        unit: '%',
        valueLabel: "Taux de ponctualité",
        higherIsBetter: true,
    },
    forcedOnSiteRate: {
        title: "Analyse 'Sur Place Forcé'",
        description: "Détails sur les entités avec les taux de 'sur place forcé' les plus élevés.",
        unit: '%',
        valueLabel: "Taux 'sur place forcé'",
        higherIsBetter: false,
    },
    forcedNoContactRate: {
        title: "Analyse 'Sans Contact Forcé'",
        description: "Détails sur les entités avec les taux de 'sans contact forcé' les plus élevés.",
        unit: '%',
        valueLabel: "Taux 'sans contact forcé'",
        higherIsBetter: false,
    },
    webCompletionRate: {
        title: "Analyse 'Validation Web'",
        description: "Détails sur les entités avec les taux de 'validation web' les plus élevés.",
        unit: '%',
        valueLabel: "Taux 'validation web'",
        higherIsBetter: false,
    },
};

const FailureReasonChart = ({ data }: { data: Delivery[] }) => {
    const failureReasons = useMemo(() => {
        const reasons: Record<string, number> = {};
        data.forEach(d => {
            if (d.status === 'Non livré' && d.failureReason) {
                reasons[d.failureReason] = (reasons[d.failureReason] || 0) + 1;
            }
        });
        return Object.entries(reasons)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    }, [data]);

    if (failureReasons.length === 0) {
        return <p className="text-sm text-muted-foreground">Aucune raison d'échec enregistrée.</p>;
    }

    return (
        <ResponsiveContainer width="100%" height={200}>
            <BarChart data={failureReasons} layout="vertical" margin={{ top: 5, right: 20, left: 120, bottom: 5 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={120} tick={{ fontSize: 11 }} />
                <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="count" name="Nombre" fill="hsl(var(--destructive))" barSize={20} radius={[0, 4, 4, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
};

const FlopRankingList = ({ title, rankings, metric, icon: Icon }: { 
    title: string; 
    rankings: any[]; 
    metric: RankingMetric;
    icon: React.ElementType 
}) => {
    
    const metricConfig = METRIC_CONFIG[metric];

    const getValue = (item: AggregatedStats) => {
        if (metricConfig.isFailureRate) return 100 - item.successRate;
        return item[metric as keyof AggregatedStats] as number;
    }

    const getRecurrence = (item: AggregatedStats) => {
        switch (metric) {
            case 'successRate': return item.failedDeliveries;
            case 'punctualityRate': return item.totalDeliveries - item.onTimeDeliveries;
            case 'forcedOnSiteRate': return item.forcedOnSiteCount;
            case 'forcedNoContactRate': return item.forcedNoContactCount;
            case 'webCompletionRate': return item.webCompletionCount;
            case 'averageRating': return item.ratedDeliveries;
            default: return item.totalDeliveries;
        }
    }
    
    const recurrenceLabel = metric === 'averageRating' ? 'Nb Notes' : 'Nb Cas';

    return (
        <div>
            <h4 className="font-semibold flex items-center gap-2 mb-2"><Icon className="h-4 w-4" /> {title}</h4>
            {rankings.length > 0 ? (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nom</TableHead>
                            <TableHead className="text-right">{metricConfig.valueLabel}</TableHead>
                            <TableHead className="text-right">{recurrenceLabel}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rankings.map(item => (
                            <TableRow key={item.name}>
                                <TableCell className="font-medium truncate max-w-[150px] sm:max-w-xs">{item.name}</TableCell>
                                <TableCell className={cn("text-right font-semibold", metricConfig.higherIsBetter ? "text-primary" : "text-destructive")}>
                                    {getValue(item).toFixed(2)}{metricConfig.unit}
                                </TableCell>
                                <TableCell className="text-right">{getRecurrence(item)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            ) : (
                 <p className="text-sm text-muted-foreground pl-2">Aucun classement "flop" à afficher.</p>
            )}
        </div>
    );
};

export function KpiDetailModal({ metric, onClose, data, rankings }: {
    metric: RankingMetric;
    onClose: () => void;
    data: Delivery[];
    rankings: any;
}) {
    const config = METRIC_CONFIG[metric];
    
    const entityRankings = useMemo(() => ({
        depots: rankings.depots[metric]?.flop || [],
        carriers: rankings.carriers[metric]?.flop || [],
        drivers: rankings.drivers[metric]?.flop || [],
    }), [rankings, metric]);

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>{config.title}</DialogTitle>
                    <DialogDescription>{config.description}</DialogDescription>
                </DialogHeader>
                <div className={cn("grid gap-6 py-4", config.isFailureRate && "md:grid-cols-2")}>
                    {config.isFailureRate && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Principales Raisons d'Échec</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <FailureReasonChart data={data} />
                            </CardContent>
                        </Card>
                    )}
                    <Card>
                         <CardHeader>
                            <CardTitle className="flex items-center gap-2"><ThumbsDown /> Classements "Flop"</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FlopRankingList title="Dépôts" rankings={entityRankings.depots} metric={metric} icon={Building2} />
                            <FlopRankingList title="Transporteurs" rankings={entityRankings.carriers} metric={metric} icon={Truck} />
                            <FlopRankingList title="Livreurs" rankings={entityRankings.drivers} metric={metric} icon={User} />
                        </CardContent>
                    </Card>
                </div>
            </DialogContent>
        </Dialog>
    );
}

    

    