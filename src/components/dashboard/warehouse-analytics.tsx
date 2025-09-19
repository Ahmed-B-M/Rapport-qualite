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

    const formatDelay = (seconds: number) => {
        const minutes = Math.floor(Math.abs(seconds) / 60);
        const secs = Math.abs(seconds) % 60;
        const sign = seconds < 0 ? "-" : "";
        return `${sign}${minutes}m ${secs.toFixed(0)}s`;
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>Warehouse Performance</CardTitle>
                    <Input 
                        placeholder="Filter warehouses..." 
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
                            <TableHead>Warehouse</TableHead>
                            <TableHead className="text-right">Depot</TableHead>
                            <TableHead className="text-right">Total Deliveries</TableHead>
                            <TableHead className="text-right">Success Rate</TableHead>
                            <TableHead className="text-right">Avg. Delay</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredStats.length > 0 ? filteredStats.map((stat) => (
                            <TableRow key={stat.name}>
                                <TableCell className="font-medium">{stat.name}</TableCell>
                                <TableCell className="text-right text-muted-foreground">{data.find(d => d.warehouse === stat.name)?.depot}</TableCell>
                                <TableCell className="text-right">{stat.totalDeliveries}</TableCell>
                                <TableCell className="text-right">{stat.successRate.toFixed(1)}%</TableCell>
                                <TableCell className="text-right" style={{color: stat.averageDelay > 0 ? "hsl(var(--destructive))" : "hsl(var(--primary))"}}>
                                    {formatDelay(stat.averageDelay)}
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24">
                                    No warehouses found matching your filter.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
