
"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Livraison, Objectifs } from '@/lib/definitions';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
  } from "@/components/ui/dialog"
import { Copy } from 'lucide-react';
import { useToast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"


interface TransporterSatisfactionProps {
    data: Livraison[];
    objectifs: Objectifs;
}

const RecurrenceByCategory = ({ deliveries }: { deliveries: Livraison[] }) => {
    const negativeComments = deliveries.filter(d => d.noteLivraison !== null && typeof d.noteLivraison !== 'undefined' && d.noteLivraison <= 3 && d.commentaireRetour);

    const categoryCounts = negativeComments.reduce((acc, d) => {
        const category = d.commentaireRetour!;
        if (!acc[category]) {
            acc[category] = { count: 0, transporters: {} };
        }
        acc[category].count++;
        const transporter = d.transporteur;
        acc[category].transporters[transporter] = (acc[category].transporters[transporter] || 0) + 1;
        return acc;
    }, {} as Record<string, { count: number; transporters: Record<string, number> }>);

    const sortedCategories = Object.entries(categoryCounts)
        .sort(([, a], [, b]) => b.count - a.count)
        .map(([category, data]) => ({
            category,
            ...data
        }));

    if (sortedCategories.length === 0) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle>Récurrence des Commentaires Négatifs par Catégorie</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Aucun commentaire négatif à analyser pour cette sélection.</p>
                </CardContent>
            </Card>
        )
    }

    const uniqueTransporters = [...new Set(negativeComments.map(d => d.transporteur))].sort();
    
    const totalsByTransporter = uniqueTransporters.reduce((acc, t) => {
        acc[t] = 0;
        return acc;
    }, {} as Record<string, number>);

    let grandTotal = 0;
    sortedCategories.forEach(({ transporters, count }) => {
        uniqueTransporters.forEach(t => {
            totalsByTransporter[t] += transporters[t] || 0;
        });
        grandTotal += count;
    });


    return (
        <Card>
            <CardHeader>
                <CardTitle>Récurrence des Commentaires Négatifs par Catégorie</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Catégorie</TableHead>
                            {uniqueTransporters.map(t => <TableHead key={t} className="text-center">{t}</TableHead>)}
                            <TableHead className="text-center">Total</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedCategories.map(({ category, count, transporters }) => (
                            <TableRow key={category}>
                                <TableCell>{category}</TableCell>
                                {uniqueTransporters.map(t => <TableCell key={t} className="text-center">{transporters[t] || ''}</TableCell>)}
                                <TableCell className="text-center font-bold">{count}</TableCell>
                            </TableRow>
                        ))}
                         <TableRow className="font-bold bg-muted">
                            <TableCell>Total</TableCell>
                            {uniqueTransporters.map(t => (
                                <TableCell key={t} className="text-center">{totalsByTransporter[t]}</TableCell>
                            ))}
                            <TableCell className="text-center">{grandTotal}</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};


