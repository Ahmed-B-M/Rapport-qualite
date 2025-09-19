"use client"

import { useMemo, useState } from 'react';
import { type Delivery } from '@/lib/definitions';
import { aggregateStats } from '@/lib/data-processing';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';

export function WarehouseAnalytics({ data }: { data: Delivery[] }) {
    const [filter, setFilter] = useState('');

    const warehouseStats = useMemo(() => {
        const stats = aggregateStats(data, 'warehouse');
        return Object.entries(stats).map(([name, stat]) => ({ name, ...stat }))
          .sort((a,b) => b.totalDeliveries - a.totalDeliveries);
    }, [data]);

    const filteredStats = useMemo(() => {
        return warehouseStats.filter(stat => stat.name.toLowerCase().includes(filter.toLowerCase()));
    }, [warehouseStats, filter]);

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>Performance des entrepôts</CardTitle>
                    <Input 
                        placeholder="Filtrer les entrepôts..." 
                        className="max-w-sm"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    />
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Entrepôt</TableHead>
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
                        {filteredStats.length > 0 ? filteredStats.map((stat) => (
                            <TableRow key={stat.name}>
                                <TableCell className="font-medium">{stat.name}</TableCell>
                                <TableCell className="text-muted-foreground">{data.find(d => d.warehouse === stat.name)?.depot}</TableCell>
                                <TableCell className="text-right">{stat.totalDeliveries}</TableCell>
                                <TableCell className="text-right">{stat.averageRating > 0 ? stat.averageRating.toFixed(2) : 'N/A'}</TableCell>
                                <TableCell className="text-right">{stat.punctualityRate.toFixed(2)}%</TableCell>
                                <TableCell className="text-right">{(100 - stat.successRate).toFixed(2)}%</TableCell>
                                <TableCell className="text-right">{stat.forcedOnSiteRate.toFixed(2)}%</TableCell>
                                <TableCell className="text-right">{stat.forcedNoContactRate.toFixed(2)}%</TableCell>
                                <TableCell className="text-right">{stat.webCompletionRate.toFixed(2)}%</TableCell>
                                <TableCell className="text-right">{stat.ratingRate.toFixed(2)}%</TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={10} className="text-center h-24">
                                    Aucun entrepôt ne correspond à votre filtre.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
