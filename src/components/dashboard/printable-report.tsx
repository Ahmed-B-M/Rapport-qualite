
'use client';

import { 
    type PerformanceReportData, 
    type SynthesisResult,
    type ReportSectionData,
    type Objectives,
    type KpiRanking,
    type DriverRatingRankingEntity,
    type CommentExample
} from '@/lib/definitions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
    ThumbsUp, ThumbsDown, GraduationCap, ArrowRightCircle, Target, CheckCircle, XCircle, 
    Clock, Star, MessageCircle, Truck, Award, UserX, Smile, Frown, Users, Percent, BarChart
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import ReactMarkdown from 'react-markdown';

interface PrintableReportProps {
  reportData: PerformanceReportData;
  synthesisData: SynthesisResult;
  objectives: Objectives;
}

// --- Reusable Helper Components for Print ---

const renderPoints = (points: string[], icon: React.ReactNode) => (
    <ul className="space-y-2">
        {points.map((point, index) => (
            <li key={index} className="flex items-start">
                <div className="flex-shrink-0 mr-2 mt-1">{icon}</div>
                <ReactMarkdown components={{ p: ({ children }) => <p className="mb-0 text-sm">{children}</p> }}>{point}</ReactMarkdown>
            </li>
        ))}
    </ul>
);

const SynthesisSectionPrint = ({ title, synthesis }: { title: string, synthesis: { strengths: string[], weaknesses: string[] } }) => (
    <Card className="mb-4 break-inside-avoid">
        <CardHeader className="p-3"><CardTitle className="flex items-center text-base"><Target className="h-4 w-4 mr-2" />{title}</CardTitle></CardHeader>
        <CardContent className="p-3">
            <h4 className="font-semibold text-green-700 flex items-center mb-2 text-sm"><ThumbsUp className="h-4 w-4 mr-2" />Points forts</h4>
            {synthesis.strengths.length > 0 ? renderPoints(synthesis.strengths, <ArrowRightCircle className="h-4 w-4 text-green-500" />) : <p className="text-xs text-muted-foreground">Aucun.</p>}
            <Separator className="my-2"/>
            <h4 className="font-semibold text-red-700 flex items-center mb-2 text-sm"><ThumbsDown className="h-4 w-4 mr-2" />Axes d'amélioration</h4>
            {synthesis.weaknesses.length > 0 ? renderPoints(synthesis.weaknesses, <ArrowRightCircle className="h-4 w-4 text-red-500" />) : <p className="text-xs text-muted-foreground">Aucun.</p>}
        </CardContent>
    </Card>
);

const KpiCardPrint = ({ title, value, unit = '%' }: { title: string, value: number | undefined, unit?: string }) => (
    <div className="p-2 border rounded-md bg-gray-50">
      <h4 className="text-xs text-muted-foreground">{title}</h4>
      <p className="text-lg font-bold mt-1">{value !== undefined ? `${value.toFixed(2)}${unit}` : 'N/A'}</p>
    </div>
);

const SingleRankingTablePrint = ({ title, data, unit }: { title: string, data: any[], unit: string }) => (
    <div className="break-inside-avoid">
        <h5 className="font-semibold mb-1 text-sm">{title}</h5>
        <Table>
            <TableBody>
                {data.length > 0 ? data.map(item => (
                    <TableRow key={item.name}>
                        <TableCell className="text-xs p-1">{item.name}</TableCell>
                        <TableCell className="text-right font-bold text-xs p-1">{item.value.toFixed(2)}{unit}</TableCell>
                    </TableRow>
                )) : <TableRow><TableCell colSpan={2} className="text-muted-foreground text-center text-xs">Aucune donnée</TableCell></TableRow>}
            </TableBody>
        </Table>
    </div>
);

