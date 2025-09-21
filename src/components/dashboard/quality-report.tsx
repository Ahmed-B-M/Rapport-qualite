
'use client';

import { useMemo } from 'react';
import { 
    type Delivery, 
    type PerformanceReportData, 
    type Objectives, 
    type ReportSectionData, 
    type CommentExample, 
    type DriverRatingRankingEntity,
    type SynthesisResult,
    type DepotSynthesis,
    type KpiRanking
} from '@/lib/definitions';
import { generatePerformanceReport } from '@/lib/analysis';
import { generateSynthesis } from '@/lib/synthesis';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
    ThumbsUp, ThumbsDown, GraduationCap, ArrowRightCircle, Target, CheckCircle, XCircle, 
    Clock, Star, MessageCircle, Truck, Award, UserX, Smile, Frown, Users, Percent, BarChart
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import ReactMarkdown from 'react-markdown';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// --- Props Definition ---

interface QualityReportProps {
  data: Delivery[];
  objectives: Objectives;
}

// --- Helper Components ---

const renderPoints = (points: string[], icon: React.ReactNode) => (
    <ul className="space-y-3">
        {points.map((point, index) => (
            <li key={index} className="flex items-start">
                <div className="flex-shrink-0 mr-3 mt-1">{icon}</div>
                <ReactMarkdown components={{ p: ({ children }) => <p className="mb-0 text-sm">{children}</p> }}>{point}</ReactMarkdown>
            </li>
        ))}
    </ul>
);

