"use client"

import { useMemo, useState } from 'react';
import { type Delivery } from '@/lib/definitions';
import { aggregateStats, getOverallStats } from '@/lib/data-processing';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, ArrowLeft, User, Star, ThumbsDown, MessageSquareQuote } from 'lucide-react';
import { StatCard } from '@/components/dashboard/stat-card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

type DriverStat = {
    name: string;
    failureRate: number;
    carrier: string;
} & ReturnType<typeof aggregateStats>[string];

type SortKey = 'name' | 'totalDeliveries' | 'averageRating' | 'punctualityRate' | 'failureRate' | 'forcedOnSiteRate' | 'forcedNoContactRate' | 'webCompletionRate' | 'ratingRate';

const CommentsList = ({ comments }: { comments: { comment: string, rating: number }[] }) => {
    if (comments.length === 0) {
        return (
            <div className="flex h-64 flex-col items-center justify-center text-center text-muted-foreground">
                <MessageSquareQuote className="h-10 w-10 mb-4" />
                <p className="font-semibold">Aucun commentaire trouvé pour ce livreur.</p>
            </div>
        )
    }
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg"><ThumbsDown className="h-5 w-5" /> Tous les commentaires</CardTitle>
                <CardDescription>{comments.length} commentaire{comments.length > 1 ? 's' : ''} reçu{comments.length > 1 ? 's' : ''}</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-80">
                    <div className="space-y-4 pr-4">
                    {comments.map((c, i) => (
                        <div key={i} className="p-3 border rounded-lg bg-muted/20">
                            <div className="flex justify-between items-start">
                                <p className="text-sm italic">"{c.comment}"</p>
                                <Badge variant={c.rating <= 3 ? "destructive": "default"}>
                                    {c.rating} <Star className="h-3 w-3 ml-1" />
                                </Badge>
                            </div>
                        </div>
                    ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
};

const DriverDetailView = ({ driver, driverData, onBack }: { driver: DriverStat, driverData: Delivery[], onBack: () => void}) => {
    const stats = useMemo(() => getOverallStats(driverData), [driverData]);
    const comments = useMemo(() => 
        driverData
            .filter(d => d.feedbackComment)
            .map(d => ({ comment: d.feedbackComment!, rating: d.deliveryRating! }))
            .reverse(), 
        [driverData]);

    return (
        <div className="space-y-6">
            <Button variant="outline" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" /> Retour à la liste</Button>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-3"><User className="h-8 w-8" /> {driver.name}</CardTitle>
                    <CardDescription>Transporteur : {driver.carrier}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        <StatCard title="Total Livraisons" value={`${stats.totalDeliveries}`} icon={User} />
                        <StatCard title="Note moyenne" value={`${stats.averageRating.toFixed(2)} / 5`} icon={Star} />
                        <StatCard title="Taux de ponctualité" value={`${stats.punctualityRate.toFixed(2)}%`} icon={Star} />
                        <StatCard title="Taux d'échec" value={`${(100 - stats.successRate).toFixed(2)}%`} icon={Star} />
                        <StatCard title="Taux de notation" value={`${stats.ratingRate.toFixed(2)}%`} icon={Star} />
                        <StatCard title="Sur place forcé" value={`${stats.forcedOnSiteRate.toFixed(2)}%`} icon={Star} />
                        <StatCard title="Sans contact forcé" value={`${stats.forcedNoContactRate.toFixed(2)}%`} icon={Star} />
                        <StatCard title="Validation Web" value={`${stats.webCompletionRate.toFixed(2)}%`} icon={Star} />
                    </div>
                </CardContent>
            </Card>
            <CommentsList comments={comments} />
        </div>
    );
};


export function DriverAnalytics({ data }: { data: Delivery[] }) {
    const [filter, setFilter] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'totalDeliveries', direction: 'desc' });
    const [selectedDriver, setSelectedDriver] = useState<DriverStat | null>(null);

    const driverStats: DriverStat[] = useMemo(() => {
        const stats = aggregateStats(data, 'driver');
        return Object.entries(stats).map(([name, stat]) => ({ 
            name, 
            ...stat, 
            failureRate: 100 - stat.successRate,
            carrier: data.find(d => d.driver === name)?.carrier || 'Inconnu' 
        }));
    }, [data]);

    const sortedAndFilteredStats = useMemo(() => {
        let sortableItems = [...driverStats].filter(stat => stat.name.toLowerCase().includes(filter.toLowerCase()));

        sortableItems.sort((a, b) => {
            const valA = a[sortConfig.key];
            const valB = b[sortConfig.key];

            if (valA < valB) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (valA > valB) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });

        return sortableItems;
    }, [driverStats, filter, sortConfig]);
    
    const requestSort = (key: SortKey) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: SortKey) => {
        if (sortConfig.key !== key) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />;
        return sortConfig.direction === 'asc' ? '▲' : '▼';
    }

    if (selectedDriver) {
        return (
            <DriverDetailView 
                driver={selectedDriver} 
                driverData={data.filter(d => d.driver === selectedDriver.name)}
                onBack={() => setSelectedDriver(null)} 
            />
        )
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>Performance des livreurs</CardTitle>
                    <Input 
                        placeholder="Filtrer les livreurs..." 
                        className="max-w-sm"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    />
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead><Button variant="ghost" onClick={() => requestSort('name')}>Livreur {getSortIcon('name')}</Button></TableHead>
                            <TableHead>Transporteur</TableHead>
                            <TableHead className="text-right"><Button variant="ghost" onClick={() => requestSort('totalDeliveries')}>Total {getSortIcon('totalDeliveries')}</Button></TableHead>
                            <TableHead className="text-right"><Button variant="ghost" onClick={() => requestSort('averageRating')}>Note moy. {getSortIcon('averageRating')}</Button></TableHead>
                            <TableHead className="text-right"><Button variant="ghost" onClick={() => requestSort('punctualityRate')}>Ponctualité {getSortIcon('punctualityRate')}</Button></TableHead>
                            <TableHead className="text-right"><Button variant="ghost" onClick={() => requestSort('failureRate')}>Échec % {getSortIcon('failureRate')}</Button></TableHead>
                            <TableHead className="text-right"><Button variant="ghost" onClick={() => requestSort('forcedOnSiteRate')}>S.P. forcé {getSortIcon('forcedOnSiteRate')}</Button></TableHead>
                            <TableHead className="text-right"><Button variant="ghost" onClick={() => requestSort('forcedNoContactRate')}>S.C. forcé {getSortIcon('forcedNoContactRate')}</Button></TableHead>
                            <TableHead className="text-right"><Button variant="ghost" onClick={() => requestSort('webCompletionRate')}>Val. Web {getSortIcon('webCompletionRate')}</Button></TableHead>
                            <TableHead className="text-right"><Button variant="ghost" onClick={() => requestSort('ratingRate')}>Noté % {getSortIcon('ratingRate')}</Button></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedAndFilteredStats.map((stat) => (
                            <TableRow key={stat.name} onClick={() => setSelectedDriver(stat)} className="cursor-pointer">
                                <TableCell className="font-medium">{stat.name}</TableCell>
                                <TableCell className="text-muted-foreground">{stat.carrier}</TableCell>
                                <TableCell className="text-right">{stat.totalDeliveries}</TableCell>
                                <TableCell className="text-right">{stat.averageRating > 0 ? stat.averageRating.toFixed(2) : 'N/A'}</TableCell>
                                <TableCell className="text-right">{stat.punctualityRate.toFixed(2)}%</TableCell>
                                <TableCell className="text-right">{stat.failureRate.toFixed(2)}%</TableCell>
                                <TableCell className="text-right">{stat.forcedOnSiteRate.toFixed(2)}%</TableCell>
                                <TableCell className="text-right">{stat.forcedNoContactRate.toFixed(2)}%</TableCell>
                                <TableCell className="text-right">{stat.webCompletionRate.toFixed(2)}%</TableCell>
                                <TableCell className="text-right">{stat.ratingRate.toFixed(2)}%</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
