"use client";

import { useState, useMemo } from "react";
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
import { ReportDisplay } from "@/components/dashboard/report-display";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertTriangle, Settings, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";


export type Objectives = {
    averageRating: number;
    punctualityRate: number;
    failureRate: number;
    forcedOnSiteRate: number;
    forcedNoContactRate: number;
    webCompletionRate: number;
};

export default function DashboardPage() {
  const [data, setData] = useState<Delivery[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState("overview");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [excludeMagasin, setExcludeMagasin] = useState(false);
  const [objectives, setObjectives] = useState<Objectives>({
    averageRating: 4.8,
    punctualityRate: 95,
    failureRate: 1,
    forcedOnSiteRate: 10,
    forcedNoContactRate: 10,
    webCompletionRate: 1,
  });

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
    setIsReportOpen(false);
  };

  const handleSaveSettings = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newObjectives = {
        averageRating: parseFloat(formData.get("averageRating") as string),
        punctualityRate: parseFloat(formData.get("punctualityRate") as string),
        failureRate: parseFloat(formData.get("failureRate") as string),
        forcedOnSiteRate: parseFloat(formData.get("forcedOnSiteRate") as string),
        forcedNoContactRate: parseFloat(formData.get("forcedNoContactRate") as string),
        webCompletionRate: parseFloat(formData.get("webCompletionRate") as string),
    };
    setObjectives(newObjectives);
    setIsSettingsOpen(false);
  };

  const filteredData = useMemo(() => {
    if (!data) return null;
    if (excludeMagasin) {
      return data.filter(d => d.depot !== 'Magasin');
    }
    return data;
  }, [data, excludeMagasin]);

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

    if (!filteredData) {
      return <FileUploader onDataUploaded={handleDataUploaded} setLoading={setLoading} />;
    }

    if (isReportOpen) {
        return <ReportDisplay data={filteredData} onBack={() => setIsReportOpen(false)} storesExcluded={excludeMagasin} />;
    }

    switch (activeView) {
      case "overview":
        return <Overview data={filteredData} objectives={objectives} setActiveView={setActiveView} />;
      case "depots":
        return <DepotAnalytics data={filteredData} objectives={objectives} />;
      case "warehouses":
        return <WarehouseAnalytics data={filteredData} />;
      case "carriers":
        return <CarrierAnalytics data={filteredData} objectives={objectives} />;
      case "drivers":
        return <DriverAnalytics data={filteredData} objectives={objectives} />;
      case "satisfaction":
        return <CustomerSatisfaction data={filteredData} objectives={objectives} />;
      default:
        return <Overview data={filteredData} objectives={objectives} setActiveView={setActiveView} />;
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
                <div className="flex items-center gap-4">
                    {data && (
                      <>
                        <div className="flex items-center space-x-2">
                          <Switch id="exclude-magasin" checked={excludeMagasin} onCheckedChange={setExcludeMagasin} />
                          <Label htmlFor="exclude-magasin">Exclure Magasin</Label>
                        </div>
                         <Button variant="outline" onClick={() => setIsReportOpen(true)}>
                            <FileText className="mr-2 h-4 w-4" />
                            Générer un rapport
                        </Button>
                        <Button variant="outline" onClick={handleReset}>Nouveau fichier</Button>
                      </>
                    )}
                     <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)}>
                        <Settings />
                    </Button>
                </div>
            </header>
            {renderContent()}
        </div>
      </SidebarInset>
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Définir les objectifs</DialogTitle>
                  <DialogDescription>
                      Ajustez les objectifs pour les métriques clés. Ces valeurs seront utilisées pour l'analyse des performances.
                  </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSaveSettings}>
                  <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="averageRating" className="text-right">Note moyenne</Label>
                          <Input id="averageRating" name="averageRating" type="number" step="0.1" defaultValue={objectives.averageRating} className="col-span-3" />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="punctualityRate" className="text-right">Ponctualité (%)</Label>
                          <Input id="punctualityRate" name="punctualityRate" type="number" step="1" defaultValue={objectives.punctualityRate} className="col-span-3" />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="failureRate" className="text-right">Taux d'échec (% max)</Label>
                          <Input id="failureRate" name="failureRate" type="number" step="0.5" defaultValue={objectives.failureRate} className="col-span-3" />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="forcedOnSiteRate" className="text-right">Sur place forcé (% max)</Label>
                          <Input id="forcedOnSiteRate" name="forcedOnSiteRate" type="number" step="1" defaultValue={objectives.forcedOnSiteRate} className="col-span-3" />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="forcedNoContactRate" className="text-right">Sans contact forcé (% max)</Label>
                          <Input id="forcedNoContactRate" name="forcedNoContactRate" type="number" step="1" defaultValue={objectives.forcedNoContactRate} className="col-span-3" />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="webCompletionRate" className="text-right">Validation Web (% max)</Label>
                          <Input id="webCompletionRate" name="webCompletionRate" type="number" step="0.5" defaultValue={objectives.webCompletionRate} className="col-span-3" />
                      </div>
                  </div>
                  <DialogFooter>
                      <Button type="button" variant="secondary" onClick={() => setIsSettingsOpen(false)}>Annuler</Button>
                      <Button type="submit">Sauvegarder</Button>
                  </DialogFooter>
              </form>
          </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
