"use client"

import { useMemo, useState, useEffect } from 'react';
import { type Delivery } from '@/lib/definitions';
import { aggregateStats } from '@/lib/data-processing';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { analyzeCarrierFailureModes } from '@/ai/flows/carrier-failure-mode-analysis';
import { Badge } from '@/components/ui/badge';
import { Bot, Loader2 } from 'lucide-react';

type CarrierAIAnalysis = {
    worstFailureReason: string;
    analysisSummary: string;
}

export function CarrierAnalytics({ data }: { data: Delivery[] }) {
    const [aiAnalysis, setAiAnalysis] = useState<Record<string, CarrierAIAnalysis>>({});
    const [loadingAi, setLoadingAi] = useState<Record<string, boolean>>({});

    const carrierStats = useMemo(() => {
        const stats = aggregateStats(data, 'carrier');
        return Object.entries(stats).map(([name, stat]) => ({ name, ...stat }))
            .sort((a,b) => b.totalDeliveries - a.totalDeliveries);
    }, [data]);

    useEffect(() => {
        const generateAnalysis = async () => {
            const initialLoadingState = carrierStats.reduce((acc, curr) => ({...acc, [curr.name]: true}), {});
            setLoadingAi(initialLoadingState);

            const analyses = await Promise.all(carrierStats.map(async (carrier) => {
                const failureReasons = data
                    .filter(d => d.carrier === carrier.name && d.status === 'Non livré' && d.failureReason)
                    .map(d => d.failureReason!);
                
                if (failureReasons.length === 0) {
                    return { [carrier.name]: { worstFailureReason: "No failures recorded.", analysisSummary: "This carrier has a perfect delivery record in this dataset." } };
                }

                try {
                    const result = await analyzeCarrierFailureModes({ carrierName: carrier.name, deliveryFailureReasons: failureReasons });
                    return { [carrier.name]: result };
                } catch (error) {
                    console.error(`AI analysis failed for ${carrier.name}:`, error);
                    return { [carrier.name]: { worstFailureReason: "Error", analysisSummary: "Could not generate AI analysis." } };
                }
            }));
            
            const finalAnalyses = analyses.reduce((acc, curr) => ({ ...acc, ...curr }), {});
            setAiAnalysis(finalAnalyses);
            
            const finalLoadingState = carrierStats.reduce((acc, curr) => ({...acc, [curr.name]: false}), {});
            setLoadingAi(finalLoadingState);
        };

        if (carrierStats.length > 0) {
            generateAnalysis();
        }
    }, [carrierStats, data]);

    const formatDelay = (seconds: number) => {
        const minutes = Math.floor(Math.abs(seconds) / 60);
        return `${seconds < 0 ? '-' : ''}${minutes}m`;
    };

    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold font-headline">Carrier Performance</h2>
            <Accordion type="single" collapsible className="w-full">
                {carrierStats.map((carrier) => (
                    <AccordionItem value={carrier.name} key={carrier.name}>
                        <AccordionTrigger>
                            <div className="flex items-center justify-between w-full pr-4">
                                <span className="text-lg font-medium">{carrier.name}</span>
                                <div className="flex items-center gap-4 text-sm">
                                    <span>{carrier.totalDeliveries} deliveries</span>
                                    <Badge variant={carrier.successRate > 95 ? "default" : "secondary"}>{carrier.successRate.toFixed(1)}% success</Badge>
                                    <span style={{color: carrier.averageDelay > 0 ? "hsl(var(--destructive))" : "hsl(var(--primary))"}}>
                                        Avg Delay: {formatDelay(carrier.averageDelay)}
                                    </span>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <Card className="m-2">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><Bot /> AI Failure Mode Analysis</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {loadingAi[carrier.name] ? (
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Loader2 className="animate-spin h-4 w-4" />
                                            <span>Analyzing failure modes...</span>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <h4 className="font-semibold">Worst Failure Reason:</h4>
                                            <Badge variant="destructive">{aiAnalysis[carrier.name]?.worstFailureReason}</Badge>
                                            <h4 className="font-semibold pt-2">Summary:</h4>
                                            <p className="text-sm text-muted-foreground">{aiAnalysis[carrier.name]?.analysisSummary}</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </div>
    );
}
