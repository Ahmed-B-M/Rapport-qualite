
'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { type Livraison, type CommentaireCategorise, CATEGORIES_PROBLEMES } from '@/lib/definitions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { analyzeSentiment } from '@/lib/sentiment';
import { getCategorizedNegativeComments } from '@/lib/analysis';
import { AlertCircle, ThumbsDown, MessageSquare, Download, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import * as XLSX from 'xlsx';

interface SatisfactionClientProps {
  data?: Livraison[];
}

interface PivotData {
  [driver: string]: {
    total: number;
    [transporter: string]: number;
  };
}

interface CategoryPivotData {
    [driver: string]: {
        total: number;
    } & {
        [category in typeof CATEGORIES_PROBLEMES[number]]?: number
    };
}


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
        const dataToExport: { Catégorie: string, Commentaire: string, Livreur: string }[] = [];
        
        categoriesWithComments.forEach(categorie => {
            comments[categorie].forEach(item => {
                dataToExport.push({
                    Catégorie: categorie,
                    Commentaire: item.commentaire,
                    Livreur: item.chauffeur,
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
                                        <p className="text-xs text-muted-foreground mt-2 font-medium">- {item.chauffeur}</p>
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
                transporterTotals[transporter] += pivotData[driver][transporter] || 0;
            });
            grandTotal += pivotData[driver].total;
        });

        return { ...transporterTotals, total: grandTotal };
    }, [pivotData, transporters, drivers]);

    const handleExport = () => {
        const header = ['Livreur/Transporteur', ...transporters, 'Total'];
        const dataToExport: (string|number)[][] = [header];

        drivers.forEach(driver => {
            const row: (string|number)[] = [driver];
            transporters.forEach(transporter => {
                row.push(pivotData[driver][transporter] || '');
            });
            row.push(pivotData[driver].total);
            dataToExport.push(row);
        });

        const footer: (string|number)[] = ['Total général'];
        transporters.forEach(transporter => {
            footer.push(totals[transporter]);
        });
        footer.push(totals.total);
        dataToExport.push(footer);

        const worksheet = XLSX.utils.aoa_to_sheet(dataToExport);
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
                            {drivers.map(driver => (
                                <TableRow key={driver}>
                                    <TableCell className="sticky left-0 bg-background z-10 font-medium">{driver}</TableCell>
                                    {transporters.map(transporter => (
                                        <TableCell key={transporter} className="text-center">
                                            {pivotData[driver][transporter] || ''}
                                        </TableCell>
                                    ))}
                                    <TableCell className="text-center font-bold">{pivotData[driver].total}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                        <TableRow className="bg-muted hover:bg-muted font-bold">
                            <TableCell className="sticky left-0 bg-muted z-10">Total général</TableCell>
                            {transporters.map(transporter => (
                                <TableCell key={transporter} className="text-center">{totals[transporter]}</TableCell>
                            ))}
                            <TableCell className="text-center">{totals.total}</TableCell>
                        </TableRow>
                    </Table>
                </ScrollArea>
            </CardContent>
        </Card>
    );
};

const CategorizedRecurrenceTable = ({ pivotData }: { pivotData: CategoryPivotData }) => {
    const drivers = useMemo(() => Object.keys(pivotData).sort((a, b) => pivotData[b].total - pivotData[a].total), [pivotData]);
    
    const handleExport = () => {
        const header = ['Livreur', ...CATEGORIES_PROBLEMES.map(c => c.charAt(0).toUpperCase() + c.slice(1)), 'Total'];
        const dataToExport = [header];

        drivers.forEach(driver => {
            const row: (string|number)[] = [driver];
            CATEGORIES_PROBLEMES.forEach(cat => {
                row.push(pivotData[driver][cat] || '');
            });
            row.push(pivotData[driver].total);
            dataToExport.push(row);
        });

        const worksheet = XLSX.utils.aoa_to_sheet(dataToExport);
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
                                {CATEGORIES_PROBLEMES.map(cat => <TableHead key={cat} className="text-center capitalize">{cat}</TableHead>)}
                                <TableHead className="text-center font-bold">Total</TableHead>
                            </TableRow>
                        </TableHeader>
                         <TableBody>
                            {drivers.map(driver => (
                                <TableRow key={driver}>
                                    <TableCell className="sticky left-0 bg-background z-10 font-medium">{driver}</TableCell>
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
    if (!filteredData) {
      return {
        repartitionNotes: [], repartitionSentiments: [], noteMoyenne: 0, sentimentMoyen: 0,
        categorizedComments: {}, lowRatingPivotData: {}, uniqueTransporters: [], categoryPivotData: {}
      };
    }
    
    const livraisonsNotees = filteredData.filter(d => d.noteLivraison !== undefined);
    const livraisonsCommentees = filteredData.filter(d => d.commentaireRetour && d.commentaireRetour.trim().length > 5);

    const repartitionNotes = [
      { name: '1 étoile', count: livraisonsNotees.filter(d => d.noteLivraison === 1).length },
      { name: '2 étoiles', count: livraisonsNotees.filter(d => d.noteLivraison === 2).length },
      { name: '3 étoiles', count: livraisonsNotees.filter(d => d.noteLivraison === 3).length },
      { name: '4 étoiles', count: livraisonsNotees.filter(d => d.noteLivraison === 4).length },
      { name: '5 étoiles', count: livraisonsNotees.filter(d => d.noteLivraison === 5).length },
    ];

    const sentiments = livraisonsCommentees.map(d => analyzeSentiment(d.commentaireRetour!, d.noteLivraison).score);
    const repartitionSentiments = [
        { name: 'Très négatif (0-2)', count: sentiments.filter(s => s <= 2).length },
        { name: 'Négatif (2-4)', count: sentiments.filter(s => s > 2 && s <= 4).length },
        { name: 'Neutre (4-6)', count: sentiments.filter(s => s > 4 && s <= 6).length },
        { name: 'Positif (6-8)', count: sentiments.filter(s => s > 6 && s <= 8).length },
        { name: 'Très positif (8-10)', count: sentiments.filter(s => s > 8).length },
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
    
    lowRatedDeliveries.forEach(delivery => {
        const { chauffeur, transporteur } = delivery;
        if (!pivotData[chauffeur]) {
            pivotData[chauffeur] = { total: 0 };
        }
        
        pivotData[chauffeur][transporteur] = (pivotData[chauffeur][transporter] || 0) + 1;
        pivotData[chauffeur].total = (pivotData[chauffeur].total || 0) + 1;
    });

    // --- Category Recurrence Pivot Table Data ---
    const categoryPivotData: CategoryPivotData = {};
    Object.entries(categorizedComments).forEach(([category, comments]) => {
        comments.forEach(comment => {
            const driver = comment.chauffeur;
            if (!categoryPivotData[driver]) {
                categoryPivotData[driver] = { total: 0 };
            }
            const catKey = category as typeof CATEGORIES_PROBLEMES[number];
            categoryPivotData[driver][catKey] = (categoryPivotData[driver][catKey] || 0) + 1;
            categoryPivotData[driver].total += 1;
        });
    });


    return { 
        repartitionNotes, repartitionSentiments, noteMoyenne, sentimentMoyen, 
        categorizedComments, lowRatingPivotData: pivotData, uniqueTransporters, categoryPivotData
    };
  }, [filteredData]);

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

  return (
    <div className="space-y-6">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
                <CardTitle>Satisfaction Client</CardTitle>
                <CardDescription>Répartition des notes et analyse de sentiment des commentaires.</CardDescription>
            </div>
            <DepotFilter depots={uniqueDepots} selectedDepots={selectedDepots} onSelectionChange={setSelectedDepots} />
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-center font-semibold mb-2">
                Répartition des notes ({noteMoyenne.toFixed(2)}/5 en moyenne)
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={repartitionNotes} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="count" position="top" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div>
                <h3 className="text-center font-semibold mb-2">
                    Analyse de sentiment ({sentimentMoyen.toFixed(2)}/10 en moyenne)
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={repartitionSentiments} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis allowDecimals={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                            <LabelList dataKey="count" position="top" />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <LowRatingRecurrenceTable pivotData={lowRatingPivotData} transporters={uniqueTransporters} />

        <CategorizedRecurrenceTable pivotData={categoryPivotData} />

        <NegativeCommentsSection comments={categorizedComments} />
    </div>
  );
}

  