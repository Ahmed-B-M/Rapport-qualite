
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type StatistiquesAgregees } from '@/lib/definitions';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList, CartesianGrid } from 'recharts';

interface TransporteurPerformanceChartProps {
    data: (StatistiquesAgregees & { nom: string })[];
}

export const TransporteurPerformanceChart = ({ data }: TransporteurPerformanceChartProps) => {
    
    const chartData = [
        { name: 'Taux de Succès', kpi: 'tauxReussite' },
        { name: 'Ponctualité', kpi: 'tauxPonctualite' }
    ];

    const noteMoyenneData = data.map(d => ({
        nom: d.nom,
        valeur: d.noteMoyenne || 0
    }));

    return (
        <div className="grid md:grid-cols-3 gap-6">
             <Card>
                <CardHeader>
                    <CardTitle className="text-base">Note Moyenne / Transporteur</CardTitle>
                </CardHeader>
                <CardContent>
                     <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={noteMoyenneData} layout="vertical" margin={{ top: 5, right: 20, left: 50, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} />
                            <YAxis type="category" dataKey="nom" width={50} tick={{ fontSize: 12 }} />
                            <Tooltip formatter={(value: number) => `${value.toFixed(2)}/5`} />
                            <Bar dataKey="valeur" name="Note Moyenne" fill="hsl(var(--primary))" barSize={20}>
                                <LabelList dataKey="valeur" position="right" formatter={(value: number) => value.toFixed(2)} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
             </Card>

            {chartData.map(chart => (
                 <Card key={chart.name}>
                    <CardHeader>
                        <CardTitle className="text-base">{chart.name} / Transporteur</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                             <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 50, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" domain={[0, 100]} unit="%" />
                                <YAxis type="category" dataKey="nom" width={50} tick={{ fontSize: 12 }}/>
                                <Tooltip formatter={(value: number) => `${value.toFixed(2)}%`} />
                                <Bar dataKey={chart.kpi} name={chart.name} fill="hsl(var(--primary))" barSize={20}>
                                    <LabelList dataKey={chart.kpi} position="right" formatter={(value: number) => `${value.toFixed(2)}%`} />
                                 </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
