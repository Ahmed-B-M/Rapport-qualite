

'use client';

import { useMemo, useState } from 'react';
import { type PerformanceChauffeur } from '@/lib/definitions';
import { getDonneesPerformanceChauffeur } from '@/lib/analysis';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import * as XLSX from 'xlsx';

interface PerformanceGlobaleProps {
  data?: any[];
  depotsUniques: string[];
  depotActif: string;
  setDepotActif: (value: string) => void;
}

export function GlobalPerformance({ data, depotsUniques, depotActif, setDepotActif }: PerformanceGlobaleProps) {
  const [filtreTransporteur, setFiltreTransporteur] = useState('all');
  const [filtreChauffeur, setFiltreChauffeur] = useState('');

  const donneesPerformance = useMemo(() => {
    if (!data) {
      return [];
    }
    return getDonneesPerformanceChauffeur(data)
  }, [data]);

  const transporteursUniques = useMemo(() => ['all', ...Array.from(new Set(donneesPerformance.map(p => p.transporteur)))], [donneesPerformance]);
  
  const donneesFiltrees = useMemo(() => {
    return donneesPerformance.filter(item => 
      (filtreTransporteur === 'all' || item.transporteur === filtreTransporteur) &&
      (item.chauffeur.toLowerCase().includes(filtreChauffeur.toLowerCase()))
    );
  }, [donneesPerformance, filtreTransporteur, filtreChauffeur]);
  
  const gererExportation = () => {
      const donneesAExporter = donneesFiltrees.map(item => {
        const livraisonPourChauffeur = data?.find(d => d.chauffeur === item.chauffeur);
        const depotAAfficher = item.depot === 'Magasin' && livraisonPourChauffeur
            ? `${item.depot} (${livraisonPourChauffeur.entrepot})`
            : item.depot;

        return {
            "Livreur": item.chauffeur,
            "Transporteur": item.transporteur,
            "Dépôt": depotAAfficher,
            "Total Livraisons": item.totalLivraisons,
            "Taux de Succès (%)": item.tauxReussite.toFixed(2),
            "Nb Livraisons Réussies": item.nombreLivraisonsReussies,
            "Note Moyenne": item.noteMoyenne ? item.noteMoyenne.toFixed(2) : 'N/A',
            "Nb Notes": item.nombreNotes,
            "Ponctualité (%)": item.tauxPonctualite.toFixed(2),
            "Nb Retards": item.nombreRetards,
            "Taux de Notation (%)": item.tauxNotation.toFixed(2),
            "Taux Forcé sur site (%)": item.tauxForceSurSite.toFixed(2),
            "Nb Forcé sur site": item.nombreForceSurSite,
            "Taux Forcé sans contact (%)": item.tauxForceSansContact.toFixed(2),
            "Nb Forcé sans contact": item.nombreForceSansContact,
            "Taux Validation Web (%)": item.tauxCompletionWeb.toFixed(2),
            "Nb Validation Web": item.nombreCompletionWeb,
        }
      });

      const feuilleCalcul = XLSX.utils.json_to_sheet(donneesAExporter);
      const classeur = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(classeur, feuilleCalcul, 'Performance Globale');
      XLSX.writeFile(classeur, 'performance_globale.xlsx');
  };

  const renderCell = (taux: number, nombre: number) => (
    <div className="text-right">
        <div>{taux.toFixed(2)}%</div>
        <div className="text-xs text-muted-foreground">({nombre})</div>
    </div>
  );

  const renderNoteCell = (note: number | undefined, nombre: number) => (
    <div className="text-right">
        <div>{note ? note.toFixed(2) : 'N/A'}</div>
        <div className="text-xs text-muted-foreground">({nombre})</div>
    </div>
  );

  const getDepotDisplay = (item: PerformanceChauffeur) => {
    if (item.depot === 'Magasin') {
      const delivery = data?.find(d => d.chauffeur === item.chauffeur);
      if (delivery) {
        return `${item.depot} (${delivery.entrepot})`;
      }
    }
    return item.depot;
  };
  
  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-4">
            <div>
                <CardTitle>Performance Détaillée par Livreur</CardTitle>
                <CardDescription>
                Analysez et croisez les données par dépôt, transporteur et livreur.
                </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={gererExportation}>
                <Download className="mr-2 h-4 w-4" /> Exporter en Excel
            </Button>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select value={filtreTransporteur} onValueChange={setFiltreTransporteur}>
                <SelectTrigger><SelectValue placeholder="Filtrer par transporteur..." /></SelectTrigger>
                <SelectContent>
                {transporteursUniques.map(c => <SelectItem key={c} value={c}>{c === 'all' ? 'Tous les transporteurs' : c}</SelectItem>)}
                </SelectContent>
            </Select>
          <Input placeholder="Rechercher un livreur..." value={filtreChauffeur} onChange={e => setFiltreChauffeur(e.target.value)} />
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[65vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Livreur</TableHead>
                <TableHead>Dépôt</TableHead>
                <TableHead>Transporteur</TableHead>
                <TableHead className="text-right">Total Liv.</TableHead>
                <TableHead className="text-right">Succès</TableHead>
                <TableHead className="text-right">Note Moy.</TableHead>
                <TableHead className="text-right">Ponctualité</TableHead>
                <TableHead className="text-right">Taux Not.</TableHead>
                <TableHead className="text-right">Forcé S.P.</TableHead>
                <TableHead className="text-right">Forcé S.C.</TableHead>
                <TableHead className="text-right">Val. Web</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {donneesFiltrees.map(item => (
                <TableRow key={item.chauffeur}>
                  <TableCell className="font-medium truncate max-w-[200px]">{item.chauffeur}</TableCell>
                  <TableCell className="truncate max-w-[200px]">{getDepotDisplay(item)}</TableCell>
                  <TableCell>{item.transporteur}</TableCell>
                  <TableCell className="text-right">{item.totalLivraisons}</TableCell>
                  <TableCell>{renderCell(item.tauxReussite, item.nombreLivraisonsReussies)}</TableCell>
                  <TableCell>{renderNoteCell(item.noteMoyenne, item.nombreNotes)}</TableCell>
                  <TableCell>{renderCell(item.tauxPonctualite, item.totalLivraisons - item.nombreRetards)}</TableCell>
                  <TableCell>{renderCell(item.tauxNotation, item.nombreNotes)}</TableCell>
                  <TableCell>{renderCell(item.tauxForceSurSite, item.nombreForceSurSite)}</TableCell>
                  <TableCell>{renderCell(item.tauxForceSansContact, item.nombreForceSansContact)}</TableCell>
                  <TableCell>{renderCell(item.tauxCompletionWeb, item.nombreCompletionWeb)}</TableCell>
                </TableRow>
              ))}
               {donneesFiltrees.length === 0 && (
                <TableRow>
                    <TableCell colSpan={11} className="h-24 text-center">
                        Aucun livreur trouvé pour cette sélection.
                    </TableCell>
                </TableRow>
               )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

    