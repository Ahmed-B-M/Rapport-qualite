"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { type Delivery } from "@/lib/definitions";
import { getOverallStats, aggregateStats, getRankings, type RankingMetric } from '@/lib/data-processing';
import { generatePerformanceReport } from "@/ai/flows/generate-report";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Printer, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function ReportDisplay({ data, onBack }: { data: Delivery[], onBack: () => void }) {
    const [report, setReport] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const printRef = useRef<HTMLDivElement>(null);

    const aggregatedData = useMemo(() => {
        const depotStats = Object.entries(aggregateStats(data, 'depot')).map(([name, stat]) => ({ name, ...stat }));
        const warehouseStats = Object.entries(aggregateStats(data, 'warehouse')).map(([name, stat]) => ({ name, ...stat }));
        const carrierStats = Object.entries(aggregateStats(data, 'carrier')).map(([name, stat]) => ({ name, ...stat }));
        const driverStats = Object.entries(aggregateStats(data, 'driver')).map(([name, stat]) => ({ name, ...stat }));

        const metrics: RankingMetric[] = ['averageRating', 'punctualityRate', 'successRate', 'forcedOnSiteRate', 'forcedNoContactRate', 'webCompletionRate'];

        const getRankingsForAllMetrics = (stats: any[], filterFn: (item: any) => boolean = () => true) => {
            const filteredStats = stats.filter(filterFn);
            return metrics.reduce((acc, metric) => {
                const take = 5;
                const higherIsBetter = !['successRate', 'forcedOnSiteRate', 'forcedNoContactRate', 'webCompletionRate'].includes(metric);
                acc[metric] = getRankings(filteredStats, metric, take, higherIsBetter ? 'asc' : 'desc');
                return acc;
            }, {} as Record<RankingMetric, any>);
        };
        
        return {
            depots: getRankingsForAllMetrics(depotStats),
            warehouses: getRankingsForAllMetrics(warehouseStats),
            carriers: getRankingsForAllMetrics(carrierStats, c => c.name !== "Inconnu"),
            drivers: getRankingsForAllMetrics(driverStats, d => !d.name.startsWith("Livreur Inconnu")),
        };
    }, [data]);

    useEffect(() => {
        const fetchReport = async () => {
            setLoading(true);
            setError(null);
            try {
                const overallStats = getOverallStats(data);
                const warehouseStats = aggregateStats(data, 'warehouse');
                const customerComments = data.filter(d => d.feedbackComment).map(d => d.feedbackComment!);

                const result = await generatePerformanceReport({
                    overallStats: JSON.stringify(overallStats),
                    rankings: JSON.stringify(aggregatedData),
                    warehouseStats: JSON.stringify(warehouseStats),
                    customerComments: customerComments
                });

                setReport(result.reportMarkdown);
            } catch (err) {
                console.error("Failed to generate report:", err);
                setError("La génération du rapport a échoué. L'IA n'a peut-être pas pu traiter la demande. Veuillez réessayer.");
            } finally {
                setLoading(false);
            }
        };

        fetchReport();
    }, [data, aggregatedData]);

    const handlePrint = () => {
        const printContent = printRef.current;
        if (printContent) {
            const originalContents = document.body.innerHTML;
            const printHtml = printContent.innerHTML;
            
            // Create a new window to print
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(`
                    <html>
                        <head>
                            <title>Rapport de Performance</title>
                            <style>
                                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap');
                                @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap');
                                body { font-family: 'Inter', sans-serif; line-height: 1.6; color: #333; }
                                h1, h2, h3, h4 { font-family: 'Space Grotesk', sans-serif; color: #1a202c; }
                                h1 { font-size: 2em; }
                                h2 { font-size: 1.5em; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.3em; margin-top: 1.5em; }
                                h3 { font-size: 1.2em; margin-top: 1em; }
                                code { background-color: #f1f1f1; padding: 2px 4px; border-radius: 4px; font-family: monospace; }
                                blockquote { border-left: 4px solid #ccc; padding-left: 1em; margin-left: 0; font-style: italic; }
                                ul, ol { padding-left: 1.5em; }
                                @media print {
                                    body { -webkit-print-color-adjust: exact; }
                                }
                            </style>
                        </head>
                        <body>
                            ${printHtml}
                        </body>
                    </html>
                `);
                printWindow.document.close();
                printWindow.focus();
                printWindow.print();
                printWindow.close();
            }
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">Génération de votre rapport d'analyse...</p>
                <p className="text-sm text-muted-foreground">(Cela peut prendre jusqu'à une minute)</p>
            </div>
        );
    }
    
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                 <Button variant="outline" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" /> Retour à l'aperçu</Button>
                 <Button onClick={handlePrint} disabled={!report}><Printer className="mr-2 h-4 w-4" /> Imprimer / Télécharger en PDF</Button>
            </div>

            {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Erreur de Génération</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {report && (
                 <Card>
                    <CardContent className="p-2 md:p-6" >
                        <div ref={printRef} className="prose prose-sm max-w-none dark:prose-invert">
                             <ReactMarkdown>{report}</ReactMarkdown>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
