
'use client';

import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ReferenceLine, Line } from 'recharts';

interface TrendChartProps {
    data: any[];
    lineKey: string;
    yAxisLabel: string;
    yAxisId?: "left" | "right";
    color: string;
    objective?: number;
    domain: [number, number];
    height?: number;
    fontSize?: number;
}

export function TrendChart({ 
    data, 
    lineKey, 
    yAxisLabel, 
    yAxisId = "left", 
    color, 
    objective, 
    domain,
    height = 300,
    fontSize = 12
}: TrendChartProps) {
    return (
        <ResponsiveContainer width="100%" height={height}>
            <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: fontSize }} />
                <YAxis 
                    yAxisId={yAxisId} 
                    orientation={yAxisId} 
                    stroke={color} 
                    tick={{ fontSize: fontSize - 2 }}
                    domain={domain}
                    allowDataOverflow={true}
                    label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', offset: 0, style: { textAnchor: 'middle', fill: color, fontSize: fontSize } }} 
                />
                <Tooltip contentStyle={{ fontSize: fontSize }} />
                <Legend wrapperStyle={{ fontSize: fontSize }} />
                {objective !== undefined && <ReferenceLine y={objective} yAxisId={yAxisId} label={{ value: 'Objectif', position: 'insideTopRight', fontSize: fontSize }} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />}
                <Line yAxisId={yAxisId} type="monotone" dataKey={lineKey} name={yAxisLabel} stroke={color} dot={false} />
            </LineChart>
        </ResponsiveContainer>
    );
};
