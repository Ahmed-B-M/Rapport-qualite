"use client"

import { useMemo, useState } from 'react';
import { type Delivery } from '@/lib/definitions';
import { aggregateStats } from '@/lib/data-processing';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowUpDown } from 'lucide-react';

type SortKey = 'name' | 'totalDeliveries' | 'successRate' | 'averageDelay';

export function DriverAnalytics({ data }: { data: Delivery[] }) {
    const [filter, setFilter] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'totalDeliveries', direction: 'desc' });

    const driverStats = useMemo(() => {
        const stats = aggregateStats(data, 'driver');
        return Object.entries(stats).map(([name, stat]) => ({ name, ...stat, carrier: data.find(d => d.driver === name)?.carrier || 'Unknown' }));
    }, [data]);

    const sortedAndFilteredStats = useMemo(() => {
        let sortableItems = [...driverStats].filter(stat => stat.name.toLowerCase().includes(filter.toLowerCase()));

        sortableItems.sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (a[sortConfig.key] > b[sortConfig.key]) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });

        return sortableItems;
    }, [driverStats, filter, sortConfig]);
    
    const requestSort = (key: SortKey) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: SortKey) => {
        if (sortConfig.key !== key) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />;
        return sortConfig.direction === 'asc' ? '▲' : '▼';
    }

    const formatDelay = (seconds: number) => {
        const minutes = Math.floor(Math.abs(seconds) / 60);
        const sign = seconds < 0 ? "-" : "";
        return `${sign}${minutes}m`;
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>Driver Performance</CardTitle>
                    <Input 
                        placeholder="Filter drivers..." 
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
                            <TableHead><Button variant="ghost" onClick={() => requestSort('name')}>Driver {getSortIcon('name')}</Button></TableHead>
                            <TableHead>Carrier</TableHead>
                            <TableHead className="text-right"><Button variant="ghost" onClick={() => requestSort('totalDeliveries')}>Total {getSortIcon('totalDeliveries')}</Button></TableHead>
                            <TableHead className="text-right"><Button variant="ghost" onClick={() => requestSort('successRate')}>Success % {getSortIcon('successRate')}</Button></TableHead>
                            <TableHead className="text-right"><Button variant="ghost" onClick={() => requestSort('averageDelay')}>Avg. Delay {getSortIcon('averageDelay')}</Button></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedAndFilteredStats.map((stat) => (
                            <TableRow key={stat.name}>
                                <TableCell className="font-medium">{stat.name}</TableCell>
                                <TableCell className="text-muted-foreground">{stat.carrier}</TableCell>
                                <TableCell className="text-right">{stat.totalDeliveries}</TableCell>
                                <TableCell className="text-right">{stat.successRate.toFixed(1)}%</TableCell>
                                <TableCell className="text-right" style={{color: stat.averageDelay > 0 ? "hsl(var(--destructive))" : "hsl(var(--primary))"}}>
                                    {formatDelay(stat.averageDelay)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
