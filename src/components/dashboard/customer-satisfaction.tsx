
'use client';

import { useMemo } from 'react';
import { type Livraison, type CommentaireCategorise, CATEGORIES_PROBLEMES } from '@/lib/definitions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { analyzeSentiment } from '@/lib/sentiment';
import { getCategorizedNegativeComments } from '@/lib/analysis';
import { AlertCircle, ThumbsDown, MessageSquare, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
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
                <p className="mt-4">Aucun commentaire négatif à analyser.</p>
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
    const drivers = useMemo(() => Object.keys(pivotData).sort((a, b) => a.localeCompare(b)), [pivotData]);
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
        const dataToExport = [header];

        drivers.forEach(driver => {
            const row = [driver];
            transporters.forEach(transporter => {
                row.push(pivotData[driver][transporter] || '');
            });
            row.push(pivotData[driver].total);
            dataToExport.push(row);
        });

        const footer = ['Total général'];
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
                    <p className="text-muted-foreground">Aucune livraison avec une note inférieure ou égale à 3 n'a été trouvée.</p>
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


export function CustomerSatisfaction({ data }: SatisfactionClientProps) {
  const { 
    repartitionNotes, repartitionSentiments, noteMoyenne, sentimentMoyen, 
    categorizedComments, lowRatingPivotData, uniqueTransporters 
  } = useMemo(() => {
    if (!data) {
      return {
        repartitionNotes: [], repartitionSentiments: [], noteMoyenne: 0, sentimentMoyen: 0,
        categorizedComments: {}, lowRatingPivotData: {}, uniqueTransporters: []
      };
    }
    
    const livraisonsNotees = data.filter(d => d.noteLivraison !== undefined);
    const livraisonsCommentees = data.filter(d => d.commentaireRetour && d.commentaireRetour.trim().length > 5);

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
        
    const categorizedComments = getCategorizedNegativeComments(data);
    
    // --- Low Rating Pivot Table Data ---
    const lowRatedDeliveries = data.filter(d => d.noteLivraison !== undefined && d.noteLivraison <= 3);
    const uniqueTransporters = [...new Set(lowRatedDeliveries.map(d => d.transporteur))].sort();
    const pivotData: PivotData = {};
    
    lowRatedDeliveries.forEach(delivery => {
        const { chauffeur, transporteur } = delivery;
        if (!pivotData[chauffeur]) {
            pivotData[chauffeur] = { total: 0 };
        }
        
        pivotData[chauffeur][transporteur] = (pivotData[chauffeur][transporteur] || 0) + 1;
        pivotData[chauffeur].total = (pivotData[chauffeur].total || 0) + 1;
    });

    return { 
        repartitionNotes, repartitionSentiments, noteMoyenne, sentimentMoyen, 
        categorizedComments, lowRatingPivotData: pivotData, uniqueTransporters 
    };
  }, [data]);

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
          <CardHeader>
            <CardTitle>Satisfaction Client</CardTitle>
            <CardDescription>Répartition des notes et analyse de sentiment des commentaires.</CardDescription>
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

        <NegativeCommentsSection comments={categorizedComments} />
    </div>
  );
}
