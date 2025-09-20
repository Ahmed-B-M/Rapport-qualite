
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, CheckCircle2, Star, Truck, ShieldX } from "lucide-react";
import { StatCard } from "./stat-card";

interface GlobalPerformanceProps {
  kpis: {
    totalDeliveries: number;
    satisfactionRate: number;
    unassignedDriversRate: number;
    knownDriversRate: number;
    problematicDeliveriesRate: number;
  } | null;
  loading: boolean;
}

const GlobalPerformance = ({ kpis, loading }: GlobalPerformanceProps) => {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (!kpis) {
    return null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <StatCard
        title="Total des livraisons"
        value={kpis.totalDeliveries.toString()}
        icon={Truck}
        description="Nombre total de livraisons analysées"
      />
      <StatCard
        title="Taux de satisfaction"
        value={`${kpis.satisfactionRate.toFixed(1)}%`}
        valueAsNumber={kpis.satisfactionRate}
        icon={Star}
        description="Basé sur les retours clients"
        thresholds={{ bad: 80, medium: 90, good: 100 }}
        higherIsBetter={true}
      />
      <StatCard
        title="Taux de problèmes"
        value={`${kpis.problematicDeliveriesRate.toFixed(1)}%`}
        valueAsNumber={kpis.problematicDeliveriesRate}
        icon={ShieldX}
        description="Livraisons en échec, en retard ou mal notées"
        thresholds={{ bad: 10, medium: 5, good: 0 }}
        higherIsBetter={false}
      />
      <StatCard
        title="Livreurs assignés"
        value={`${kpis.knownDriversRate.toFixed(1)}%`}
        valueAsNumber={kpis.knownDriversRate}
        icon={CheckCircle2}
        description="Pourcentage de livreurs identifiés"
        thresholds={{ bad: 90, medium: 95, good: 100 }}
        higherIsBetter={true}
      />
      <StatCard
        title="Livreurs non-assignés"
        value={`${kpis.unassignedDriversRate.toFixed(1)}%`}
        valueAsNumber={kpis.unassignedDriversRate}
        icon={AlertTriangle}
        description="Livreurs sans transporteur connu"
        thresholds={{ bad: 10, medium: 5, good: 0 }}
        higherIsBetter={false}
      />
    </div>
  );
};

export default GlobalPerformance;
