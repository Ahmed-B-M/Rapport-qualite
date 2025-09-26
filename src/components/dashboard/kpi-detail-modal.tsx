"use client";

import { useMemo } from 'react';
import { type Livraison, type StatistiquesAgregees, type ClassementMetrique } from '@/lib/definitions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ThumbsDown, Building2, Truck, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const CONFIG_METRIQUE: Record<ClassementMetrique, { titre: string; description: string; unite: string; libelleValeur: string; estTauxEchec?: boolean; meilleurSiEleve: boolean; }> = {
    tauxReussite: {
        titre: "Analyse du Taux d'Échec",
        description: "Détails des raisons d'échec et des entités les plus impactées.",
        unite: '%',
        libelleValeur: "Taux d'échec",
        estTauxEchec: true,
        meilleurSiEleve: false,
    },
    noteMoyenne: { 
        titre: "Analyse de la Note Moyenne",
        description: "Détails sur les entités avec les notes moyennes les plus basses.",
        unite: '/5',
        libelleValeur: "Note Moyenne",
        meilleurSiEleve: true,
    },
    tauxPonctualite: {
        titre: "Analyse de la Ponctualité",
        description: "Détails sur les entités avec les taux de ponctualité les plus bas.",
        unite: '%',
        libelleValeur: "Taux de ponctualité",
        meilleurSiEleve: true,
    },
    tauxForceSurSite: {
        titre: "Analyse 'Sur Place Forcé'",
        description: "Détails sur les entités avec les taux de 'sur place forcé' les plus élevés.",
        unite: '%',
        libelleValeur: "Taux 'sur place forcé'",
        meilleurSiEleve: false,
    },
    tauxForceSansContact: {
        titre: "Analyse 'Sans Contact Forcé'",
        description: "Détails sur les entités avec les taux de 'sans contact forcé' les plus élevés.",
        unite: '%',
        libelleValeur: "Taux 'sans contact forcé'",
        meilleurSiEleve: false,
    },
    tauxCompletionWeb: {
        titre: "Analyse 'Validation Web'",
        description: "Détails sur les entités avec les taux de 'validation web' les plus élevés.",
        unite: '%',
        libelleValeur: "Taux 'validation web'",
        meilleurSiEleve: false,
    },
};

const GraphiqueRaisonEchec = ({ donnees }: { donnees: Livraison[] }) => {
    const raisonsEchec = useMemo(() => {
        const raisons: Record<string, number> = {};
        donnees.forEach(d => {
            if (d.statut === 'Non livré' && d.raisonEchec) {
                raisons[d.raisonEchec] = (raisons[d.raisonEchec] || 0) + 1;
            }
        });
        return Object.entries(raisons)
            .map(([nom, nombre]) => ({ nom, nombre }))
            .sort((a, b) => b.nombre - a.nombre);
    }, [donnees]);

    if (raisonsEchec.length === 0) {
        return <p className="text-sm text-muted-foreground">Aucune raison d'échec enregistrée.</p>;
    }

    return (
        <ResponsiveContainer width="100%" height={200}>
            <BarChart data={raisonsEchec} layout="vertical" margin={{ top: 5, right: 20, left: 120, bottom: 5 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="nom" axisLine={false} tickLine={false} width={120} tick={{ fontSize: 11 }} />
                <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="nombre" name="Nombre" fill="hsl(var(--destructive))" barSize={20} radius={[0, 4, 4, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
};

const ListeClassementFlop = ({ titre, classements, metrique, icone: Icone }: { 
    titre: string; 
    classements: any[]; 
    metrique: ClassementMetrique;
    icone: React.ElementType 
}) => {
    
    const configMetrique = CONFIG_METRIQUE[metrique];

    const getValeur = (item: StatistiquesAgregees) => {
        if (configMetrique.estTauxEchec) return 100 - item.tauxReussite;
        return item[metrique as keyof StatistiquesAgregees] as number;
    }

    const getRecurrence = (item: any) => {
        switch (metrique) {
            case 'tauxReussite': return item.livraisonsRatees;
            case 'tauxPonctualite': return item.totalLivraisons - item.livraisonsAPoint;
            case 'tauxForceSurSite': return item.nombreForceSurSite;
            case 'tauxForceSansContact': return item.nombreForceSansContact;
            case 'tauxCompletionWeb': return item.nombreCompletionWeb;
            case 'noteMoyenne': return item.nombreNotes;
            default: return item.totalLivraisons;
        }
    }
    
    const libelleRecurrence = metrique === 'noteMoyenne' ? 'Nb Notes' : 'Nb Cas';

    return (
        <div>
            <h4 className="font-semibold flex items-center gap-2 mb-2"><Icone className="h-4 w-4" /> {titre}</h4>
            {classements.length > 0 ? (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nom</TableHead>
                            <TableHead className="text-right">{configMetrique.libelleValeur}</TableHead>
                            <TableHead className="text-right">{libelleRecurrence}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {classements.map(item => (
                            <TableRow key={item.nom}>
                                <TableCell className="font-medium truncate max-w-[150px] sm:max-w-xs">{item.nom}</TableCell>
                                <TableCell className={cn("text-right font-semibold", configMetrique.meilleurSiEleve ? "text-primary" : "text-destructive")}>
                                    {getValeur(item).toFixed(2)}{configMetrique.unite}
                                </TableCell>
                                <TableCell className="text-right">{getRecurrence(item)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            ) : (
                 <p className="text-sm text-muted-foreground pl-2">Aucun classement "flop" à afficher.</p>
            )}
        </div>
    );
};

export function KpiDetailModal({ metrique, onClose, donnees, classements }: {
    metrique: ClassementMetrique;
    onClose: () => void;
    donnees: Livraison[];
    classements: any;
}) {
    const config = CONFIG_METRIQUE[metrique];
    
    const classementsEntite = useMemo(() => ({
        depots: classements.depots[metrique]?.flop || [],
        transporteurs: classements.transporteurs[metrique]?.flop || [],
        chauffeurs: classements.chauffeurs[metrique]?.flop || [],
    }), [classements, metrique]);

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>{config.titre}</DialogTitle>
                    <DialogDescription>{config.description}</DialogDescription>
                </DialogHeader>
                <div className={cn("grid gap-6 py-4", config.estTauxEchec && "md:grid-cols-2")}>
                    {config.estTauxEchec && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Principales Raisons d'Échec</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <GraphiqueRaisonEchec donnees={donnees} />
                            </CardContent>
                        </Card>
                    )}
                    <Card>
                         <CardHeader>
                            <CardTitle className="flex items-center gap-2"><ThumbsDown /> Classements "Flop"</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <ListeClassementFlop titre="Dépôts" classements={classementsEntite.depots} metrique={metrique} icone={Building2} />
                            <ListeClassementFlop titre="Transporteurs" classements={classementsEntite.transporteurs} metrique={metrique} icone={Truck} />
                            <ListeClassementFlop titre="Livreurs" classements={classementsEntite.chauffeurs} metrique={metrique} icone={User} />
                        </CardContent>
                    </Card>
                </div>
            </DialogContent>
        </Dialog>
    );
}
