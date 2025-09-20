
'use client';

import { useMemo } from 'react';
import { type Delivery } from '@/lib/definitions';
import { aggregateStats } from '@/lib/data-processing';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DepotAnalyticsProps {
    data: Delivery[];
}

export function DepotAnalytics({ data }: DepotAnalyticsProps) {
    const depotStats = useMemo(() => {
        const stats = aggregateStats(data, 'depot');
        const total = Object.values(stats).reduce((acc, curr) => acc + curr.totalDeliveries, 0);
        const sorted = Object.entries(stats)
            .map(([name, stat]) => ({
                name,
                ...stat,
                percentage: total > 0 ? (stat.totalDeliveries / total) * 100 : 0,
            }))
            .sort((a, b) => b.totalDeliveries - a.totalDeliveries);
        return sorted;
    }, [data]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Analyse par dépôt</CardTitle>
                <CardDescription>Répartition des livraisons par dépôt d'origine.</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[300px]">
                    <div className="space-y-4">
                        {depotStats.map((stat) => (
                            <div key={stat.name}>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm font-medium">{stat.name}</span>
                                    <span className="text-sm text-muted-foreground">{stat.totalDeliveries} livraisons ({stat.percentage.toFixed(1)}%)</span>
                                </div>
                                <Progress value={stat.percentage} />
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
