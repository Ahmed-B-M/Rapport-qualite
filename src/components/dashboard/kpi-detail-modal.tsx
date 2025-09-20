
"use client";

import { useMemo } from 'react';
import { type Delivery } from '@/lib/definitions';
import { type RankingMetric } from '@/lib/data-processing';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ThumbsDown, Building2, Truck, User } from 'lucide-react';

const METRIC_CONFIG = {
    successRate: {
        title: "Analyse du Taux d'Échec",
        description: "Détails des raisons d'échec et des entités les plus impactées.",
    },
    averageRating: { title: "Analyse de la Note Moyenne", description: "..." },
    punctualityRate: { title: "Analyse de la Ponctualité", description: "..." },
    forcedOnSiteRate: { title: "Analyse 'Sur Place Forcé'", description: "..." },
    forcedNoContactRate: { title: "Analyse 'Sans Contact Forcé'", description: "..." },
    webCompletionRate: { title: "Analyse 'Validation Web'", description: "..." },
};

const FailureReasonChart = ({ data }: { data: Delivery[] }) => {
    const failureReasons = useMemo(() => {
        const reasons: Record<string, number> = {};
        data.forEach(d => {
            if (d.failureReason) {
                reasons[d.failureReason] = (reasons[d.failureReason] || 0) + 1;
            }
        });
        return Object.entries(reasons)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
    }, [data]);

    if (failureReasons.length === 0) {
        return <p className="text-sm text-muted-foreground">Aucune raison d'échec enregistrée.</p>;
    }

    return (
        <ResponsiveContainer width="100%" height={200}>
            <BarChart data={failureReasons} layout="vertical" margin={{ top: 5, right: 20, left: 120, bottom: 5 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={120} tick={{ fontSize: 11 }} />
                <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="count" name="Nombre" fill="hsl(var(--destructive))" barSize={20} radius={[0, 4, 4, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
};

const FlopRankingList = ({ title, rankings, icon: Icon }: { title: string, rankings: any[], icon: React.ElementType }) => (
    <div>
        <h4 className="font-semibold flex items-center gap-2 mb-2"><Icon className="h-4 w-4" /> {title}</h4>
        {rankings.length > 0 ? (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Nom</TableHead>
                        <TableHead className="text-right">Taux d'échec</TableHead>
                        <TableHead className="text-right">Nb Échecs</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rankings.map(item => (
                        <TableRow key={item.name}>
                            <TableCell className="font-medium truncate max-w-xs">{item.name}</TableCell>
                            <TableCell className="text-right text-destructive font-semibold">{(100 - item.successRate).toFixed(2)}%</TableCell>
                            <TableCell className="text-right">{item.failedDeliveries}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        ) : (
             <p className="text-sm text-muted-foreground pl-2">Aucun classement "flop" à afficher.</p>
        )}
    </div>
);

export function KpiDetailModal({ metric, onClose, data, rankings }: {
    metric: RankingMetric;
    onClose: () => void;
    data: Delivery[];
    rankings: any;
}) {
    const config = METRIC_CONFIG[metric];

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>{config.title}</DialogTitle>
                    <DialogDescription>{config.description}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Principales Raisons d'Échec</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <FailureReasonChart data={data} />
                        </CardContent>
                    </Card>
                    <Card>
                         <CardHeader>
                            <CardTitle className="flex items-center gap-2"><ThumbsDown /> Classements "Flop"</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FlopRankingList title="Dépôts" rankings={rankings.depots.successRate.flop} icon={Building2} />
                            <FlopRankingList title="Transporteurs" rankings={rankings.carriers.successRate.flop} icon={Truck} />
                            <FlopRankingList title="Livreurs" rankings={rankings.drivers.successRate.flop} icon={User} />
                        </CardContent>
                    </Card>
                </div>
            </DialogContent>
        </Dialog>
    );
}
