
'use client';

import { EntiteClassement } from "@/lib/definitions";

interface RankingsProps {
    title: string;
    top: EntiteClassement[];
    flop: EntiteClassement[];
    unit?: string;
}

const RankingList = ({ title, items, unit = '' }: { title: string, items: EntiteClassement[], unit?: string }) => {
    return (
        <div>
            <h5 className="font-medium text-md mb-2">{title}</h5>
            <ul className="list-decimal list-inside space-y-1 text-sm">
                {items.map((item, index) => (
                    <li key={index}>
                        <span className="font-semibold">{item.nom}</span>: {item.valeur.toFixed(2)}{unit}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export const Rankings = ({ title, top, flop, unit }: RankingsProps) => {
    return (
        <div>
            <h4 className="font-semibold text-lg mb-3">{title}</h4>
            <div className="grid grid-cols-2 gap-6">
                <RankingList title="Top 3" items={top} unit={unit} />
                <RankingList title="Flop 3" items={flop} unit={unit} />
            </div>
        </div>
    );
};
