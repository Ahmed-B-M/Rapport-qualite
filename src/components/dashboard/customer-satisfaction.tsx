
'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { type Livraison, type CommentaireCategorise, CATEGORIES_PROBLEMES } from '@/lib/definitions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { analyzeSentiment } from '@/lib/sentiment';
import { getCategorizedNegativeComments } from '@/lib/analysis';
import { AlertCircle, ThumbsDown, MessageSquare, Download, Filter, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import * as XLSX from 'xlsx';
import { EmailPreviewDialog } from './email-preview-dialog';
import { ChartContainer } from '@/components/ui/chart';

interface SatisfactionClientProps {
  data?: Livraison[];
}

interface PivotData {
  [driver: string]: {
    total: number;
    depot: string;
    sumOfRatings: number;
    numberOfRatings: number;
    [transporter: string]: number | string;
  };
}

interface CategoryPivotData {
    [driver: string]: {
        total: number;
        depot: string;
    } & {
        [category in typeof CATEGORIES_PROBLEMES[number]]?: number
    };
}

const chartConfig = {
    nombre: {
      label: "Nombre",
      color: "hsl(var(--primary))",
    },
};


const DepotFilter = ({ depots, selectedDepots, onSelectionChange }: { depots: string[], selectedDepots: string[], onSelectionChange: (selected: string[]) => void }) => {
    const handleCheckedChange = (depot: string, checked: boolean) => {
        let newSelection: string[];
        if (checked) {
            newSelection = [...selectedDepots, depot];
        } else {
            newSelection = selectedDepots.filter(d => d !== depot);
        }
        onSelectionChange(newSelection);
    };

    const handleSelectAll = () => onSelectionChange(depots);
    const handleDeselectAll = () => onSelectionChange([]);

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline">
                    <Filter className="mr-2 h-4 w-4" />
                    Filtrer par dépôt ({selectedDepots.length === depots.length ? 'Tous' : selectedDepots.length})
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2">
                <div className="flex justify-between items-center mb-2 px-2">
                     <h4 className="font-medium text-sm">Dépôts</h4>
                     <div>
                        <Button variant="link" size="sm" onClick={handleSelectAll} className="p-1 h-auto">Tous</Button>
                        <Button variant="link" size="sm" onClick={handleDeselectAll} className="p-1 h-auto">Aucun</Button>
                     </div>
                </div>
                <ScrollArea className="h-64">
                    <div className="space-y-1 p-2">
                        {depots.map(depot => (
                            <div key={depot} className="flex items-center space-x-2">
                                <Checkbox
                                    id={`depot-filter-${depot}`}
                                    checked={selectedDepots.includes(depot)}
                                    onCheckedChange={(checked) => handleCheckedChange(depot, !!checked)}
                                />
                                <label htmlFor={`depot-filter-${depot}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    {depot}
                                </label>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
};

const NegativeCommentsSection = ({ comments }: { comments: Record<string, CommentaireCategorise[]> }) => {
    const categoriesWithComments = CATEGORIES_PROBLEMES.filter(cat => comments[cat] && comments[cat].length > 0);

    const handleExport = () => {
        const dataToExport: { Catégorie: string, Commentaire: string, Livreur: string, Dépôt: string }[] = [];
        
        categoriesWithComments.forEach(categorie => {
            comments[categorie].forEach(item => {
                const depot = item.depot || 'Inconnu';
                const livreur = item.chauffeur.replace(/\s*\([^)]*\)$/, '').trim();

                dataToExport.push({
                    Catégorie: categorie,
                    Commentaire: item.commentaire,
                    Livreur: livreur,
                    Dépôt: depot,
                });
            });
        });

        if (dataToExport.length > 0) {
            const worksheet = XLSX.utils.json_to_sheet(dataToExport);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Commentaires Négatifs');
            XLSX.writeFile(workbook, 'commentaires_negatifs.xlsx');
        }
    };


    if (categoriesWithComments.length === 0) {
        return (
            <div className="text-center text-muted-foreground py-8">
                <MessageSquare className="mx-auto h-12 w-12" />
                <p className="mt-4">Aucun commentaire négatif à analyser pour cette sélection.</p>
            </div>
        );
    }
    
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="flex items-center"><ThumbsDown className="mr-2"/> Analyse des Commentaires Négatifs</CardTitle>
                    <CardDescription>Retours clients négatifs classés par type de problème.</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={handleExport}>
                    <Download className="mr-2 h-4 w-4" /> Exporter en Excel
                </Button>
            </CardHeader>
            <CardContent>
                <Accordion type="single" collapsible className="w-full" defaultValue={categoriesWithComments.length > 0 ? categoriesWithComments[0] : undefined}>
                    {categoriesWithComments.map(categorie => (
                        <AccordionItem value={categorie} key={categorie}>
                            <AccordionTrigger>
                                <div className="flex items-center justify-between w-full pr-4">
                                    <span className="capitalize font-semibold">{categorie}</span>
                                    <span className="text-sm font-bold text-destructive bg-destructive/10 rounded-full px-2 py-0.5">{comments[categorie].length}</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="space-y-4 pt-2">
                                {comments[categorie].map((item, index) => (
                                    <div key={index} className="border-l-4 border-destructive pl-4 py-2 bg-destructive/5 rounded-r-md">
                                        <p className="italic text-sm">"{item.commentaire}"</p>
                                        <p className="text-xs text-muted-foreground mt-2 font-medium">- {item.chauffeur} ({item.depot})</p>
                                    </div>
                                ))}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </CardContent>
        </Card>
    );
};

const LowRatingRecurrenceTable = ({ pivotData, transporters }: { pivotData: PivotData, transporters: string[] }) => {
    const drivers = useMemo(() => Object.keys(pivotData).sort((a, b) => pivotData[b].total - pivotData[a].total), [pivotData]);
    const totals = useMemo(() => {
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

const CategorizedRecurrenceTable = ({ pivotData }: { pivotData: CategoryPivotData }) => {
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


export function CustomerSatisfaction({ data }: SatisfactionClientProps) {
  const [selectedDepots, setSelectedDepots] = useState<string[]>([]);
  const [isEmailPreviewOpen, setIsEmailPreviewOpen] = useState(false);
  const [emailBody, setEmailBody] = useState("");

  const uniqueDepots = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.map(d => d.depot))].sort();
  }, [data]);
  
  useEffect(() => {
    setSelectedDepots(uniqueDepots);
  }, [uniqueDepots]);
  
  const filteredData = useMemo(() => {
    if (!data) return [];
    if (selectedDepots.length === uniqueDepots.length) return data; // if all are selected, no need to filter
    return data.filter(d => selectedDepots.includes(d.depot));
  }, [data, selectedDepots, uniqueDepots]);

  const { 
    repartitionNotes, repartitionSentiments, noteMoyenne, sentimentMoyen, 
    categorizedComments, lowRatingPivotData, uniqueTransporters, categoryPivotData
  } = useMemo(() => {
    if (!filteredData || filteredData.length === 0) {
      return {
        repartitionNotes: [], repartitionSentiments: [], noteMoyenne: 0, sentimentMoyen: 0,
        categorizedComments: {}, lowRatingPivotData: {}, uniqueTransporters: [], categoryPivotData: {}
      };
    }
    
    const livraisonsNotees = filteredData.filter(d => d.noteLivraison !== undefined);
    const livraisonsCommentees = filteredData.filter(d => d.commentaireRetour && d.commentaireRetour.trim().length > 5);

    const repartitionNotes = [
      { name: '1 étoile', nombre: livraisonsNotees.filter(d => d.noteLivraison === 1).length },
      { name: '2 étoiles', nombre: livraisonsNotees.filter(d => d.noteLivraison === 2).length },
      { name: '3 étoiles', nombre: livraisonsNotees.filter(d => d.noteLivraison === 3).length },
      { name: '4 étoiles', nombre: livraisonsNotees.filter(d => d.noteLivraison === 4).length },
      { name: '5 étoiles', nombre: livraisonsNotees.filter(d => d.noteLivraison === 5).length },
    ];

    const sentiments = livraisonsCommentees.map(d => analyzeSentiment(d.commentaireRetour!, d.noteLivraison).score);
    const repartitionSentiments = [
        { name: 'Très négatif (0-2)', nombre: sentiments.filter(s => s <= 2).length },
        { name: 'Négatif (2-4)', nombre: sentiments.filter(s => s > 2 && s <= 4).length },
        { name: 'Neutre (4-6)', nombre: sentiments.filter(s => s > 4 && s <= 6).length },
        { name: 'Positif (6-8)', nombre: sentiments.filter(s => s > 6 && s <= 8).length },
        { name: 'Très positif (8-10)', nombre: sentiments.filter(s => s > 8).length },
    ];
    
    const noteMoyenne = livraisonsNotees.length > 0
      ? livraisonsNotees.reduce((acc, d) => acc + (d.noteLivraison || 0), 0) / livraisonsNotees.length
      : 0;

    const sentimentMoyen = sentiments.length > 0
        ? sentiments.reduce((acc, s) => acc + s, 0) / sentiments.length
        : 0;
        
    const categorizedComments = getCategorizedNegativeComments(filteredData);
    
    // --- Low Rating Pivot Table Data ---
    const lowRatedDeliveries = filteredData.filter(d => d.noteLivraison !== undefined && d.noteLivraison <= 3);
    const uniqueTransporters = [...new Set(lowRatedDeliveries.map(d => d.transporteur))].sort();
    const pivotData: PivotData = {};
    
    filteredData.forEach(delivery => {
        const { chauffeur, transporteur, depot, noteLivraison } = delivery;
        if (noteLivraison === undefined) return;

        const driverName = chauffeur.replace(/\s*\([^)]*\)$/, '').trim();
        if (!pivotData[driverName]) {
            pivotData[driverName] = { 
                total: 0, 
                depot: depot,
                sumOfRatings: 0,
                numberOfRatings: 0
            };
        }
        
        if(noteLivraison <= 3) {
            pivotData[driverName][transporteur] = (pivotData[driverName][transporteur] || 0) + 1;
            pivotData[driverName].total = (pivotData[driverName].total || 0) + 1;
        }

        pivotData[driverName].sumOfRatings += noteLivraison;
        pivotData[driverName].numberOfRatings += 1;
    });

    // --- Category Recurrence Pivot Table Data ---
    const categoryPivotData: CategoryPivotData = {};
    Object.entries(categorizedComments).forEach(([category, comments]) => {
        comments.forEach(comment => {
            const driverFullName = comment.chauffeur;
            const depot = comment.depot;
            const driverName = driverFullName.replace(/\s*\([^)]*\)$/, '').trim();
            
            if (!categoryPivotData[driverName]) {
                categoryPivotData[driverName] = { total: 0, depot: depot };
            }
            const catKey = category as typeof CATEGORIES_PROBLEMES[number];
            categoryPivotData[driverName][catKey] = (categoryPivotData[driverName][catKey] || 0) + 1;
            categoryPivotData[driverName].total += 1;
        });
    });


    return { 
        repartitionNotes, repartitionSentiments, noteMoyenne, sentimentMoyen, 
        categorizedComments, lowRatingPivotData: pivotData, uniqueTransporters, categoryPivotData
    };
  }, [filteredData]);

  const handleGenerateEmail = () => {
    const depots = [...new Set(Object.values(lowRatingPivotData).map(d => d.depot))];
    const magasinDepots = depots.filter(d => d.toLowerCase().includes('magasin'));
    const otherDepots = depots.filter(d => !d.toLowerCase().includes('magasin'));
    const sortedDepots = [...otherDepots.sort(), ...magasinDepots.sort()];

    let body = `
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"; color: #333; line-height: 1.5; }
            .container { max-width: 800px; margin: 20px auto; padding: 20px; border: 1px solid #eee; border-radius: 8px; background-color: #f9f9f9; }
            h1 { color: #2c3e50; font-size: 24px; text-align: center; border-bottom: 2px solid #3498db; padding-bottom: 10px; margin-bottom: 20px; }
            h2 { color: #3498db; font-size: 20px; margin-top: 30px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
            h3 { color: #2980b9; font-size: 16px; margin-top: 20px; }
            p { margin-bottom: 15px; }
            table { border-collapse: collapse; width: 100%; margin-bottom: 20px; font-size: 14px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background-color: #ecf0f1; font-weight: bold; }
            tr:nth-child(even) { background-color: #fdfdfd; }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #777; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Synthèse de la Satisfaction Client</h1>
            <p>Bonjour,</p>
            <p>Je vous envoie ci-dessous un résumé de la satisfaction client pour la période sélectionnée.</p>
    `;

    sortedDepots.forEach(depot => {
        body += `<h2>${depot}</h2>`;

        const depotLowRatingDrivers = Object.entries(lowRatingPivotData).filter(([_, data]) => data.depot === depot && data.total > 0);
        if (depotLowRatingDrivers.length > 0) {
            body += `<h3>Récurrence des notes inférieures ou égales à 3</h3>`;
            body += '<table><thead><tr><th>Livreur/Transporteur</th>';
            uniqueTransporters.forEach(t => body += `<th>${t}</th>`);
            body += '<th>Total</th></tr></thead><tbody>';
            
            depotLowRatingDrivers.sort(([, a], [, b]) => b.total - a.total).forEach(([driver, data]) => {
                const avgRating = (data.sumOfRatings / data.numberOfRatings).toFixed(2);
                const totalRatings = data.numberOfRatings;
                body += `<tr><td>${driver} (note moyenne: ${avgRating} / ${totalRatings} notes)</td>`;
                uniqueTransporters.forEach(t => body += `<td style="text-align: center;">${data[t] || ''}</td>`);
                body += `<td style="text-align: center; font-weight: bold;">${data.total}</td></tr>`;
            });

            body += '</tbody></table>';
        } else {
            body += `<p>Aucune récurrence de note basse pour ce dépôt.</p>`
        }

        const depotCategoryDrivers = Object.entries(categoryPivotData).filter(([_, data]) => data.depot === depot);
        if(depotCategoryDrivers.length > 0) {
            body += `<h3>Récurrence par catégorie de problème</h3>`;
            body += '<table><thead><tr><th>Livreur</th>';
            CATEGORIES_PROBLEMES.forEach(cat => body += `<th>${cat.charAt(0).toUpperCase() + cat.slice(1)}</th>`);
            body += '<th>Total</th></tr></thead><tbody>';

            depotCategoryDrivers.sort(([, a], [, b]) => b.total - a.total).forEach(([driver, data]) => {
                body += `<tr><td>${driver}</td>`;
                CATEGORIES_PROBLEMES.forEach(cat => body += `<td style="text-align: center;">${data[cat] || ''}</td>`);
                body += `<td style="text-align: center; font-weight: bold;">${data.total}</td></tr>`;
            });

            body += '</tbody></table>';
        } else {
            body += `<p>Aucune récurrence par catégorie pour ce dépôt.</p>`
        }
    });

    body += `
          <div class="footer">
            <p>Ce rapport a été généré automatiquement.</p>
          </div>
        </div>
      </body>
    </html>`;

    setEmailBody(body);
    setIsEmailPreviewOpen(true);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-2 bg-background border rounded-md shadow-md">
          <p className="font-bold">{label}</p>
          <p className="text-sm">{`Nombre: ${payload[0].value}`}</p>
        </div>
      );
    }
    return null;
  };

  if (!data || data.length === 0) {
      return (
          <div className="text-center p-8">
              <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">Aucune donnée de satisfaction</h3>
              <p className="mt-1 text-sm text-muted-foreground">Chargez un fichier pour commencer l'analyse.</p>
          </div>
      )
  }

  return (
    <div className="space-y-6">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
                <CardTitle>Satisfaction Client</CardTitle>
                <CardDescription>Répartition des notes et analyse de sentiment des commentaires.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
                <DepotFilter depots={uniqueDepots} selectedDepots={selectedDepots} onSelectionChange={setSelectedDepots} />
                <Button variant="outline" onClick={handleGenerateEmail}>
                    <Mail className="mr-2 h-4 w-4" />
                    Générer E-mail de Synthèse
                </Button>
            </div>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-center font-semibold mb-2">
                Répartition des notes ({noteMoyenne.toFixed(2)}/5 en moyenne)
              </h3>
              <ChartContainer config={chartConfig} className="min-h-[200px] w-full" id="notes-chart">
                <BarChart accessibilityLayer data={repartitionNotes} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="nombre" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="nombre" position="top" />
                  </Bar>
                </BarChart>
              </ChartContainer>
            </div>
            <div>
                <h3 className="text-center font-semibold mb-2">
                    Analyse de sentiment ({sentimentMoyen.toFixed(2)}/10 en moyenne)
                </h3>
                <ChartContainer config={chartConfig} className="min-h-[200px] w-full" id="sentiment-chart">
                    <BarChart accessibilityLayer data={repartitionSentiments} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis allowDecimals={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="nombre" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                            <LabelList dataKey="nombre" position="top" />
                        </Bar>
                    </BarChart>
                </ChartContainer>
            </div>
          </CardContent>
        </Card>
        
        <LowRatingRecurrenceTable pivotData={lowRatingPivotData} transporters={uniqueTransporters} />

        <CategorizedRecurrenceTable pivotData={categoryPivotData} />

        <NegativeCommentsSection comments={categorizedComments} />
        
        <EmailPreviewDialog 
            isOpen={isEmailPreviewOpen} 
            onOpenChange={setIsEmailPreviewOpen} 
            emailBody={emailBody} 
        />
    </div>
  );
}