const DriverRatingRankingsPrint = ({ top, flop }: { top: DriverRatingRankingEntity[], flop: DriverRatingRankingEntity[] }) => (
    <div className="break-inside-avoid">
        <h4 className="text-base font-semibold mb-2">Classement par Volume de Notes</h4>
        <div className="grid grid-cols-2 gap-4">
            <div>
                <h5 className="font-semibold flex items-center text-green-600 mb-1 text-sm"><Smile className="h-4 w-4 mr-2" /> Top Positives</h5>
                <Table>
                     <TableBody>{top.map((item, i) => <TableRow key={i}><TableCell className="text-xs p-1">{item.name} <span className="text-gray-500">({(item.averageRating || 0).toFixed(2)}/5)</span></TableCell><TableCell className="text-right font-bold text-xs p-1">{item.count}</TableCell></TableRow>)}</TableBody>
                </Table>
            </div>
            <div>
                <h5 className="font-semibold flex items-center text-red-600 mb-1 text-sm"><Frown className="h-4 w-4 mr-2" /> Top Négatives</h5>
                <Table>
                    <TableBody>{flop.map((item, i) => <TableRow key={i}><TableCell className="text-xs p-1">{item.name} <span className="text-gray-500">({(item.averageRating || 0).toFixed(2)}/5)</span></TableCell><TableCell className="text-right font-bold text-xs p-1">{item.count}</TableCell></TableRow>)}</TableBody>
                </Table>
            </div>
        </div>
    </div>
);

const DetailedAnalysisSectionPrint = ({ reportData }: { reportData: ReportSectionData }) => (
    <Card className="mb-4 break-inside-avoid">
        <CardHeader className="p-3">
            <CardTitle className="text-base">Analyse Détaillée</CardTitle>
            <CardDescription className="text-xs">{reportData.stats.totalDeliveries} livraisons analysées.</CardDescription>
        </CardHeader>
        <CardContent className="p-3 space-y-3">
            <div className="grid grid-cols-4 gap-2">
                <KpiCardPrint title="Taux de Succès" value={reportData.stats.successRate} unit="%" />
                <KpiCardPrint title="Note Moyenne" value={reportData.stats.averageRating} unit="/5" />
                <KpiCardPrint title="Note Comms" value={reportData.stats.averageSentiment} unit="/10" />
                <KpiCardPrint title="Ponctualité" value={reportData.stats.punctualityRate} unit="%" />
            </div>
            <Separator/>
            <DriverRatingRankingsPrint top={reportData.topRatedDrivers} flop={reportData.flopRatedDrivers} />
            <Separator/>
            <div>
                 <h4 className="text-base font-semibold mb-2">Classements par Indicateur Clé (KPI)</h4>
                 <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    <SingleRankingTablePrint title="Note Moyenne (Livreurs)" data={reportData.kpiRankings.drivers.averageRating.top} unit="/5" />
                    <SingleRankingTablePrint title="Note Moyenne (Transporteurs)" data={reportData.kpiRankings.carriers.averageRating.top} unit="/5" />
                    <SingleRankingTablePrint title="Taux de Succès (Livreurs)" data={reportData.kpiRankings.drivers.successRate.top} unit="%" />
                    <SingleRankingTablePrint title="Taux de Succès (Transporteurs)" data={reportData.kpiRankings.carriers.successRate.top} unit="%" />
                 </div>
            </div>
        </CardContent>
    </Card>
);

// --- Main Printable Component ---

export function PrintableReport({ reportData, synthesisData, objectives }: PrintableReportProps) {
  return (
    <div className="printable-content">
        <div className="text-center mb-4 break-after-avoid">
            <h1 className="text-2xl font-bold text-primary">Rapport Qualité des Livraisons</h1>
            <p className="text-sm text-muted-foreground">Analyse détaillée pour la période sélectionnée</p>
        </div>

        <div className="break-inside-avoid">
            <h2 className="text-xl font-bold mb-2">Conclusion & Recommandations</h2>
            <ReactMarkdown components={{ p: ({ children }) => <p className="text-sm mb-2">{children}</p> }}>{synthesisData.conclusion}</ReactMarkdown>
        </div>
        
        <Separator className="my-4"/>

        {/* Global Section */}
        <div className="mb-4 break-inside-avoid">
            <h2 className="text-xl font-bold mb-2">Vision d'Ensemble</h2>
            <SynthesisSectionPrint title="Synthèse Globale" synthesis={synthesisData.global} />
            <DetailedAnalysisSectionPrint reportData={reportData.global} />
        </div>

        {/* Depot Sections */}
        {reportData.depots.map((depot) => {
            const depotSynthesis = synthesisData.depots.find(d => d.name === depot.name);
            if (!depotSynthesis) return null;
            
            return (
                <div key={depot.name} className="page-break mb-4 break-inside-avoid">
                    <h2 className="text-xl font-bold mb-2">Analyse du Dépôt: {depot.name}</h2>
                    <SynthesisSectionPrint title={`Synthèse ${depot.name}`} synthesis={depotSynthesis} />
                    <DetailedAnalysisSectionPrint reportData={depot} />
                </div>
            );
        })}
    </div>
  );
}
