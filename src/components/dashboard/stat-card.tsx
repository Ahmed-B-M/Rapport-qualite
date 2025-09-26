
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowDown, ArrowRight, ArrowUp } from 'lucide-react';

interface CarteStatistiqueProps {
  titre: string;
  valeur: string | number;
  icone: React.ReactNode;
  description?: string;
  valeurPrecedente?: number;
  directionTendance?: 'up' | 'down'; // up signifie que plus haut c'est mieux, down signifie que plus bas c'est mieux
}

const IndicateurTendance = ({ valeur, valeurPrecedente, direction }: { valeur: string | number, valeurPrecedente: number, direction: 'up' | 'down' }) => {
  const valeurNumerique = typeof valeur === 'string' ? parseFloat(valeur.replace('%','')) : valeur;
  
  if (isNaN(valeurNumerique) || isNaN(valeurPrecedente) || valeurPrecedente === 0) {
      return <span className="flex items-center text-sm text-gray-500"><ArrowRight className="h-4 w-4 mr-1" /> --</span>;
  }

  if (valeurNumerique > valeurPrecedente) {
    const changementPourcentage = (((valeurNumerique - valeurPrecedente) / valeurPrecedente) * 100).toFixed(1);
    const couleur = direction === 'up' ? 'text-green-500' : 'text-red-500';
    return <span className={`flex items-center text-sm ${couleur}`}><ArrowUp className="h-4 w-4 mr-1" /> {changementPourcentage}%</span>;
  }
  if (valeurNumerique < valeurPrecedente) {
    const changementPourcentage = (((valeurPrecedente - valeurNumerique) / valeurPrecedente) * 100).toFixed(1);
    const couleur = direction === 'up' ? 'text-red-500' : 'text-green-500';
    return <span className={`flex items-center text-sm ${couleur}`}><ArrowDown className="h-4 w-4 mr-1" /> {changementPourcentage}%</span>;
  }
  return <span className="flex items-center text-sm text-gray-500"><ArrowRight className="h-4 w-4 mr-1" /> 0.0%</span>;
};


export const StatCard: React.FC<CarteStatistiqueProps> = ({ titre, valeur, icone, description, valeurPrecedente, directionTendance }) => {
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{titre}</CardTitle>
        {icone}
      </CardHeader>
      <CardContent>
        <div className="text-4xl font-bold">{valeur}</div>
        <div className="flex justify-between items-center">
          <p className="text-xs text-muted-foreground">{description}</p>
          {valeurPrecedente !== undefined && directionTendance && (
            <IndicateurTendance valeur={valeur} valeurPrecedente={valeurPrecedente} direction={directionTendance} />
          )}
        </div>
      </CardContent>
    </Card>
  );
};
