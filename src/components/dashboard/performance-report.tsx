

'use client';

import { useMemo, useState } from 'react';
import { type Delivery, type PerformanceReportData, type Objectives, type ReportSectionData, type CommentExample, type DriverRatingRankingEntity } from '@/lib/definitions';
import { generatePerformanceReport } from '@/lib/analysis';
import { generateSynthesis } from '@/lib/synthesis';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, TrendingDown, Award, UserX, CheckCircle, XCircle, Clock, Star, MessageCircle, Truck, ThumbsUp, ThumbsDown, FileText, Bot, Smile, Frown } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { SynthesisReport } from './synthesis-report';

interface PerformanceReportProps {
  data: Delivery[];
  objectives: Objectives;
}

const KpiCard = ({ title, value, objective, higherIsBetter, unit = '%' }: { title: string, value: number | undefined, objective: number, higherIsBetter: boolean, unit?: string }) => {
  if (value === undefined) {
    return (
        <div className="flex flex-col p-4 border rounded-lg">
            <h4 className="text-sm text-muted-foreground">{title}</h4>
            <div className="flex items-center justify-between mt-2">
                <p className="text-2xl font-bold">N/A</p>
                { objective && <Badge variant="secondary">Objectif: {objective}{unit}</Badge> }
            </div>
        </div>
    );
  }

  const meetsObjective = higherIsBetter ? value >= objective : value <= objective;
  const displayValue = value.toFixed(1);

  return (
    <div className="flex flex-col p-4 border rounded-lg">
      <h4 className="text-sm text-muted-foreground">{title}</h4>
      <div className="flex items-center justify-between mt-2">
        <p className="text-2xl font-bold">{displayValue}{unit}</p>
        <Badge variant={meetsObjective ? 'default' : 'destructive'} className="flex items-center gap-1">
          {meetsObjective ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          Objectif: {objective}{unit}
        </Badge>
      </div>
    </div>
  );
};

const RankingTable = ({ top, flop, kpiName, unit = '%' }: { top: any[], flop: any[], kpiName: string, unit?: string }) => (
    <div>
        <h5 className="font-semibold mb-2 flex items-center">
            {kpiName === 'Note Moyenne' && <Star className="h-4 w-4 mr-2" />}
            {kpiName === 'Taux de Succès' && <CheckCircle className="h-4 w-4 mr-2" />}
            {kpiName === 'Ponctualité' && <Clock className="h-4 w-4 mr-2" />}
            {kpiName === 'Note des Commentaires' && <MessageCircle className="h-4 w-4 mr-2" />}
            {kpiName}
        </h5>
        <div className="grid grid-cols-2 gap-4">
            <div>
                <div className="flex items-center text-green-600 mb-1"><Award className="h-4 w-4 mr-1"/> Top 3</div>
                <Table>
                    <TableBody>
                        {top.map(item => <TableRow key={item.name}><TableCell>{item.name}</TableCell><TableCell className="text-right font-bold">{item.value.toFixed(2)}{unit}</TableCell></TableRow>)}
                    </TableBody>
                </Table>
            </div>
            <div>
                 <div className="flex items-center text-red-600 mb-1"><UserX className="h-4 w-4 mr-1"/> Flop 3</div>
                 <Table>
                    <TableBody>
                        {flop.map(item => <TableRow key={item.name}><TableCell>{item.name}</TableCell><TableCell className="text-right font-bold">{item.value.toFixed(2)}{unit}</TableCell></TableRow>)}
                    </TableBody>
                </Table>
            </div>
        </div>
    </div>
);

const DriverRatingRankings = ({ top, flop }: { top: DriverRatingRankingEntity[], flop: DriverRatingRankingEntity[] }) => (
    <div>
        <h3 className="text-lg font-semibold mb-4">Classement des Livreurs par Notes</h3>
        <div className="grid md:grid-cols-2 gap-6">
            <div>
                <h4 className="font-semibold flex items-center text-green-600 mb-2"><Smile className="h-4 w-4 mr-2" /> Top Notes Positives (4-5 étoiles)</h4>
                <Table>
                    <TableHeader>
                        <TableHead>Livreur</TableHead>
                        <TableHead className="text-right">Nombre de notes</TableHead>
                    </TableHeader>
                    <TableBody>
                        {top.map((item, i) => <TableRow key={i}><TableCell>{item.name}</TableCell><TableCell className="text-right font-bold">{item.count}</TableCell></TableRow>)}
                    </TableBody>
                </Table>
            </div>
            <div>
                <h4 className="font-semibold flex items-center text-red-600 mb-2"><Frown className="h-4 w-4 mr-2" /> Top Notes Négatives (1-2 étoiles)</h4>
                <Table>
                    <TableHeader>
                        <TableHead>Livreur</TableHead>
                        <TableHead className="text-right">Nombre de notes</TableHead>
                    </TableHeader>
                    <TableBody>
                        {flop.map((item, i) => <TableRow key={i}><TableCell>{item.name}</TableCell><TableCell className="text-right font-bold">{item.count}</TableCell></TableRow>)}
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
                {top.map((c, i) => (
                    <div key={i} className="border-l-2 border-green-600 pl-3 mb-3 text-sm">
                        <p className="italic">"{c.comment}"</p>
                        <p className="text-xs text-muted-foreground mt-1">- {c.driver} (Note: {c.score.toFixed(1)}/10)</p>
                    </div>
                ))}
            </div>
            <div>
                <h4 className="font-semibold flex items-center text-red-600 mb-2"><ThumbsDown className="h-4 w-4 mr-2" /> Pires Commentaires</h4>
                {flop.map((c, i) => (
                    <div key={i} className="border-l-2 border-red-600 pl-3 mb-3 text-sm">
                        <p className="italic">"{c.comment}"</p>
                        <p className="text-xs text-muted-foreground mt-1">- {c.driver} (Note: {c.score.toFixed(1)}/10)</p>
                    </div>
                ))}
            </div>
        </div>
    </div>
)


const ReportSection = ({ title, reportData, objectives }: { title: string, reportData: ReportSectionData, objectives: Objectives }) => (
    <Card className="mb-6">
        <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>Total de {reportData.stats.totalDeliveries} livraisons analysées.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid md:grid-cols-4 gap-4 mb-6">
                <KpiCard title="Taux de Succès" value={reportData.stats.successRate} objective={100 - objectives.failureRate} higherIsBetter={true} />
                <KpiCard title="Note Moyenne" value={reportData.stats.averageRating} objective={objectives.averageRating} higherIsBetter={true} unit="/5" />
                <KpiCard title="Note des Commentaires" value={reportData.stats.averageSentiment} objective={objectives.averageSentiment} higherIsBetter={true} unit="/10" />
                <KpiCard title="Ponctualité" value={reportData.stats.punctualityRate} objective={objectives.punctualityRate} higherIsBetter={true} />
            </div>

            <Separator className="my-6" />
            <DriverRatingRankings top={reportData.topRatedDrivers} flop={reportData.flopRatedDrivers} />
            
            <Separator className="my-6" />
            <CommentExamples top={reportData.topComments} flop={reportData.flopComments} />
            
            <Separator className="my-6" />

            <div>
                <h3 className="text-lg font-semibold mb-4">Classements des Livreurs par KPI</h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <RankingTable top={reportData.kpiRankings.drivers.successRate.top} flop={reportData.kpiRankings.drivers.successRate.flop} kpiName="Taux de Succès" />
                    <RankingTable top={reportData.kpiRankings.drivers.averageRating.top} flop={reportData.kpiRankings.drivers.averageRating.flop} kpiName="Note Moyenne" unit="/5" />
                    <RankingTable top={reportData.kpiRankings.drivers.averageSentiment.top} flop={reportData.kpiRankings.drivers.averageSentiment.flop} kpiName="Note des Commentaires" unit="/10" />
                    <RankingTable top={reportData.kpiRankings.drivers.punctualityRate.top} flop={reportData.kpiRankings.drivers.punctualityRate.flop} kpiName="Ponctualité" />
                </div>
            </div>

            <Separator className="my-6" />

            <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center"><Truck className="h-5 w-5 mr-2" /> Classements des Transporteurs par KPI</h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <RankingTable top={reportData.kpiRankings.carriers.successRate.top} flop={reportData.kpiRankings.carriers.successRate.flop} kpiName="Taux de Succès" />
                    <RankingTable top={reportData.kpiRankings.carriers.averageRating.top} flop={reportData.kpiRankings.carriers.averageRating.flop} kpiName="Note Moyenne" unit="/5" />
                    <RankingTable top={reportData.kpiRankings.carriers.averageSentiment.top} flop={reportData.kpiRankings.carriers.averageSentiment.flop} kpiName="Note des Commentaires" unit="/10" />
                    <RankingTable top={reportData.kpiRankings.carriers.punctualityRate.top} flop={reportData.kpiRankings.carriers.punctualityRate.flop} kpiName="Ponctualité" />
                </div>
            </div>
        </CardContent>
    </Card>
);

export function PerformanceReport({ data, objectives }: PerformanceReportProps) {
  const [view, setView] = useState<'detailed' | 'synthesis'>('detailed');
  
  const reportData = useMemo(() => generatePerformanceReport(data), [data]);
  const synthesisData = useMemo(() => generateSynthesis(reportData, objectives), [reportData, objectives]);

  if (!reportData) return <div>Génération du rapport en cours...</div>;

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button variant="outline" onClick={() => setView(view === 'detailed' ? 'synthesis' : 'detailed')}>
            {view === 'detailed' ? <Bot className="mr-2 h-4 w-4" /> : <FileText className="mr-2 h-4 w-4" />}
            {view === 'detailed' ? 'Voir la synthèse IA' : 'Voir le rapport détaillé'}
        </Button>
      </div>

      {view === 'detailed' ? (
        <>
          <ReportSection 
            title="Synthèse Globale"
            reportData={reportData.global}
            objectives={objectives}
          />
          
          <h2 className="text-2xl font-bold mt-8 mb-4">Analyse par Dépôt</h2>
          {reportData.depots.map(depotReport => (
            <ReportSection 
              key={depotReport.name}
              title={`Dépôt: ${depotReport.name}`}
              reportData={depotReport}
              objectives={objectives}
            />
          ))}
        </>
      ) : (
        <SynthesisReport synthesis={synthesisData} />
      )}
    </div>
  );
}
