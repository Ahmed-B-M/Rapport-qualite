
'use client';

import { useMemo } from 'react';
import { type Delivery } from '@/lib/definitions';
import { aggregateStats } from '@/lib/data-processing';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ArrowUpRight } from 'lucide-react';

interface DriverAnalyticsProps {
    data: Delivery[];
}

export function DriverAnalytics({ data }: DriverAnalyticsProps) {
    const driverStats = useMemo(() => {
        const stats = aggregateStats(data, 'driver');
        // Top 5 drivers by delivery count
        const sorted = Object.entries(stats)
            .sort(([, a], [, b]) => b.totalDeliveries - a.totalDeliveries)
            .slice(0, 5); 
        return sorted.map(([name, stat]) => ({
            name,
            ...stat,
            carrier: data.find(d => d.driver === name)?.carrier || 'Inconnu'
        }));
    }, [data]);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Top 5 Livreurs</CardTitle>
                    <CardDescription>Basé sur le volume de livraisons.</CardDescription>
                </div>
                <Badge variant="outline">
                    Voir tout <ArrowUpRight className="h-4 w-4 ml-1" />
                </Badge>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[300px]">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Livreur</TableHead>
                                <TableHead>Transporteur</TableHead>
                                <TableHead className="text-right">Livraisons</TableHead>
                                <TableHead className="text-right">Note Moyenne</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {driverStats.map((stat) => (
                                <TableRow key={stat.name}>
                                    <TableCell className="font-medium">{stat.name}</TableCell>
                                    <TableCell className="text-muted-foreground">{stat.carrier}</TableCell>
                                    <TableCell className="text-right">{stat.totalDeliveries}</TableCell>
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
