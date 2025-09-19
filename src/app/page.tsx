"use client";

import { useState } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { type Delivery } from "@/lib/definitions";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { FileUploader } from "@/components/dashboard/file-uploader";
import { Overview } from "@/components/dashboard/overview";
import { DepotAnalytics } from "@/components/dashboard/depot-analytics";
import { WarehouseAnalytics } from "@/components/dashboard/warehouse-analytics";
import { CarrierAnalytics } from "@/components/dashboard/carrier-analytics";
import { DriverAnalytics } from "@/components/dashboard/driver-analytics";
import { CustomerSatisfaction } from "@/components/dashboard/customer-satisfaction";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const [data, setData] = useState<Delivery[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState("overview");

  const handleDataUploaded = (processedData: Delivery[], error?: string) => {
    if (error) {
      setError(error);
      setData(null);
    } else {
      setData(processedData);
      setError(null);
    }
    setLoading(false);
  };
  
  const handleReset = () => {
    setData(null);
    setError(null);
    setActiveView("overview");
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Traitement de vos données...</p>
        </div>
      );
    }

    if (error) {
      return (
        <Alert variant="destructive" className="max-w-lg mx-auto">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erreur lors du traitement du fichier</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      );
    }

    if (!data) {
      return <FileUploader onDataUploaded={handleDataUploaded} setLoading={setLoading} />;
    }

    switch (activeView) {
      case "overview":
        return <Overview data={data} />;
      case "depots":
        return <DepotAnalytics data={data} />;
      case "warehouses":
        return <WarehouseAnalytics data={data} />;
      case "carriers":
        return <CarrierAnalytics data={data} />;
      case "drivers":
        return <DriverAnalytics data={data} />;
      case "satisfaction":
        return <CustomerSatisfaction data={data} />;
      default:
        return <Overview data={data} />;
    }
  };

  return (
    <SidebarProvider>
      <DashboardSidebar activeView={activeView} setActiveView={setActiveView} />
      <SidebarInset>
        <div className="p-4 sm:p-6 lg:p-8">
            <header className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold font-headline text-primary">Tableau de Bord Carrefour</h1>
                    <p className="text-muted-foreground">Téléchargez et analysez les données sur les performances de vos livraisons.</p>
                </div>
                {data && (
                    <Button variant="outline" onClick={handleReset}>Télécharger un nouveau fichier</Button>
                )}
            </header>
            {renderContent()}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
