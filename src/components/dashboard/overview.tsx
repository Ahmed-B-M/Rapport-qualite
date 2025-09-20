
'use client';

import { useState, useMemo } from 'react';
import { Truck, Users, Package, Star, Building, TrendingUp, TrendingDown, ArrowRight, Timer, Percent, Link2Off, UserX } from 'lucide-react';
import { StatCard } from './stat-card';
import { DriverAnalytics } from './driver-analytics';
import { CarrierAnalytics } from './carrier-analytics';
import { DepotAnalytics } from './depot-analytics';
import { CustomerSatisfaction } from './customer-satisfaction';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type Delivery } from '@/lib/definitions';
import { processGlobalData, filterDataByDepot, filterDataByPeriod } from '@/lib/data-processing';

interface OverviewProps {
  data: Delivery[];
}

export function Overview({ data }: OverviewProps) {
  const [activeDepot, setActiveDepot] = useState<string>('all');
  const [activePeriod, setActivePeriod] = useState<string>('7d'); // e.g., '1d', '7d', '30d'

  // Extract unique depots from data for the filter dropdown
  const uniqueDepots = useMemo(() => {
    const depots = new Set(data.map(d => d.depot));
    return Array.from(depots).sort();
  }, [data]);

  // 1. Filter by period first
  const periodData = filterDataByPeriod(data, activePeriod);
  const previousPeriodData = filterDataByPeriod(data, activePeriod, true);

  // 2. Then filter by depot
  const depotData = filterDataByDepot(periodData, activeDepot);
  const previousDepotData = filterDataByDepot(previousPeriodData, activeDepot);

  // 3. Process the filtered data
  const currentStats = processGlobalData(depotData);
  const previousStats = processGlobalData(previousDepotData);

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
          value={`${currentStats.successRate.toFixed(1)}%`}
          description="Livraisons réussies"
          icon={<TrendingUp className="text-green-500" />}
          previousValue={previousStats.successRate}
          trendDirection="up"
        />
        <StatCard
          title="Livraisons échouées"
          value={currentStats.failedDeliveries}
          description="Retours et échecs"
          icon={<TrendingDown className="text-red-500" />}
          previousValue={previousStats.failedDeliveries}
          trendDirection="down"
        />
         <StatCard
          title="Satisfaction Client"
          value={currentStats.averageRating.toFixed(2)}
          description="Note moyenne sur 5"
          icon={<Star className="text-yellow-500" />}
          previousValue={previousStats.averageRating}
          trendDirection="up"
        />
      </div>
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Ponctualité"
          value={`${currentStats.punctualityRate.toFixed(1)}%`}
          description="Livraisons à l'heure (fenêtre de +/- 15min)"
          icon={<Timer />}
          previousValue={previousStats.punctualityRate}
          trendDirection="up"
        />
        <StatCard
          title="Taux de Notation"
          value={`${currentStats.ratingRate.toFixed(1)}%`}
          description="Pourcentage de livraisons notées"
          icon={<Percent />}
          previousValue={previousStats.ratingRate}
          trendDirection="up"
        />
        <StatCard
          title="'Sans Contact' Forcé"
          value={`${currentStats.forcedNoContactRate.toFixed(1)}%`}
          description="Utilisation de la complétion forcée sans contact"
          icon={<UserX />}
          previousValue={previousStats.forcedNoContactRate}
          trendDirection="down"
        />
        <StatCard
          title="'Validation Web'"
          value={`${currentStats.webCompletionRate.toFixed(1)}%`}
          description="Utilisation de la validation par le web"
          icon={<Link2Off />}
          previousValue={previousStats.webCompletionRate}
          trendDirection="down"
        />
      </div>

      {/* Pass filtered data to children components */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-full lg:col-span-4">
          <DriverAnalytics data={depotData} />
        </div>
        <div className="col-span-full lg:col-span-3">
          <CarrierAnalytics data={depotData} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-full lg:col-span-3">
          <DepotAnalytics data={depotData} />
        </div>
        <div className="col-span-full lg:col-span-4">
          <CustomerSatisfaction data={depotData} />
        </div>
      </div>
    </div>
  );
}
