
'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList, CartesianGrid } from 'recharts';

interface FeedbackChartProps {
    data: { categorie: string, nombre: number }[];
}

export const FeedbackChart = ({ data }: FeedbackChartProps) => {
    if (!data || data.length === 0) {
        return <div className="text-center text-sm text-muted-foreground">Aucun retour client à analyser pour cette sélection.</div>;
    }

    return (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="categorie" tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="nombre" name="Nombre de mentions" fill="hsl(var(--primary))">
                    <LabelList dataKey="nombre" position="right" />
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};
