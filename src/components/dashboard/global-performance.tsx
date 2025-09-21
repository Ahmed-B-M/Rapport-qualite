
'use client';

import { useMemo, useState } from 'react';
import { type DriverPerformance } from '@/lib/definitions';
import { getDriverPerformanceData } from '@/lib/analysis';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import * as XLSX from 'xlsx';

interface GlobalPerformanceProps {
  data: any[];
}

export function GlobalPerformance({ data }: GlobalPerformanceProps) {
  const [carrierFilter, setCarrierFilter] = useState('all');
  const [depotFilter, setDepotFilter] = useState('all');
  const [driverFilter, setDriverFilter] = useState('');

  const performanceData = useMemo(() => getDriverPerformanceData(data), [data]);

  const uniqueCarriers = useMemo(() => ['all', ...Array.from(new Set(performanceData.map(p => p.carrier)))], [performanceData]);
  const uniqueDepots = useMemo(() => ['all', ...Array.from(new Set(performanceData.map(p => p.depot)))], [performanceData]);

  const filteredData = useMemo(() => {
    return performanceData.filter(item => 
      (carrierFilter === 'all' || item.carrier === carrierFilter) &&
      (depotFilter === 'all' || item.depot === depotFilter) &&
      (item.driver.toLowerCase().includes(driverFilter.toLowerCase()))
    );
  }, [performanceData, carrierFilter, depotFilter, driverFilter]);

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 98) return 'bg-green-500 hover:bg-green-600';
    if (rate >= 95) return 'bg-yellow-500 hover:bg-yellow-600';
    return 'bg-red-500 hover:bg-red-600';
  };
  
  const handleExport = () => {
      const dataToExport = filteredData.map(item => ({
        "Livreur": item.driver,
        "Transporteur": item.carrier,
        "Dépôt": item.depot,
        "Total Livraisons": item.totalDeliveries,
        "Taux de Succès (%)": item.successRate.toFixed(2),
        "Note Moyenne": item.averageRating ? item.averageRating.toFixed(2) : 'N/A',
        "Ponctualité (%)": item.punctualityRate.toFixed(2),
        "Taux de Notation (%)": item.ratingRate.toFixed(2),
        "Sur place forcé (%)": item.forcedOnSiteRate.toFixed(2),
        "Sans contact forcé (%)": item.forcedNoContactRate.toFixed(2),
        "Validation Web (%)": item.webCompletionRate.toFixed(2),
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Performance Globale');
      XLSX.writeFile(workbook, 'performance_globale.xlsx');
  };

  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardTitle>Performance Globale par Livreur</CardTitle>
                <CardDescription>
                Analysez et croisez les données par transporteur, dépôt et livreur.
                </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" /> Exporter en Excel
            </Button>
        </div>
        <div className="mt-4 flex items-center gap-4">
          <Select value={carrierFilter} onValueChange={setCarrierFilter}>
            <SelectTrigger><SelectValue placeholder="Filtrer par transporteur..." /></SelectTrigger>
            <SelectContent>
              {uniqueCarriers.map(c => <SelectItem key={c} value={c}>{c === 'all' ? 'Tous les transporteurs' : c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={depotFilter} onValueChange={setDepotFilter}>
            <SelectTrigger><SelectValue placeholder="Filtrer par dépôt..." /></SelectTrigger>
            <SelectContent>
              {uniqueDepots.map(d => <SelectItem key={d} value={d}>{d === 'all' ? 'Tous les dépôts' : d}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="Rechercher un livreur..." value={driverFilter} onChange={e => setDriverFilter(e.target.value)} />
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Livreur</TableHead>
                <TableHead>Transporteur</TableHead>
                <TableHead>Dépôt</TableHead>
                <TableHead className="text-right">Total Liv.</TableHead>
                <TableHead className="text-right">Taux Succès</TableHead>
                <TableHead className="text-right">Note Moy.</TableHead>
                <TableHead className="text-right">Ponctualité</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map(item => (
                <TableRow key={item.driver}>
                  <TableCell className="font-medium truncate max-w-[200px]">{item.driver}</TableCell>
                  <TableCell>{item.carrier}</TableCell>
                  <TableCell>{item.depot}</TableCell>
                  <TableCell className="text-right">{item.totalDeliveries}</TableCell>
                  <TableCell className="text-right">
                    <Badge className={getSuccessRateColor(item.successRate)}>
                      {item.successRate.toFixed(1)}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{item.averageRating ? item.averageRating.toFixed(2) : 'N/A'}</TableCell>
                  <TableCell className="text-right">{item.punctualityRate.toFixed(1)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
