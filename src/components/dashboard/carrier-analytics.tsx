"use client"

import { useMemo, useState, useEffect } from 'react';
import { type Delivery } from '@/lib/definitions';
import { aggregateStats } from '@/lib/data-processing';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { analyzeCarrierFailureModes } from '@/ai/flows/carrier-failure-mode-analysis';
import { Badge } from '@/components/ui/badge';
import { Bot, Loader2, Lightbulb, User, Building, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

type CarrierAIAnalysis = {
    worstFailureReason: string;
    analysisSummary: string;
    correctiveAction: string;
}

const UnknownCarrierDetailView = ({ data, onBack }: { data: Delivery[], onBack: () => void }) => {
    const unknownDrivers = useMemo(() => {
        const drivers = data.filter(d => d.carrier === 'Inconnu');
        const driverDetails: Record<string, { depots: Set<string> }> = {};

        drivers.forEach(d => {
            if (!driverDetails[d.driver]) {
                driverDetails[d.driver] = { depots: new Set() };
            }
            driverDetails[d.driver].depots.add(d.depot);
        });

        return Object.entries(driverDetails).map(([name, details]) => ({
            name,
            depots: Array.from(details.depots).join(', ')
        }));
    }, [data]);

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> Livreurs sans transporteur assigné</CardTitle>
                    <Button variant="outline" size="sm" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" /> Retour</Button>
                </div>
                <CardDescription>
                    Voici la liste des livreurs identifiés comme "Inconnu". Vérifiez leur nom pour voir s'il manque un suffixe ou si une nouvelle règle de nommage doit être ajoutée.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-96">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nom du livreur</TableHead>
                                <TableHead>Dépôt(s) d'appartenance</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {unknownDrivers.map(driver => (
                                <TableRow key={driver.name}>
                                    <TableCell className="font-medium">{driver.name}</TableCell>
                                    <TableCell>{driver.depots}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </CardContent>
        </Card>
    );
};

export function CarrierAnalytics({ data }: { data: Delivery[] }) {
    const [aiAnalysis, setAiAnalysis] = useState<Record<string, CarrierAIAnalysis>>({});
    const [loadingAi, setLoadingAi] = useState<Record<string, boolean>>({});
    const [showUnknownDetail, setShowUnknownDetail] = useState(false);

    const carrierStats = useMemo(() => {
        const stats = aggregateStats(data, 'carrier');
        return Object.entries(stats).map(([name, stat]) => ({ name, ...stat }))
            .sort((a,b) => b.totalDeliveries - a.totalDeliveries);
    }, [data]);

    useEffect(() => {
        const carriersToAnalyze = carrierStats.filter(c => c.name !== 'Inconnu');

        if (carriersToAnalyze.length > 0) {
            const generateAnalysis = async () => {
                const initialLoadingState = carriersToAnalyze.reduce((acc, curr) => ({...acc, [curr.name]: true}), {});
                setLoadingAi(initialLoadingState);

                const analyses = await Promise.all(carriersToAnalyze.map(async (carrier) => {
                    const failureReasons = data
                        .filter(d => d.carrier === carrier.name && d.status === 'Non livré' && d.failureReason)
                        .map(d => d.failureReason!);
                    
                    if (failureReasons.length === 0) {
                        return { [carrier.name]: { worstFailureReason: "Aucun échec enregistré.", analysisSummary: "Ce transporteur a un historique de livraison parfait dans cet ensemble de données.", correctiveAction: "Aucune action nécessaire." } };
                    }

                    try {
                        const result = await analyzeCarrierFailureModes({ carrierName: carrier.name, deliveryFailureReasons: failureReasons });
                        return { [carrier.name]: result };
                    } catch (error) {
                        console.error(`L'analyse IA a échoué pour ${carrier.name}:`, error);
                        return { [carrier.name]: { worstFailureReason: "Erreur", analysisSummary: "Impossible de générer l'analyse IA.", correctiveAction: "Impossible de générer une suggestion." } };
                    }
                }));
                
                const finalAnalyses = analyses.reduce((acc, curr) => ({ ...acc, ...curr }), {});
                setAiAnalysis(finalAnalyses);
                
                const finalLoadingState = carriersToAnalyze.reduce((acc, curr) => ({...acc, [curr.name]: false}), {});
                setLoadingAi(finalLoadingState);
            };
            generateAnalysis();
        }
    }, [carrierStats, data]);

    const handleCarrierClick = (carrierName: string) => {
        if (carrierName === 'Inconnu') {
            setShowUnknownDetail(true);
        }
    };

    if (showUnknownDetail) {
        return <UnknownCarrierDetailView data={data} onBack={() => setShowUnknownDetail(false)} />;
    }

    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold font-headline">Performance par transporteur</h2>
            <Accordion type="single" collapsible className="w-full">
                {carrierStats.map((carrier) => (
                    <AccordionItem value={carrier.name} key={carrier.name}>
                        <AccordionTrigger
                            onClick={() => handleCarrierClick(carrier.name)}
                            className={carrier.name === 'Inconnu' ? 'cursor-pointer' : ''}
                            // This is a special case. We want the click to work but not open the accordion
                            // The disabled prop on AccordionTrigger prevents the click handler from firing at all.
                            // The disabled prop on the AccordionItem itself would disable the whole thing.
                            // So we pass an empty onClick to override the accordion's internal one if it's 'Inconnu'
                            {...(carrier.name === 'Inconnu' ? { onClick: (e) => { e.preventDefault(); handleCarrierClick(carrier.name); } } : {})}
                        >
                            <div className="flex items-center justify-between w-full pr-4">
                                <span className="text-lg font-medium">{carrier.name}</span>
                                <div className="flex items-center gap-4 text-sm">
                                    <span>{carrier.totalDeliveries} livraisons</span>
                                    <Badge variant={(100 - carrier.successRate) > 1 ? "destructive" : "default"}>{(100 - carrier.successRate).toFixed(2)}% échecs</Badge>
                                </div>
                            </div>
                        </AccordionTrigger>
                        {carrier.name !== 'Inconnu' && (
                            <AccordionContent>
                                <Card className="m-2">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2"><Bot /> Analyse IA des modes de défaillance</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {loadingAi[carrier.name] ? (
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Loader2 className="animate-spin h-4 w-4" />
                                                <span>Analyse des modes de défaillance...</span>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <div>
                                                    <h4 className="font-semibold">Pire motif de défaillance :</h4>
                                                    <Badge variant="destructive">{aiAnalysis[carrier.name]?.worstFailureReason}</Badge>
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold">Résumé :</h4>
                                                    <p className="text-sm text-muted-foreground">{aiAnalysis[carrier.name]?.analysisSummary}</p>
                                                </div>
                                                <div className="p-3 rounded-md bg-accent/20 border border-accent/50">
                                                    <h4 className="font-semibold flex items-center gap-2"><Lightbulb className="text-accent" /> Action Suggérée :</h4>
                                                    <p className="text-sm text-muted-foreground pl-6">{aiAnalysis[carrier.name]?.correctiveAction}</p>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </AccordionContent>
                        )}
                    </AccordionItem>
                ))}
            </Accordion>
        </div>
    );
}
