"use client"

import { useMemo, useState } from 'react';
import { type Delivery } from '@/lib/definitions';
import { aggregateStats } from '@/lib/data-processing';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';

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
    
    const handleExport = () => {
        const dataToExport = filteredStats.map(stat => ({
            "Entrepôt": stat.name,
            "Dépôt": data.find(d => d.warehouse === stat.name)?.depot,
            "Total Livraisons": stat.totalDeliveries,
            "Note Moyenne": stat.averageRating > 0 ? stat.averageRating.toFixed(2) : 'N/A',
            "Ponctualité (%)": stat.punctualityRate.toFixed(2),
            "Taux d'échec (%)": (100 - stat.successRate).toFixed(2),
            "Sur place forcé (%)": stat.forcedOnSiteRate.toFixed(2),
            "Sans contact forcé (%)": stat.forcedNoContactRate.toFixed(2),
            "Validation Web (%)": stat.webCompletionRate.toFixed(2),
            "Taux de notation (%)": stat.ratingRate.toFixed(2),
        }));
        
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Performance Entrepôts');
        XLSX.writeFile(workbook, 'performance_entrepots.xlsx');
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>Performance des entrepôts</CardTitle>
                    <div className="flex items-center gap-2">
                        <Input 
                            placeholder="Filtrer les entrepôts..." 
                            className="max-w-sm"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        />
                        <Button variant="outline" size="sm" onClick={handleExport}><Download className="mr-2 h-4 w-4" /> Exporter en Excel</Button>
                    </div>
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

    