const SynthesisSection = ({ synthesis }: { synthesis: { strengths: string[], weaknesses: string[] } }) => (
    <Card className="shadow-md mb-6">
        <CardHeader><CardTitle className="flex items-center text-xl"><Target className="h-5 w-5 mr-2 text-gray-700" />Synthèse</CardTitle></CardHeader>
        <CardContent className="space-y-6">
            <div>
                <h3 className="font-bold text-lg mb-3 text-green-700 flex items-center"><ThumbsUp className="h-5 w-5 mr-2" />Points forts</h3>
                {synthesis.strengths.length > 0 ? renderPoints(synthesis.strengths, <ArrowRightCircle className="h-4 w-4 text-green-500" />) : <p className="text-sm text-muted-foreground">Aucun point fort majeur identifié.</p>}
            </div>
            <Separator/>
            <div>
                <h3 className="font-bold text-lg mb-3 text-red-700 flex items-center"><ThumbsDown className="h-5 w-5 mr-2" />Axes d'amélioration</h3>
                {synthesis.weaknesses.length > 0 ? renderPoints(synthesis.weaknesses, <ArrowRightCircle className="h-4 w-4 text-red-500" />) : <p className="text-sm text-muted-foreground">Aucun axe d'amélioration majeur identifié.</p>}
            </div>
        </CardContent>
    </Card>
);

const KpiCard = ({ title, value, objective, higherIsBetter, unit = '%' }: { title: string, value: number | undefined, objective: number, higherIsBetter: boolean, unit?: string }) => {
  if (value === undefined) {
    return (
        <div className="flex flex-col p-4 border rounded-lg bg-gray-50">
            <h4 className="text-sm text-muted-foreground">{title}</h4>
            <div className="flex items-center justify-between mt-2"><p className="text-2xl font-bold">N/A</p>{ objective && <Badge variant="secondary">Objectif: {objective.toFixed(2)}{unit}</Badge> }</div>
        </div>
    );
  }
  const meetsObjective = higherIsBetter ? value >= objective : value <= objective;
  return (
    <div className="flex flex-col p-4 border rounded-lg bg-white">
      <h4 className="text-sm text-muted-foreground">{title}</h4>
      <div className="flex items-center justify-between mt-2">
        <p className="text-2xl font-bold">{value.toFixed(2)}{unit}</p>
        <Badge variant={meetsObjective ? 'default' : 'destructive'} className="flex items-center gap-1">
          {meetsObjective ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          Objectif: {objective.toFixed(2)}{unit}
        </Badge>
      </div>
    </div>
  );
};

const SingleRankingTable = ({ title, icon, data, unit }: { title: string, icon: React.ReactNode, data: any[], unit: string }) => (
    <div>
        <h4 className="font-semibold flex items-center mb-2">{icon}{title}</h4>
        <Table>
            <TableBody>
                {data.length > 0 ? data.map(item => (
                    <TableRow key={item.name}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell className="text-right font-bold">{item.value.toFixed(2)}{unit}</TableCell>
                    </TableRow>
                )) : <TableRow><TableCell className="text-muted-foreground text-center">Aucune donnée</TableCell></TableRow>}
            </TableBody>
        </Table>
    </div>
);


const KpiRankingTabs = ({ reportData }: { reportData: ReportSectionData }) => {
    const kpis = [
        { key: 'averageRating', name: 'Note Moyenne', icon: <Star className="h-4 w-4 mr-2"/>, unit: '/5' },
        { key: 'successRate', name: 'Taux de Succès', icon: <Percent className="h-4 w-4 mr-2"/>, unit: '%' },
        { key: 'punctualityRate', name: 'Ponctualité', icon: <Clock className="h-4 w-4 mr-2"/>, unit: '%' },
        { key: 'averageSentiment', name: 'Note des Comms', icon: <MessageCircle className="h-4 w-4 mr-2"/>, unit: '/10' }
    ];

    return (
        <div>
            <h3 className="text-lg font-semibold mb-4">Classements par Indicateur Clé (KPI)</h3>
            <Tabs defaultValue="averageRating" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    {kpis.map(kpi => <TabsTrigger key={kpi.key} value={kpi.key}>{kpi.icon}{kpi.name}</TabsTrigger>)}
                </TabsList>
                {kpis.map(kpi => (
                    <TabsContent key={kpi.key} value={kpi.key}>
                        <Card>
                            <CardContent className="p-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <h4 className="font-semibold text-gray-800 mb-2 flex items-center"><Users className="h-5 w-5 mr-2"/> Classement Livreurs</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <SingleRankingTable title="Top 3" icon={<Award className="h-4 w-4 mr-1 text-green-600"/>} data={reportData.kpiRankings.drivers[kpi.key as keyof typeof reportData.kpiRankings.drivers].top} unit={kpi.unit} />
                                            <SingleRankingTable title="Flop 3" icon={<UserX className="h-4 w-4 mr-1 text-red-600"/>} data={reportData.kpiRankings.drivers[kpi.key as keyof typeof reportData.kpiRankings.drivers].flop} unit={kpi.unit} />
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-800 mb-2 flex items-center"><Truck className="h-5 w-5 mr-2"/> Classement Transporteurs</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                             <SingleRankingTable title="Top 3" icon={<Award className="h-4 w-4 mr-1 text-green-600"/>} data={reportData.kpiRankings.carriers[kpi.key as keyof typeof reportData.kpiRankings.carriers].top} unit={kpi.unit} />
                                            <SingleRankingTable title="Flop 3" icon={<UserX className="h-4 w-4 mr-1 text-red-600"/>} data={reportData.kpiRankings.carriers[kpi.key as keyof typeof reportData.kpiRankings.carriers].flop} unit={kpi.unit} />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
};

const DriverRatingRankings = ({ top, flop }: { top: DriverRatingRankingEntity[], flop: DriverRatingRankingEntity[] }) => (
    <div>
        <h3 className="text-lg font-semibold mb-4">Classement des Livreurs par Volume de Notes</h3>
        <div className="grid md:grid-cols-2 gap-6">
            <div>
                <h4 className="font-semibold flex items-center text-green-600 mb-2"><Smile className="h-4 w-4 mr-2" /> Top Notes Positives (4-5 étoiles)</h4>
                <Table>
                    <TableHeader><TableHead>Livreur</TableHead></TableHeader>
                    <TableBody>{top.map((item, i) => 
                        <TableRow key={i}>
                            <TableCell>
                                {item.name} {item.averageRating && <span className="text-xs text-muted-foreground">({item.averageRating.toFixed(2)}/5)</span>}
                                <span className="font-bold float-right">({item.count})</span>
                            </TableCell>
                        </TableRow>)}
                    </TableBody>
                </Table>
            </div>
            <div>
                <h4 className="font-semibold flex items-center text-red-600 mb-2"><Frown className="h-4 w-4 mr-2" /> Top Notes Négatives (1-2 étoiles)</h4>
                <Table>
                    <TableHeader><TableHead>Livreur</TableHead></TableHeader>
                    <TableBody>{flop.map((item, i) => 
                        <TableRow key={i}>
                             <TableCell>
                                {item.name} {item.averageRating && <span className="text-xs text-muted-foreground">({item.averageRating.toFixed(2)}/5)</span>}
                                <span className="font-bold float-right">({item.count})</span>
                            </TableCell>
                        </TableRow>)}
                    </TableBody>
                </Table>
            </div>
        </div>
    </div>
);


const CommentExamples = ({ top, flop }: { top: CommentExample[], flop: CommentExample[] }) => (
    <div>
        <h3 className="text-lg font-semibold mb-4">Exemples de Commentaires</h3>
        <div className="grid md:grid-cols-2 gap-6">
            <div>
                <h4 className="font-semibold flex items-center text-green-600 mb-2"><ThumbsUp className="h-4 w-4 mr-2" /> Meilleurs Commentaires</h4>
                {top.map((c, i) => (<div key={i} className="border-l-2 border-green-600 pl-3 mb-3 text-sm italic">"{c.comment}"<p className="text-xs text-muted-foreground mt-1 not-italic">- {c.driver} (Note: {c.score.toFixed(2)}/10)</p></div>))}
            </div>
            <div>
                <h4 className="font-semibold flex items-center text-red-600 mb-2"><ThumbsDown className="h-4 w-4 mr-2" /> Pires Commentaires</h4>
                {flop.map((c, i) => (<div key={i} className="border-l-2 border-red-600 pl-3 mb-3 text-sm italic">"{c.comment}"<p className="text-xs text-muted-foreground mt-1 not-italic">- {c.driver} (Note: {c.score.toFixed(2)}/10)</p></div>))}
            </div>
        </div>
    </div>
)

const DetailedAnalysisSection = ({ reportData, objectives }: { reportData: ReportSectionData, objectives: Objectives }) => (
    <Card>
        <CardHeader>
            <CardTitle className="flex items-center"><BarChart className="h-5 w-5 mr-2" />Analyse Détaillée</CardTitle>
            <CardDescription>Total de {reportData.stats.totalDeliveries} livraisons analysées.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard title="Taux de Succès" value={reportData.stats.successRate} objective={100 - objectives.failureRate} higherIsBetter={true} />
                <KpiCard title="Note Moyenne" value={reportData.stats.averageRating} objective={objectives.averageRating} higherIsBetter={true} unit="/5" />
                <KpiCard title="Note des Commentaires" value={reportData.stats.averageSentiment} objective={objectives.averageSentiment} higherIsBetter={true} unit="/10" />
                <KpiCard title="Ponctualité" value={reportData.stats.punctualityRate} objective={objectives.punctualityRate} higherIsBetter={true} />
            </div>
            <Separator />
            <DriverRatingRankings top={reportData.topRatedDrivers} flop={reportData.flopRatedDrivers} />
            <Separator />
            <CommentExamples top={reportData.topComments} flop={reportData.flopComments} />
            <Separator />
            <KpiRankingTabs reportData={reportData} />
        </CardContent>
    </Card>
);

// --- Main Report Component ---

export function QualityReport({ data, objectives }: QualityReportProps) {
  const reportData = useMemo(() => generatePerformanceReport(data), [data]);
  const synthesisData = useMemo(() => generateSynthesis(reportData, objectives), [reportData, objectives]);

  if (!reportData || !synthesisData) return <div>Génération du rapport en cours...</div>;

  return (
    <div className="bg-gray-50 p-4 sm:p-6 rounded-lg">
        <div className="mb-8">
             <div className="mb-6 print-header"><h1 className="text-3xl font-bold font-headline text-primary mb-2 print-title">Rapport Qualité</h1><p className="text-muted-foreground">Analyse globale et par dépôt.</p></div>
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-lg">
                <CardHeader><CardTitle className="flex items-center text-2xl font-bold text-blue-800"><GraduationCap className="h-6 w-6 mr-3 text-blue-600" />Conclusion & Recommandations</CardTitle></CardHeader>
                <CardContent><ReactMarkdown components={{ p: ({ children }) => <p className="text-base text-gray-700 leading-relaxed">{children}</p> }}>{synthesisData.conclusion}</ReactMarkdown></CardContent>
            </Card>
        </div>
        <Tabs defaultValue="global">
            <TabsList className="grid w-full grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                <TabsTrigger value="global">Vision d'Ensemble</TabsTrigger>
                {synthesisData.depots.map(depot => (<TabsTrigger key={depot.name} value={depot.name}>{depot.name}</TabsTrigger>))}
            </TabsList>
            <TabsContent value="global" className="mt-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    <div className="lg:col-span-1"><SynthesisSection synthesis={synthesisData.global} /></div>
                    <div className="lg:col-span-2"><DetailedAnalysisSection reportData={reportData.global} objectives={objectives} /></div>
                </div>
            </TabsContent>
            {reportData.depots.map((depotReport) => {
                const depotSynthesis = synthesisData.depots.find(d => d.name === depotReport.name);
                return (
                    <TabsContent key={depotReport.name} value={depotReport.name} className="mt-4">
                         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                            <div className="lg:col-span-1">{depotSynthesis && <SynthesisSection synthesis={depotSynthesis} />}</div>
                            <div className="lg:col-span-2"><DetailedAnalysisSection reportData={depotReport} objectives={objectives}/></div>
                        </div>
                    </TabsContent>
                )
            })}
        </Tabs>
    </div>
  );
}
