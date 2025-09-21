

'use client';

import { useState, useMemo } from 'react';
import { GlobalPerformance } from './global-performance';
import { type Livraison } from '@/lib/definitions';
import { filtrerDonneesParDepot } from '@/lib/analysis';

interface ApercuProps {
  donnees: Livraison[];
}

export function Overview({ donnees }: ApercuProps) {
  const [depotActif, setDepotActif] = useState<string>('all');

  const depotsUniques = useMemo(() => {
    const depots = new Set(donnees.map(d => d.depot));
    return ['all', ...Array.from(depots).sort()];
  }, [donnees]);

  const donneesDepot = useMemo(() => filtrerDonneesParDepot(donnees, depotActif), [donnees, depotActif]);

  return (
    <div className="space-y-4">
      <GlobalPerformance 
        data={donneesDepot} 
        depotsUniques={depotsUniques}
        depotActif={depotActif}
        setDepotActif={setDepotActif}
      />
    </div>
  );
}
