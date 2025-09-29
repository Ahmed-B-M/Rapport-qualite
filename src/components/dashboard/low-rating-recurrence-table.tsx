
'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import * as XLSX from 'xlsx';

interface PivotData {
    [driver: string]: {
      total: number;
      depot: string;
      sumOfRatings: number;
      numberOfRatings: number;
    } & {
      [transporter: string]: number | string;
    };
}

interface TransporterTotals {
    total: number;
    [key: string]: number;
}

interface LowRatingRecurrenceTableProps {
    pivotData: PivotData;
    transporters: string[];
}

export const LowRatingRecurrenceTable = ({ pivotData, transporters }: LowRatingRecurrenceTableProps) => {
    const drivers = useMemo(() => Object.keys(pivotData).sort((a, b) => pivotData[b].total - pivotData[a].total), [pivotData]);
    const totals: TransporterTotals = useMemo(() => {
        const transporterTotals: { [key: string]: number } = {};
        transporters.forEach(t => transporterTotals[t] = 0);
        let grandTotal = 0;

        drivers.forEach(driver => {
            transporters.forEach(transporter => {
                transporterTotals[transporter] += (pivotData[driver][transporter] as number) || 0;
            });
            grandTotal += pivotData[driver].total;
        });

        return { ...transporterTotals, total: grandTotal };
    }, [pivotData, transporters, drivers]);

    const handleExport = () => {
        const dataToExport: any[] = [];
        
        drivers.forEach(driver => {
            const depot = pivotData[driver].depot || 'Inconnu';
            const livreur = driver;
            const avgRating = (pivotData[driver].sumOfRatings / pivotData[driver].numberOfRatings).toFixed(2);
            const totalRatings = pivotData[driver].numberOfRatings;

            const rowData: any = {
                'Livreur': `${livreur} (note moyenne: ${avgRating} / ${totalRatings} notes)`,
                'Dépôt': depot,
            };
            
            transporters.forEach(transporter => {
                rowData[transporter] = pivotData[driver][transporter] || '';
            });

            rowData['Total'] = pivotData[driver].total;
            dataToExport.push(rowData);
        });

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Récurrence Notes <= 3');
        XLSX.writeFile(workbook, 'recurrence_notes_basses.xlsx');
    };

    if (drivers.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Récurrence des notes &lt;= 3</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Aucune livraison avec une note inférieure ou égale à 3 n'a été trouvée pour cette sélection.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="flex-row items-center justify-between">
                <div>
                    <CardTitle>Récurrence des notes &lt;= 3</CardTitle>
                    <CardDescription>Nombre de livraisons notées 3 ou moins, par livreur et transporteur.</CardDescription>
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
                                <TableHead className="sticky left-0 bg-background z-10 font-bold min-w-[200px]">Livreur/Transporteur</TableHead>
                                {transporters.map(t => <TableHead key={t} className="text-center">{t}</TableHead>)}
                                <TableHead className="text-center font-bold">Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {drivers.map(driver => {
                                const { depot, sumOfRatings, numberOfRatings } = pivotData[driver];
                                const avgRating = (sumOfRatings / numberOfRatings).toFixed(2);
                                return (
                                    <TableRow key={driver}>
                                        <TableCell className="sticky left-0 bg-background z-10 font-medium">
                                            {driver} ({depot}) - (note moyenne: {avgRating} / {numberOfRatings} notes)
                                        </TableCell>
                                        {transporters.map(transporter => (
                                            <TableCell key={transporter} className="text-center">
                                                {pivotData[driver][transporter] || ''}
                                            </TableCell>
                                        ))}
                                        <TableCell className="text-center font-bold">{pivotData[driver].total}</TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                        <TableFooter>
                            <TableRow className="bg-muted hover:bg-muted font-bold">
                                <TableCell className="sticky left-0 bg-muted z-10">Total général</TableCell>
                                {transporters.map(transporter => (
                                    <TableCell key={transporter} className="text-center">{totals[transporter]}</TableCell>
                                ))}
                                <TableCell className="text-center">{totals.total}</TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </ScrollArea>
            </CardContent>
        </Card>
    );
};
