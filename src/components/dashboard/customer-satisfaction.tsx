
'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { type Livraison, type CommentaireCategorise, CATEGORIES_PROBLEMES } from '@/lib/definitions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, LabelList } from 'recharts';
import { analyzeSentiment } from '@/lib/sentiment';
import { getCategorizedNegativeComments } from '@/lib/analysis';
import { MessageSquare, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmailPreviewDialog } from './email-preview-dialog';
import { ChartContainer } from '@/components/ui/chart';
import { DepotFilter } from './depot-filter';
import { NegativeCommentsSection } from './negative-comments-section';
import { LowRatingRecurrenceTable } from './low-rating-recurrence-table';
import { CategorizedRecurrenceTable } from './categorized-recurrence-table';
import { generateSatisfactionEmailBody } from '@/lib/email-templates';

// (Interfaces PivotData et CategoryPivotData restent ici car elles sont spécifiques à la logique de ce composant)
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

interface CategoryPivotData {
    [driver: string]: {
        total: number;
        depot: string;
    } & {
        [category in typeof CATEGORIES_PROBLEMES[number]]?: number
    };
}
interface SatisfactionClientProps {
  data?: Livraison[];
}

const chartConfig = {
    nombre: {
      label: "Nombre",
    },
};

export function CustomerSatisfaction({ data }: SatisfactionClientProps) {
  const [selectedDepots, setSelectedDepots] = useState<string[]>([]);
  const [isEmailPreviewOpen, setIsEmailPreviewOpen] = useState(false);
  const [emailBody, setEmailBody] = useState("");
  const [categorizedComments, setCategorizedComments] = useState<CommentaireCategorise[]>([]);

  const uniqueDepots = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.map(d => d.depot))].sort();
  }, [data]);
  
  useEffect(() => {
    setSelectedDepots(uniqueDepots);
  }, [uniqueDepots]);
  
  const filteredData = useMemo(() => {
    if (!data) return [];
    if (selectedDepots.length === uniqueDepots.length) return data;
    return data.filter(d => selectedDepots.includes(d.depot));
  }, [data, selectedDepots, uniqueDepots]);

  useEffect(() => {
      if (filteredData) {
          setCategorizedComments(getCategorizedNegativeComments(filteredData));
      }
  }, [filteredData]);

  const { 
    repartitionNotes, repartitionSentiments, noteMoyenne, sentimentMoyen, 
    lowRatingPivotData, uniqueTransporters, categoryPivotData
  } = useMemo(() => {
    if (!filteredData || filteredData.length === 0) {
      return {
        repartitionNotes: [], repartitionSentiments: [], noteMoyenne: 0, sentimentMoyen: 0,
        lowRatingPivotData: {}, uniqueTransporters: [], categoryPivotData: {}
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
            pivotData[driverName][transporteur] = ((pivotData[driverName][transporteur] as number) || 0) + 1;
            pivotData[driverName].total = (pivotData[driverName].total || 0) + 1;
        }

        pivotData[driverName].sumOfRatings += noteLivraison;
        pivotData[driverName].numberOfRatings += 1;
    });

    const categoryPivotData: CategoryPivotData = {};
    categorizedComments.forEach(comment => {
        const driverFullName = comment.chauffeur;
        const depot = comment.depot;
        const driverName = driverFullName.replace(/\s*\([^)]*\)$/, '').trim();
        
        if (!categoryPivotData[driverName]) {
            categoryPivotData[driverName] = { total: 0, depot: depot };
        }
        const catKey = comment.categorie;
        categoryPivotData[driverName][catKey] = (categoryPivotData[driverName][catKey] || 0) + 1;
        categoryPivotData[driverName].total += 1;
    });


    return { 
        repartitionNotes, repartitionSentiments, noteMoyenne, sentimentMoyen, 
        lowRatingPivotData: pivotData, uniqueTransporters, categoryPivotData
    };
  }, [filteredData, categorizedComments]);

  const handleGenerateEmail = () => {
    const body = generateSatisfactionEmailBody(lowRatingPivotData, categoryPivotData, uniqueTransporters);
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

        <NegativeCommentsSection comments={categorizedComments} setComments={setCategorizedComments} />
        
        <EmailPreviewDialog 
            isOpen={isEmailPreviewOpen} 
            onOpenChange={setIsEmailPreviewOpen} 
            emailBody={emailBody} 
        />
    </div>
  );
}
