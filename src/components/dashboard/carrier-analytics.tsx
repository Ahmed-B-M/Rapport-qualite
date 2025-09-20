
"use client"

import { useMemo, useState } from 'react';
import { type Delivery } from '@/lib/definitions';
import { type Objectives } from '@/app/page';
import { aggregateStats } from '@/lib/data-processing';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { analyzeCarrierFailureModes } from '@/ai/flows/carrier-failure-mode-analysis';
import { Badge } from '@/components/ui/badge';
import { Bot, Loader2, Lightbulb, User, ArrowLeft, AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, Tooltip as RechartsTooltip } from 'recharts';
import { cn } from '@/lib/utils';

type CarrierAIAnalysis = {
    worstFailureReason: string;
    analysisSummary: string;
    correctiveAction: string;
}

const PerformanceBar = ({ value, objective, higherIsBetter }: { value: number, objective: number, higherIsBetter: boolean }) => {
    const isBelowObjective = higherIsBetter ? value < objective : value > objective;
    const percentage = higherIsBetter ? value : 100 - value;

    return (
        <div className="w-full bg-muted rounded-full h-2.5">
            <div
                className={cn(
                    "h-2.5 rounded-full",
                    isBelowObjective ? "bg-destructive" : "bg-primary"
                )}
                style={{ width: `${percentage}%` }}
            ></div>
        </div>
    );
};


const ObjectiveIndicator = ({ value, objective, higherIsBetter, tooltipLabel, unit = '' }: { value: number, objective: number, higherIsBetter: boolean, tooltipLabel: string, unit?: string }) => {
    const isBelowObjective = higherIsBetter ? value < objective : value > objective;
    if (!isBelowObjective || (higherIsBetter && value <= 0)) return null;

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger>
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                </TooltipTrigger>
                <TooltipContent>
                    <p>{tooltipLabel}: {value.toFixed(2)}{unit} (Objectif: {higherIsBetter ? '>' : '<'} {objective}{unit})</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};

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

