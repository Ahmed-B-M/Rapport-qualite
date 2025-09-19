"use client"

import { useMemo, useState } from 'react';
import { type Delivery } from '@/lib/definitions';
import { aggregateStats } from '@/lib/data-processing';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowUpDown } from 'lucide-react';

type SortKey = 'name' | 'totalDeliveries' | 'successRate' | 'averageRating' | 'forcedNoContactRate' | 'webCompletionRate';

export function DriverAnalytics({ data }: { data: Delivery[] }) {
    const [filter, setFilter] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'totalDeliveries', direction: 'desc' });

    const driverStats = useMemo(() => {
        const stats = aggregateStats(data, 'driver');
        return Object.entries(stats).map(([name, stat]) => ({ name, ...stat, carrier: data.find(d => d.driver === name)?.carrier || 'Inconnu' }));
    }, [data]);

    const sortedAndFilteredStats = useMemo(() => {
        let sortableItems = [...driverStats].filter(stat => stat.name.toLowerCase().includes(filter.toLowerCase()));

        sortableItems.sort((a, b) => {
            const valA = a[sortConfig.key];
            const valB = b[sortConfig.key];

            if (valA < valB) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (valA > valB) {
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
        } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: SortKey) => {
        if (sortConfig.key !== key) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />;
        return sortConfig.direction === 'asc' ? '▲' : '▼';
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>Performance des livreurs</CardTitle>
                    <Input 
                        placeholder="Filtrer les livreurs..." 
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
                            <TableHead><Button variant="ghost" onClick={() => requestSort('name')}>Livreur {getSortIcon('name')}</Button></TableHead>
                            <TableHead>Transporteur</TableHead>
                            <TableHead className="text-right"><Button variant="ghost" onClick={() => requestSort('totalDeliveries')}>Total {getSortIcon('totalDeliveries')}</Button></TableHead>
                            <TableHead className="text-right"><Button variant="ghost" onClick={() => requestSort('successRate')}>Succès % {getSortIcon('successRate')}</Button></TableHead>
                            <TableHead className="text-right"><Button variant="ghost" onClick={() => requestSort('averageRating')}>Note moy. {getSortIcon('averageRating')}</Button></TableHead>
                            <TableHead className="text-right"><Button variant="ghost" onClick={() => requestSort('forcedNoContactRate')}>S. contact {getSortIcon('forcedNoContactRate')}</Button></TableHead>
                            <TableHead className="text-right"><Button variant="ghost" onClick={() => requestSort('webCompletionRate')}>Val. Web {getSortIcon('webCompletionRate')}</Button></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedAndFilteredStats.map((stat) => (
                            <TableRow key={stat.name}>
                                <TableCell className="font-medium">{stat.name}</TableCell>
                                <TableCell className="text-muted-foreground">{stat.carrier}</TableCell>
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
    );
}
