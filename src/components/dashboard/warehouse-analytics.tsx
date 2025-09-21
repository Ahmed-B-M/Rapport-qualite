

"use client"

import { useMemo, useState } from 'react';
import { type Livraison } from '@/lib/definitions';
import { agregerStatistiquesParEntite } from '@/lib/analysis';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';

export function WarehouseAnalytics({ donnees }: { donnees: Livraison[] }) {
    const [filtre, setFiltre] = useState('');

    const statistiquesEntrepots = useMemo(() => {
        const stats = agregerStatistiquesParEntite(donnees, 'entrepot');
        return Object.entries(stats).map(([nom, stat]) => ({ nom, ...stat }))
          .sort((a,b) => b.totalLivraisons - a.totalLivraisons);
    }, [donnees]);

    const statistiquesFiltrees = useMemo(() => {
        return statistiquesEntrepots.filter(stat => stat.nom.toLowerCase().includes(filtre.toLowerCase()));
    }, [statistiquesEntrepots, filtre]);
    
    const gererExport = () => {
        const donneesAExporter = statistiquesFiltrees.map(stat => ({
            "Entrepôt": stat.nom,
            "Dépôt": donnees.find(d => d.entrepot === stat.nom)?.depot,
            "Total Livraisons": stat.totalLivraisons,
            "Note Moyenne": stat.noteMoyenne ? stat.noteMoyenne.toFixed(2) : 'N/A',
            "Ponctualité (%)": stat.tauxPonctualite.toFixed(2),
            "Taux d'échec (%)": (100 - stat.tauxReussite).toFixed(2),
            "Sur place forcé (%)": stat.tauxForceSurSite.toFixed(2),
            "Sans contact forcé (%)": stat.tauxForceSansContact.toFixed(2),
            "Validation Web (%)": stat.tauxCompletionWeb.toFixed(2),
            "Taux de notation (%)": stat.tauxNotation.toFixed(2),
        }));
        
        const feuilleCalcul = XLSX.utils.json_to_sheet(donneesAExporter);
        const classeur = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(classeur, feuilleCalcul, 'Performance Entrepôts');
        XLSX.writeFile(classeur, 'performance_entrepots.xlsx');
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
                            value={filtre}
                            onChange={(e) => setFiltre(e.target.value)}
                        />
                        <Button variant="outline" size="sm" onClick={gererExport}><Download className="mr-2 h-4 w-4" /> Exporter en Excel</Button>
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
                        {statistiquesFiltrees.length > 0 ? statistiquesFiltrees.map((stat) => (
                            <TableRow key={stat.nom}>
                                <TableCell className="font-medium">{stat.nom}</TableCell>
                                <TableCell className="text-muted-foreground">{donnees.find(d => d.entrepot === stat.nom)?.depot}</TableCell>
                                <TableCell className="text-right">{stat.totalLivraisons}</TableCell>
                                <TableCell className="text-right">{stat.noteMoyenne ? stat.noteMoyenne.toFixed(2) : 'N/A'}</TableCell>
                                <TableCell className="text-right">{stat.tauxPonctualite.toFixed(2)}%</TableCell>
                                <TableCell className="text-right">{(100 - stat.tauxReussite).toFixed(2)}%</TableCell>
                                <TableCell className="text-right">{stat.tauxForceSurSite.toFixed(2)}%</TableCell>
                                <TableCell className="text-right">{stat.tauxForceSansContact.toFixed(2)}%</TableCell>
                                <TableCell className="text-right">{stat.tauxCompletionWeb.toFixed(2)}%</TableCell>
                                <TableCell className="text-right">{stat.tauxNotation.toFixed(2)}%</TableCell>
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
