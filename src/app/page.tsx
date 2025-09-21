
"use client";

import { useState, useMemo, useRef } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { type Delivery, type Objectives } from "@/lib/definitions";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { FileUploader } from "@/components/dashboard/file-uploader";
import { Overview } from "@/components/dashboard/overview";
import { WarehouseAnalytics } from "@/components/dashboard/warehouse-analytics";
import { CustomerSatisfaction } from "@/components/dashboard/customer-satisfaction";
import { PerformanceReport } from "@/components/dashboard/performance-report";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertTriangle, Settings, Printer } from "lucide-react";
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

export default function DashboardPage() {
  const [data, setData] = useState<Delivery[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState("overview");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [excludeMagasin, setExcludeMagasin] = useState(false);

  const [objectives, setObjectives] = useState<Objectives>({
    averageRating: 4.8,
    averageSentiment: 8.0,
    punctualityRate: 95,
    failureRate: 2,
    forcedOnSiteRate: 10,
    forcedNoContactRate: 10,
    webCompletionRate: 1,
  });
  const overviewRef = useRef<HTMLDivElement>(null);

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

  const handleSaveSettings = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newObjectives: Objectives = {
        averageRating: parseFloat(formData.get("averageRating") as string),
        averageSentiment: parseFloat(formData.get("averageSentiment") as string),
        punctualityRate: parseFloat(formData.get("punctualityRate") as string),
        failureRate: parseFloat(formData.get("failureRate") as string),
        forcedOnSiteRate: parseFloat(formData.get("forcedOnSiteRate") as string),
        forcedNoContactRate: parseFloat(formData.get("forcedNoContactRate") as string),
        webCompletionRate: parseFloat(formData.get("webCompletionRate") as string),
    };
    setObjectives(newObjectives);
    setIsSettingsOpen(false);
  };

  const handlePrintOverview = () => {
    window.print();
  };

  const filteredData = useMemo(() => {
    if (!data) return null;
    let filtered = data;
    if (excludeMagasin) {
      filtered = filtered.filter(d => d.depot !== 'Magasin');
    }
    return filtered;
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

    switch (activeView) {
      case "overview":
        return <div ref={overviewRef}><Overview data={filteredData} /></div>;
      case "report":
        return <PerformanceReport data={filteredData} objectives={objectives} />;
      case "warehouses":
        return <WarehouseAnalytics data={filteredData} />;
      case "satisfaction":
        return <CustomerSatisfaction data={filteredData} />;
      default:
        return <div ref={overviewRef}><Overview data={filteredData} /></div>;
    }
  };

  return (
    <SidebarProvider>
      <div id="sidebar-container">
        <DashboardSidebar activeView={activeView} setActiveView={setActiveView} />
      </div>
      <SidebarInset>
        <div className="p-4 sm:p-6 lg:p-8">
            <header id="main-header" className="flex items-center justify-between mb-8">
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
                        {activeView === 'overview' && (
                           <Button variant="outline" onClick={handlePrintOverview}>
                                <Printer className="mr-2 h-4 w-4" />
                                Imprimer l'aperçu
                           </Button>
                        )}
                        <Button variant="outline" onClick={handleReset}>Nouveau fichier</Button>
                      </>
                    )}
                     <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)}>
                        <Settings />
                    </Button>
                </div>
            </header>
            <main id="main-content">
              {renderContent()}
            </main>
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
                      {Object.entries(objectives).map(([key, value]) => (
                          <div className="grid grid-cols-4 items-center gap-4" key={key}>
                              <Label htmlFor={key} className="text-right capitalize">
                                  {key.replace(/([A-Z])/g, ' $1').trim()}
                              </Label>
                              <Input id={key} name={key} type="number" step="0.1" defaultValue={value} className="col-span-3" />
                          </div>
                      ))}
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
