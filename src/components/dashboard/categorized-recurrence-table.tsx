
'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import * as XLSX from 'xlsx';
import { CATEGORIES_PROBLEMES } from '@/lib/definitions';

interface CategoryPivotData {
    [driver: string]: {
        total: number;
        depot: string;
    } & {
        [category in typeof CATEGORIES_PROBLEMES[number]]?: number
    };
}

interface CategorizedRecurrenceTableProps {
    pivotData: CategoryPivotData;
}

export const CategorizedRecurrenceTable = ({ pivotData }: CategorizedRecurrenceTableProps) => {
    const drivers = useMemo(() => Object.keys(pivotData).sort((a, b) => pivotData[b].total - pivotData[a].total), [pivotData]);
    
    const handleExport = () => {
        const dataToExport: any[] = [];

        drivers.forEach(driver => {
            const rowData: any = {
                'Livreur': driver,
                'Dépôt': pivotData[driver].depot
            };

            CATEGORIES_PROBLEMES.forEach(cat => {
                rowData[cat.charAt(0).toUpperCase() + cat.slice(1)] = pivotData[driver][cat] || '';
            });
            rowData['Total'] = pivotData[driver].total;
            dataToExport.push(rowData);
        });

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Récurrence par Catégorie');
        XLSX.writeFile(workbook, 'recurrence_categories_negatives.xlsx');
    };

    if (drivers.length === 0) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle>Récurrence des Commentaires Négatifs par Catégorie</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Aucun commentaire négatif à analyser pour cette sélection.</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
             <CardHeader className="flex-row items-center justify-between">
                <div>
                    <CardTitle>Récurrence des Commentaires Négatifs par Catégorie</CardTitle>
                    <CardDescription>Nombre de commentaires négatifs par livreur et par catégorie de problème.</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={handleExport}>
                    <Download className="mr-2 h-4 w-4" /> Exporter
                </Button>
            </CardHeader>
            <CardContent>
                 <ScrollArea className="h-[70vh] w-full">
                    <Table className="whitespace-nowrap">
                        <TableHeader>
                            <TableRow>
                                <TableHead className="sticky left-0 bg-background z-10 font-bold min-w-[200px]">Livreur</TableHead>
                                <TableHead>Dépôt</TableHead>
                                {CATEGORIES_PROBLEMES.map(cat => <TableHead key={cat} className="text-center capitalize">{cat}</TableHead>)}
                                <TableHead className="text-center font-bold">Total</TableHead>
                            </TableRow>
                        </TableHeader>
                         <TableBody>
                            {drivers.map(driver => (
                                <TableRow key={driver}>
                                    <TableCell className="sticky left-0 bg-background z-10 font-medium">{driver}</TableCell>
                                    <TableCell>{pivotData[driver].depot}</TableCell>
                                    {CATEGORIES_PROBLEMES.map(cat => (
                                        <TableCell key={cat} className="text-center">
                                            {pivotData[driver][cat] || ''}
                                        </TableCell>
                                    ))}
                                    <TableCell className="text-center font-bold">{pivotData[driver].total}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </CardContent>
        </Card>
    );
};
