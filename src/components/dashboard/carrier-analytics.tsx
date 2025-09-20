
'use client';

import { useMemo } from 'react';
import { type Delivery } from '@/lib/definitions';
import { aggregateStats } from '@/lib/data-processing';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ArrowUpRight } from 'lucide-react';

interface CarrierAnalyticsProps {
    data: Delivery[];
}

export function CarrierAnalytics({ data }: CarrierAnalyticsProps) {
    const carrierStats = useMemo(() => {
        const stats = aggregateStats(data, 'carrier');
        const sorted = Object.entries(stats).sort(([, a], [, b]) => b.totalDeliveries - a.totalDeliveries);
        return sorted.map(([name, stat]) => ({
            name,
            ...stat,
            failureRate: 100 - stat.successRate,
        }));
    }, [data]);

    const getBadgeVariant = (rate: number) => {
        if (rate > 95) return "success";
        if (rate > 90) return "default";
        return "destructive";
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Performance des transporteurs</CardTitle>
                <CardDescription>Cliquez sur un transporteur pour voir les détails.</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[300px]">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Transporteur</TableHead>
                                <TableHead className="text-right">Livraisons</TableHead>
                                <TableHead className="text-right">Taux de Succès</TableHead>
                                <TableHead className="text-right">Note Moyenne</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {carrierStats.map((stat) => (
                                <TableRow key={stat.name} className="cursor-pointer">
                                    <TableCell className="font-medium">{stat.name}</TableCell>
                                    <TableCell className="text-right">{stat.totalDeliveries}</TableCell>
                                    <TableCell className="text-right">
                                        <Badge variant={getBadgeVariant(stat.successRate)}>{stat.successRate.toFixed(1)}%</Badge>
                                    </TableCell>
                                    <TableCell className="text-right">{stat.averageRating > 0 ? stat.averageRating.toFixed(2) : 'N/A'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
