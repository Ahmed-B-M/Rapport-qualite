
'use client';

import { KpiCard } from "./KpiCard";

interface KpiData {
    title: string;
    value: number | undefined;
    target: number;
    isRate?: boolean;
    higherIsBetter?: boolean;
}

interface KpiGridProps {
    kpis: KpiData[];
}

export const KpiGrid = ({ kpis }: KpiGridProps) => {
    return (
        <div className="grid grid-cols-4 gap-4">
            {kpis.map(kpi => (
                <KpiCard key={kpi.title} {...kpi} />
            ))}
        </div>
    );
};