const CarrierAnalysisModal = ({ carrier, analysis, isLoading, onClose }: {
    carrier: ReturnType<typeof aggregateStats>[string] & { name: string };
    analysis: CarrierAIAnalysis | null;
    isLoading: boolean;
    onClose: () => void;
}) => {
    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><Bot /> Analyse IA pour {carrier.name}</DialogTitle>
                    <DialogDescription>Analyse approfondie des modes de défaillance de ce transporteur.</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                     {isLoading ? (
                        <div className="flex h-48 items-center justify-center gap-2 text-muted-foreground">
                            <Loader2 className="animate-spin h-5 w-5" />
                            <span>Analyse des modes de défaillance...</span>
                        </div>
                    ) : analysis ? (
                        <div className="space-y-6">
                            <div>
                                <h4 className="font-semibold text-lg">Pire motif de défaillance</h4>
                                <Badge variant="destructive" className="mt-2 text-base">{analysis.worstFailureReason}</Badge>
                            </div>
                            <div>
                                <h4 className="font-semibold text-lg">Résumé de l'analyse</h4>
                                <p className="text-sm text-muted-foreground mt-1 italic">"{analysis.analysisSummary}"</p>
                            </div>
                            <div className="p-4 rounded-lg bg-accent/20 border border-accent/50">
                                <h4 className="font-semibold flex items-center gap-2 text-lg"><Lightbulb className="text-accent" /> Action Suggérée</h4>
                                <p className="text-sm mt-1">{analysis.correctiveAction}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex h-48 items-center justify-center text-muted-foreground">
                            <p>L'analyse n'a pas pu être chargée.</p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

const CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1919'];

const CarrierRadarChart = ({ stats }: { stats: (ReturnType<typeof aggregateStats>[string] & { name: string })[] }) => {
    const radarData = useMemo(() => {
        const subjects = [
            { key: "failureRate", name: "Taux d'Échec", max: 0 },
            { key: "forcedOnSiteRate", name: "Forcé Sur Place", max: 0 },
            { key: "forcedNoContactRate", name: "Forcé Sans Contact", max: 0 },
        ];

        const dataBySubject = subjects.map(subject => ({
            subject: subject.name,
            ...stats.reduce((acc, carrier) => {
                const value = subject.key === 'failureRate' ? 100 - carrier.successRate : carrier[subject.key as keyof typeof carrier];
                if (typeof value === 'number') {
                    acc[carrier.name] = value;
                    if (value > subject.max) subject.max = value;
                }
                return acc;
            }, {} as Record<string, number>),
        }));
        
        // Normalize the data for better visualization
        return dataBySubject.map(d => {
            const subjectInfo = subjects.find(s => s.name === d.subject);
            const maxVal = subjectInfo && subjectInfo.max > 0 ? subjectInfo.max : 1; // Avoid division by zero
            const normalized = { ...d };
            stats.forEach(carrier => {
                if (typeof normalized[carrier.name] === 'number') {
                    normalized[carrier.name] = (normalized[carrier.name] / maxVal) * 100;
                }
            });
            return normalized;
        });

    }, [stats]);
    
    if (stats.length === 0) return null;

    return (
        <Card className="mb-6">
            <CardHeader>
                <CardTitle>Profil de Défaillance Comparatif des Transporteurs</CardTitle>
                <CardDescription>
                    Comparaison des principaux indicateurs de défaillance (normalisés à 100% pour la lisibilité). Plus la zone d'un transporteur est grande, plus ses taux de défaillance sont élevés.
                </CardDescription>
            </CardHeader>
            <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                     <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="subject" />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <RechartsTooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} formatter={(value: number, name: string) => [`${value.toFixed(2)}% (normalisé)`, name]} />
                        <Legend />
                        {stats.map((carrier, index) => (
                           <Radar key={carrier.name} name={carrier.name} dataKey={carrier.name} stroke={CHART_COLORS[index % CHART_COLORS.length]} fill={CHART_COLORS[index % CHART_COLORS.length]} fillOpacity={0.6} />
                        ))}
                    </RadarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
};


export function CarrierAnalytics({ data, objectives }: { data: Delivery[], objectives: Objectives }) {
    const [aiAnalysisCache, setAiAnalysisCache] = useState<Record<string, CarrierAIAnalysis>>({});
    const [loadingAi, setLoadingAi] = useState<Record<string, boolean>>({});
    const [showUnknownDetail, setShowUnknownDetail] = useState(false);
    const [selectedCarrier, setSelectedCarrier] = useState<(ReturnType<typeof aggregateStats>[string] & { name: string }) | null>(null);

    const carrierStats = useMemo(() => {
        const stats = aggregateStats(data, 'carrier');
        return Object.entries(stats).map(([name, stat]) => ({ name, ...stat }))
            .filter(carrier => carrier.name !== 'Inconnu') // Exclude 'Inconnu' from main stats
            .sort((a,b) => b.totalDeliveries - a.totalDeliveries);
    }, [data]);
    
    const unknownCarrierStat = useMemo(() => {
        const stats = aggregateStats(data, 'carrier');
        return stats['Inconnu'] ? { name: 'Inconnu', ...stats['Inconnu'] } : null;
    }, [data]);

    const handleCarrierClick = async (carrier: ReturnType<typeof carrierStats>[0] | typeof unknownCarrierStat) => {
        if (!carrier) return;
        if (carrier.name === 'Inconnu') {
            setShowUnknownDetail(true);
            return;
        }

        setSelectedCarrier(carrier);
        
        if (aiAnalysisCache[carrier.name] || loadingAi[carrier.name]) return;

        setLoadingAi(prev => ({...prev, [carrier.name]: true}));
        
        const failureReasons = data
            .filter(d => d.carrier === carrier.name && d.status === 'Non livré' && d.failureReason)
            .map(d => d.failureReason!);
        
        if (failureReasons.length === 0) {
            const noFailureResult = { worstFailureReason: "Aucun échec enregistré.", analysisSummary: "Ce transporteur a un historique de livraison parfait dans cet ensemble de données.", correctiveAction: "Aucune action nécessaire." };
            setAiAnalysisCache(prev => ({ ...prev, [carrier.name]: noFailureResult }));
            setLoadingAi(prev => ({...prev, [carrier.name]: false}));
            return;
        }

        try {
            const result = await analyzeCarrierFailureModes({ carrierName: carrier.name, deliveryFailureReasons: failureReasons });
            setAiAnalysisCache(prev => ({ ...prev, [carrier.name]: result }));
        } catch (error) {
            console.error(`L'analyse IA a échoué pour ${carrier.name}:`, error);
            const errorResult = { worstFailureReason: "Erreur", analysisSummary: "Impossible de générer l'analyse IA.", correctiveAction: "Impossible de générer une suggestion." };
            setAiAnalysisCache(prev => ({ ...prev, [carrier.name]: errorResult }));
        } finally {
            setLoadingAi(prev => ({...prev, [carrier.name]: false}));
        }
    };


    if (showUnknownDetail) {
        return <UnknownCarrierDetailView data={data} onBack={() => setShowUnknownDetail(false)} />;
    }

    return (
        <>
            {selectedCarrier && (
                <CarrierAnalysisModal 
                    carrier={selectedCarrier}
                    analysis={aiAnalysisCache[selectedCarrier.name]}
                    isLoading={!!loadingAi[selectedCarrier.name]}
                    onClose={() => setSelectedCarrier(null)}
                />
            )}
            <CarrierRadarChart stats={carrierStats} />
            <Card>
                <CardHeader>
                    <CardTitle>Performance par Transporteur</CardTitle>
                    <CardDescription>
                        Comparez les indicateurs clés de vos transporteurs. Cliquez sur l'icône <Bot className="inline h-4 w-4" /> pour une analyse IA détaillée.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Transporteur</TableHead>
                                <TableHead className="text-right">Total Livraisons</TableHead>
                                <TableHead className="w-[120px] text-right">Taux d'échec</TableHead>
                                <TableHead className="w-[120px] text-right">Ponctualité</TableHead>
                                <TableHead className="text-right">Note moyenne</TableHead>
                                <TableHead className="text-center">Analyse IA</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {carrierStats.map((carrier) => (
                                <TableRow key={carrier.name}>
                                    <TableCell className="font-medium">{carrier.name}</TableCell>
                                    <TableCell className="text-right">{carrier.totalDeliveries}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <span>{(100 - carrier.successRate).toFixed(2)}%</span>
                                            <ObjectiveIndicator value={(100 - carrier.successRate)} objective={objectives.failureRate} higherIsBetter={false} tooltipLabel="Taux d'échec" unit="%" />
                                        </div>
                                         <PerformanceBar value={(100 - carrier.successRate)} objective={objectives.failureRate} higherIsBetter={false} />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <span>{carrier.punctualityRate.toFixed(2)}%</span>
                                            <ObjectiveIndicator value={carrier.punctualityRate} objective={objectives.punctualityRate} higherIsBetter={true} tooltipLabel="Ponctualité" unit="%" />
                                        </div>
                                         <PerformanceBar value={carrier.punctualityRate} objective={objectives.punctualityRate} higherIsBetter={true} />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <ObjectiveIndicator value={carrier.averageRating} objective={objectives.averageRating} higherIsBetter={true} tooltipLabel="Note moyenne" />
                                            {carrier.averageRating > 0 ? carrier.averageRating.toFixed(2) : 'N/A'}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                         <Button variant="ghost" size="icon" onClick={() => handleCarrierClick(carrier)}>
                                            <Bot className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                             {unknownCarrierStat && (
                                <TableRow key="inconnu" className="bg-muted/50">
                                    <TableCell className="font-medium">Inconnu</TableCell>
                                    <TableCell className="text-right">{unknownCarrierStat.totalDeliveries}</TableCell>
                                    <TableCell className="text-right">{(100 - unknownCarrierStat.successRate).toFixed(2)}%</TableCell>
                                    <TableCell className="text-right">{unknownCarrierStat.punctualityRate.toFixed(2)}%</TableCell>
                                    <TableCell className="text-right">{unknownCarrierStat.averageRating > 0 ? unknownCarrierStat.averageRating.toFixed(2) : 'N/A'}</TableCell>
                                    <TableCell className="text-center">
                                        <Button variant="ghost" size="icon" onClick={() => handleCarrierClick(unknownCarrierStat)}>
                                            <Info className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </>
    );
}
