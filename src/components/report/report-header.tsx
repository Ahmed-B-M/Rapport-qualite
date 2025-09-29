
'use client';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ReportHeaderProps {
    typeRapport: 'hebdomadaire' | 'mensuel' | 'personnalise';
    depotSelectionne: string;
    plageDates: string;
}

export const ReportHeader = ({ typeRapport, depotSelectionne, plageDates }: ReportHeaderProps) => {
    const today = format(new Date(), "eeee dd MMMM yyyy", { locale: fr });
    const capitalizedTypeRapport = typeRapport.charAt(0).toUpperCase() + typeRapport.slice(1);

    return (
        <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold mb-2">Rapport de Performance {capitalizedTypeRapport}</h1>
            <p className="text-lg text-gray-600">
                Dépôt: <span className="font-semibold">{depotSelectionne === 'all' ? 'Tous' : depotSelectionne}</span>
            </p>
            <p className="text-md text-gray-500">{plageDates}</p>
            <p className="text-xs text-gray-400 mt-2">Généré le: {today}</p>
        </div>
    );
};