const RecurrenceLowRatingsByTransporter = ({ deliveries, objectifs }: { deliveries: Livraison[]; objectifs: Objectifs }) => {
    const lowRatingDeliveries = deliveries.filter(d => typeof d.noteLivraison === 'number' && d.noteLivraison <= 3);

    const dataByDepot = lowRatingDeliveries.reduce((acc, d) => {
        const depot = d.depot;
        if (!acc[depot]) {
            acc[depot] = [];
        }
        acc[depot].push(d);
        return acc;
    }, {} as Record<string, Livraison[]>);

    const depotsWithLowRatings = Object.keys(dataByDepot).sort();

    if (depotsWithLowRatings.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Récurrence des Mauvaises Notes par Transporteur et Livreur</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Aucune mauvaise note à analyser pour cette sélection.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Récurrence des Mauvaises Notes (≤ 3) par Dépôt</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {depotsWithLowRatings.map(depot => {
                        const depotLowRatingDeliveries = dataByDepot[depot];

                        const lowRatingDataByTransporter = depotLowRatingDeliveries.reduce((acc, d) => {
                            const transporter = d.transporteur;
                            const driver = d.chauffeur;
                            if (!acc[transporter]) {
                                acc[transporter] = {};
                            }
                            if (!acc[transporter][driver]) {
                                acc[transporter][driver] = 0;
                            }
                            acc[transporter][driver]++;
                            return acc;
                        }, {} as Record<string, Record<string, number>>);

                        const transportersInDepot = Object.keys(lowRatingDataByTransporter).sort();

                        const avgRatings = transportersInDepot.reduce((acc, transporter) => {
                            const ratedDeliveriesInDepot = deliveries.filter(
                                d => d.depot === depot && d.transporteur === transporter && typeof d.noteLivraison === 'number'
                            );

                            if (ratedDeliveriesInDepot.length > 0) {
                                const total = ratedDeliveriesInDepot.reduce((sum, d) => sum + d.noteLivraison!, 0);
                                acc[transporter] = (total / ratedDeliveriesInDepot.length).toFixed(2);
                            } else {
                                acc[transporter] = "N/A";
                            }
                            return acc;
                        }, {} as Record<string, string>);

                        return (
                            <div key={depot}>
                                <h2 className="text-xl font-semibold mb-2 border-b pb-1">{depot}</h2>
                                {transportersInDepot.map(transporter => {
                                    const driverRatings = lowRatingDataByTransporter[transporter];
                                    const totalLowRatings = Object.values(driverRatings).reduce((sum, count) => sum + count, 0);
                                    const avgRating = parseFloat(avgRatings[transporter]);
                                    const isBelowObjective = !isNaN(avgRating) && avgRating < objectifs.noteMoyenne;

                                    return (
                                        <div key={transporter} className="mb-4">
                                            <h3 className="font-bold text-lg">{transporter} 
                                                <span className={`text-sm font-normal ${isBelowObjective ? 'text-red-500' : 'text-muted-foreground'}`}>
                                                    - Note moyenne (dépôt): {avgRatings[transporter]} / 5
                                                </span>
                                            </h3>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Livreur</TableHead>
                                                        <TableHead className="text-right">Nombre de mauvaises notes</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {Object.entries(driverRatings)
                                                        .sort(([, a], [, b]) => b - a)
                                                        .map(([driver, count]) => (
                                                            <TableRow key={driver}>
                                                                <TableCell>{driver}</TableCell>
                                                                <TableCell className="text-right">{count}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    <TableRow className="font-bold bg-muted">
                                                        <TableCell>Total</TableCell>
                                                        <TableCell className="text-right">{totalLowRatings}</TableCell>
                                                    </TableRow>
                                                </TableBody>
                                            </Table>
                                        </div>
                                    )
                                })}
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    );
}


export function TransporterSatisfaction({ data, objectifs }: TransporterSatisfactionProps) {
    const { toast } = useToast()
    const [selectedDepots, setSelectedDepots] = useState<string[]>([]);

    const depots = useMemo(() => Array.from(new Set(data.map(d => d.depot))).sort(), [data]);

    const filteredData = useMemo(() => {
        if (selectedDepots.length === 0) {
            return data;
        }
        return data.filter(d => selectedDepots.includes(d.depot));
    }, [data, selectedDepots]);

    const avgTransporterRatings = useMemo(() => {
        const transporterRatings = filteredData
            .filter(d => typeof d.noteLivraison === 'number')
            .reduce((acc, d) => {
                if (!acc[d.transporteur]) {
                    acc[d.transporteur] = { total: 0, count: 0 };
                }
                acc[d.transporteur].total += d.noteLivraison!;
                acc[d.transporteur].count++;
                return acc;
            }, {} as Record<string, { total: number, count: number }>);

        return Object.entries(transporterRatings)
            .map(([transporter, data]) => ({
                name: transporter,
                note: parseFloat((data.total / data.count).toFixed(2)),
            }))
            .sort((a, b) => b.note - a.note);
    }, [filteredData]);

    const generateEmailBody = () => {
        let body = `
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; margin: 0; padding: 0; background-color: #f4f4f4; }
            .container { max-width: 800px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); padding: 30px; }
            h1, h2, h3, h4 { color: #1a202c; font-weight: 600; }
            h1 { font-size: 24px; text-align: center; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; }
            h2 { font-size: 20px; margin-top: 30px; color: #2d3748; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;}
            h3 { font-size: 18px; margin-top: 25px; color: #4a5568; }
            h4 { font-size: 16px; margin-top: 20px; color: #718096; }
            p { color: #4a5568; line-height: 1.6; }
            table { border-collapse: collapse; width: 100%; margin-bottom: 20px; margin-top: 15px; }
            th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; font-size: 14px; }
            th { background-color: #f7fafc; font-weight: 600; color: #4a5568; }
            td.center, th.center { text-align: center; }
            .font-bold { font-weight: bold; }
            .summary-card { background-color: #f7fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px; border: 1px solid #e2e8f0; }
            .summary-title { font-size: 18px; font-weight: 600; margin-bottom: 15px; color: #2d3748; }
            .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
            .summary-item { font-size: 15px; color: #4a5568; }
            .total-row { background-color: #f7fafc; font-weight: bold; }
            .text-red { color: #e53e3e; }
        </style>
        <div class="container">
            <h1>Synthèse de la Satisfaction Transporteur</h1>
        `;
    
        const depotsToProcess = selectedDepots.length > 0 ? selectedDepots.map(d => ({ name: d, data: data.filter(item => item.depot === d) })) : depots.map(d => ({ name: d, data: data.filter(item => item.depot === d) }));
    
        const ratedDeliveries = depotsToProcess.flatMap(d => d.data).filter(i => typeof i.noteLivraison === 'number');
        const totalDeliveries = depotsToProcess.reduce((sum, d) => sum + d.data.length, 0);
        const totalLowRatings = ratedDeliveries.filter(i => i.noteLivraison! <= 3).length;
        const overallAvgRating = ratedDeliveries.length > 0 ? ratedDeliveries.reduce((sum, i) => sum + i.noteLivraison!, 0) / ratedDeliveries.length : 0;
        
        body += `
        <div class="summary-card">
            <div class="summary-title">Résumé Général (${selectedDepots.length > 0 ? selectedDepots.join(', ') : 'Tous les dépôts'})</div>
            <div class="summary-grid">
                <div class="summary-item"><strong>Nombre total de livraisons:</strong> ${totalDeliveries}</div>
                <div class="summary-item"><strong>Note moyenne globale:</strong> ${overallAvgRating.toFixed(2)} / 5</div>
                <div class="summary-item"><strong>Total des mauvaises notes (≤ 3):</strong> ${totalLowRatings}</div>
                <div class="summary-item"><strong>Taux de mauvaises notes:</strong> ${ratedDeliveries.length > 0 ? ((totalLowRatings / ratedDeliveries.length) * 100).toFixed(2) : 0}%</div>
            </div>
        </div>
        `;

        depotsToProcess.forEach(depot => {
            body += `<h2>Dépot: ${depot.name}</h2>`;
            const lowRatingDeliveries = depot.data.filter(d => typeof d.noteLivraison === 'number' && d.noteLivraison <= 3);
            const lowRatingDataByTransporter = lowRatingDeliveries.reduce((acc, d) => {
                const transporter = d.transporteur;
                const driver = d.chauffeur;
                if (!acc[transporter]) {
                    acc[transporter] = {};
                }
                if (!acc[transporter][driver]) {
                    acc[transporter][driver] = 0;
                }
                acc[transporter][driver]++;
                return acc;
            }, {} as Record<string, Record<string, number>>);

            const transportersWithLowRatings = Object.keys(lowRatingDataByTransporter).sort();

            if (transportersWithLowRatings.length > 0) {
                body += '<h3>Récurrence des Mauvaises Notes par Livreur</h3>';
                transportersWithLowRatings.forEach(transporter => {
                    const transporterDeliveriesInDepot = depot.data.filter(
                        d => d.transporteur === transporter && typeof d.noteLivraison === 'number'
                    );
                    let avgRatingDisplay = "";
                    if (transporterDeliveriesInDepot.length > 0) {
                        const totalRating = transporterDeliveriesInDepot.reduce((sum, d) => sum + d.noteLivraison!, 0);
                        const avgRating = (totalRating / transporterDeliveriesInDepot.length);
                        const isBelow = avgRating < objectifs.noteMoyenne;
                        avgRatingDisplay = ` - <i ${isBelow ? 'class="text-red"' : ''}>Note moyenne: ${avgRating.toFixed(2)} / 5</i>`;
                    }
                    
                    body += `<h4>Transporteur: ${transporter}${avgRatingDisplay}</h4>`;
                    body += '<table><thead><tr><th>Livreur</th><th class="center">Nombre de mauvaises notes</th></tr></thead><tbody>';
                    
                    const driverRatings = lowRatingDataByTransporter[transporter];
                    const totalLowRatingsForTransporter = Object.values(driverRatings).reduce((sum, count) => sum + count, 0);
                    
                    Object.entries(driverRatings)
                        .sort(([, a], [, b]) => b - a)
                        .forEach(([driver, count]) => {
                            body += `<tr><td>${driver}</td><td class="center">${count}</td></tr>`;
                        });
                    
                    body += `<tr class="total-row"><td><strong>Total</strong></td><td class="center"><strong>${totalLowRatingsForTransporter}</strong></td></tr>`;
                    body += '</tbody></table>';
                });
            } else {
                body += '<p>Aucune mauvaise note à signaler pour ce dépot.</p>';
            }
        });
        
        body += `</div>`;
        return body;
    };
    

    const handleCopyEmail = () => {
        const emailBody = generateEmailBody();
        navigator.clipboard.writeText(emailBody).then(() => {
            toast({
                title: "Email copié",
                description: "Le contenu de l'email a été copié dans le presse-papiers.",
              })
        }).catch(err => {
            console.error('Failed to copy email body: ', err);
            toast({
                title: "Erreur",
                description: "Impossible de copier le contenu de l'email.",
                variant: "destructive"
              })
        });
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <Select onValueChange={(value) => setSelectedDepots(value === 'all' ? [] : [value])} defaultValue="all">
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Tous les dépots" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tous les dépots</SelectItem>
                            {depots.map(depot => (
                                <SelectItem key={depot} value={depot}>{depot}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button>Générer Email de Synthèse</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl">
                        <DialogHeader>
                            <DialogTitle>Email de Synthèse</DialogTitle>
                            <DialogDescription>
                                Voici un aperçu de l'email de synthèse. Vous pouvez le copier et le coller dans votre client de messagerie.
                            </DialogDescription>
                        </DialogHeader>
                        <ScrollArea className="h-[60vh] mt-4">
                            <div dangerouslySetInnerHTML={{ __html: generateEmailBody() }} />
                        </ScrollArea>
                        <Button onClick={handleCopyEmail} className="mt-4">
                            <Copy className="mr-2 h-4 w-4" />
                            Copier le contenu
                        </Button>
                    </DialogContent>
                </Dialog>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Note Moyenne par Transporteur</CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={avgTransporterRatings} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis domain={[0, 5]} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="note" fill="#8884d8" name="Note moyenne" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <RecurrenceLowRatingsByTransporter deliveries={filteredData} objectifs={objectifs} />

            <RecurrenceByCategory deliveries={filteredData} />
        </div>
    );
}
