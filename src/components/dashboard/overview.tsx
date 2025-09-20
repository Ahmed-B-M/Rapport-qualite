
'use client';

import { useState } from 'react';
import { Truck, Users, Package, Star, Building, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { StatCard } from './stat-card';
import { DriverAnalytics } from './driver-analytics';
import { CarrierAnalytics } from './carrier-analytics';
import { DepotAnalytics } from './depot-analytics';
import { CustomerSatisfaction } from './customer-satisfaction';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Delivery } from '@/lib/definitions';
import { processGlobalData, filterDataByDepot, filterDataByPeriod } from '@/lib/data-processing';

interface OverviewProps {
  data: Delivery[];
}

type Depot = 'all' | 'VLG' | 'Vitry'; // This could be dynamic based on your data

export function Overview({ data }: OverviewProps) {
  const [activeDepot, setActiveDepot] = useState<Depot>('all');
  const [activePeriod, setActivePeriod] = useState<string>('7d'); // e.g., '1d', '7d', '30d'

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
          <Select onValueChange={(value: Depot) => setActiveDepot(value)} defaultValue="all">
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner un dépôt" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les dépôts</SelectItem>
              <SelectItem value="VLG">VLG</SelectItem>
              <SelectItem value="Vitry">Vitry</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
          title="Total des livraisons"
          value={currentStats.totalDeliveries}
          description="Toutes tournées confondues"
          icon={<Package />}
          previousValue={previousStats.totalDeliveries}
          trendDirection="up"
        />
        <StatCard
          title="Satisfaction Client"
          value={currentStats.averageRating.toFixed(2)}
          description="Note moyenne"
          icon={<Star className="text-yellow-500" />}
          previousValue={previousStats.averageRating}
          trendDirection="up"
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
