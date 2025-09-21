
'use client';

import { useState, useMemo } from 'react';
import { Truck, Users, Package, Star, Building, TrendingUp, TrendingDown, ArrowRight, Timer, Percent, Link2Off, UserX, Smile } from 'lucide-react';
import { StatCard } from './stat-card';
import { GlobalPerformance } from './global-performance';
import { CustomerSatisfaction } from './customer-satisfaction';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type Delivery } from '@/lib/definitions';
import { getOverallStats, filterDataByDepot, filterDataByPeriod } from '@/lib/analysis';

interface OverviewProps {
  data: Delivery[];
}

export function Overview({ data }: OverviewProps) {
  const [activeDepot, setActiveDepot] = useState<string>('all');
  const [activePeriod, setActivePeriod] = useState<string>('7d');

  const uniqueDepots = useMemo(() => {
    const depots = new Set(data.map(d => d.depot));
    return Array.from(depots).sort();
  }, [data]);

  const periodData = useMemo(() => filterDataByPeriod(data, activePeriod), [data, activePeriod]);
  const previousPeriodData = useMemo(() => filterDataByPeriod(data, activePeriod, true), [data, activePeriod]);

  const depotData = useMemo(() => filterDataByDepot(periodData, activeDepot), [periodData, activeDepot]);
  const previousDepotData = useMemo(() => filterDataByDepot(previousPeriodData, activeDepot), [previousPeriodData, activeDepot]);

  const currentStats = useMemo(() => getOverallStats(depotData), [depotData]);
  const previousStats = useMemo(() => getOverallStats(previousDepotData), [previousDepotData]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Button variant={activePeriod === '1d' ? 'default' : 'outline'} onClick={() => setActivePeriod('1d')}>Aujourd'hui</Button>
          <Button variant={activePeriod === '7d' ? 'default' : 'outline'} onClick={() => setActivePeriod('7d')}>7 jours</Button>
          <Button variant={activePeriod === '30d' ? 'default' : 'outline'} onClick={() => setActivePeriod('30d')}>30 jours</Button>
        </div>
        <div className="w-48">
          <Select onValueChange={(value: string) => setActiveDepot(value)} defaultValue="all">
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner un dépôt" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les dépôts</SelectItem>
              {uniqueDepots.map(depot => (
                <SelectItem key={depot} value={depot}>{depot}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Livraisons"
          value={currentStats.totalDeliveries}
          description="Nombre total de livraisons analysées"
          icon={<Package />}
          previousValue={previousStats.totalDeliveries}
          trendDirection="up"
        />
        <StatCard
          title="Taux de succès"
          value={`${currentStats.successRate.toFixed(2)}%`}
          description="Livraisons réussies"
          icon={<TrendingUp className="text-green-500" />}
          previousValue={previousStats.successRate}
          trendDirection="up"
        />
        <StatCard
          title="Note des Commentaires"
          value={`${currentStats.averageSentiment.toFixed(2)}/10`}
          description="Note moyenne des commentaires"
          icon={<Smile className="text-blue-500" />}
          previousValue={previousStats.averageSentiment}
          trendDirection="up"
        />
         <StatCard
          title="Note moyenne"
          value={currentStats.averageRating ? currentStats.averageRating.toFixed(2) : 'N/A'}
          description="Note moyenne sur 5"
          icon={<Star className="text-yellow-500" />}
          previousValue={previousStats.averageRating}
          trendDirection="up"
        />
      </div>
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Ponctualité"
          value={`${currentStats.punctualityRate.toFixed(2)}%`}
          description="Livraisons à l'heure"
          icon={<Timer />}
          previousValue={previousStats.punctualityRate}
          trendDirection="up"
        />
        <StatCard
          title="Taux de Notation"
          value={`${currentStats.ratingRate.toFixed(2)}%`}
          description="Pourcentage de livraisons notées"
          icon={<Percent />}
          previousValue={previousStats.ratingRate}
          trendDirection="up"
        />
        <StatCard
          title="'Sans Contact' Forcé"
          value={`${currentStats.forcedNoContactRate.toFixed(2)}%`}
          description="Complétion forcée sans contact"
          icon={<UserX />}
          previousValue={previousStats.forcedNoContactRate}
          trendDirection="down"
        />
        <StatCard
          title="'Validation Web'"
          value={`${currentStats.webCompletionRate.toFixed(2)}%`}
          description="Utilisation de la validation web"
          icon={<Link2Off />}
          previousValue={previousStats.webCompletionRate}
          trendDirection="down"
        />
      </div>

      <div className="grid gap-4 mt-4 lg:grid-cols-7">
        <div className="lg:col-span-4">
          <GlobalPerformance data={depotData} />
        </div>
        <div className="lg:col-span-3">
          <CustomerSatisfaction data={depotData} />
        </div>
      </div>
    </div>
  );
}
