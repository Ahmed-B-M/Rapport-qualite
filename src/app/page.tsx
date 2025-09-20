"use client";

import { useState, useMemo, useRef, useEffect } from "react";
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
import { Loader2, AlertTriangle, Settings, FileText, Printer } from "lucide-react";
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
import { analyzeCustomerFeedback } from "@/ai/flows/analyze-customer-feedback";
import { analyzeDepotDelivery } from "@/ai/flows/depot-delivery-analysis";
import { generateOverviewSummary } from "@/ai/flows/generate-overview-summary";
import { getOverallStats, aggregateStats, getRankings, type RankingMetric } from "@/lib/data-processing";


export type Objectives = {
    averageRating: number;
    punctualityRate: number;
    failureRate: number;
    forcedOnSiteRate: number;
    forcedNoContactRate: number;
    webCompletionRate: number;
};

// Central cache for all AI analyses
export type AICache = {
    overviewSummary: string | null;
    depotAnalysis: string | null;
    carrierAnalysis: Record<string, any>;
    customerFeedbackAnalysis: any | null;
}

export default function DashboardPage() {
  const [data, setData] = useState<Delivery[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState("overview");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [excludeMagasin, setExcludeMagasin] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [isReportLoading, setIsReportLoading] = useState(false);

  // AI Caches
  const [aiCache, setAiCache] = useState<AICache>({
    overviewSummary: null,
    depotAnalysis: null,
    carrierAnalysis: {},
    customerFeedbackAnalysis: null,
  });
  const [loadingAi, setLoadingAi] = useState<Record<string, boolean>>({});

  const [objectives, setObjectives] = useState<Objectives>({
    averageRating: 4.8,
    punctualityRate: 95,
    failureRate: 2,
    forcedOnSiteRate: 10,
    forcedNoContactRate: 10,
    webCompletionRate: 1,
  });
  const overviewRef = useRef<HTMLDivElement>(null);

  const clearCache = () => {
    setReport(null);
    setReportError(null);
    setAiCache({
        overviewSummary: null,
        depotAnalysis: null,
        carrierAnalysis: {},
        customerFeedbackAnalysis: null,
    });
    setLoadingAi({});
  }

  const handleDataUploaded = (processedData: Delivery[], error?: string) => {
    if (error) {
      setError(error);
      setData(null);
    } else {
      setData(processedData);
      setError(null);
      clearCache();
    }
    setLoading(false);
  };
  
  const handleReset = () => {
    setData(null);
    setError(null);
    setActiveView("overview");
    setIsReportOpen(false);
    clearCache();
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

  const handlePrintOverview = () => {
    window.print();
  };

  const filteredData = useMemo(() => {
    if (!data) return null;
    if (excludeMagasin) {
      return data.filter(d => d.depot !== 'Magasin');
    }
    return data;
  }, [data, excludeMagasin]);

  useEffect(() => {
    if (!filteredData) return;

    const runBackgroundAnalyses = async () => {
        // Overview Summary
        if (!aiCache.overviewSummary) {
            setLoadingAi(prev => ({ ...prev, overviewSummary: true }));
            try {
                 const overallStats = getOverallStats(filteredData);
                 const aggregatedData = {
                    depots: getRankings(aggregateStats(filteredData, 'depot'), 'averageRating'),
                    warehouses: getRankings(aggregateStats(filteredData, 'warehouse'), 'averageRating'),
                    carriers: getRankings(aggregateStats(filteredData, 'carrier'), 'averageRating'),
                    drivers: getRankings(aggregateStats(filteredData, 'driver'), 'averageRating'),
                 };
                 const result = await generateOverviewSummary({
                    overallStats: JSON.stringify(overallStats),
                    rankings: JSON.stringify(aggregatedData),
                 });
                setAiCache(prev => ({ ...prev, overviewSummary: result.summary }));
            } catch (error) {
                 setAiCache(prev => ({ ...prev, overviewSummary: "L'analyse par IA n'a pas pu être générée." }));
            } finally {
                setLoadingAi(prev => ({ ...prev, overviewSummary: false }));
            }
        }
        
        // Depot Analysis
        if (!aiCache.depotAnalysis) {
            setLoadingAi(prev => ({ ...prev, depotAnalysis: true }));
            try {
                const relevantData = filteredData.map(d => ({
                    depot: d.depot,
                    status: d.status,
                    delaySeconds: d.delaySeconds,
                }));
                const csvHeader = "depot,status,delaySeconds\n";
                const csvRows = relevantData.map(d => `${d.depot},${d.status},${d.delaySeconds}`).join("\n");
                const result = await analyzeDepotDelivery({ deliveryData: csvHeader + csvRows });
                setAiCache(prev => ({ ...prev, depotAnalysis: result.analysisResults }));
            } catch (error) {
                setAiCache(prev => ({ ...prev, depotAnalysis: "L'analyse IA des dépôts a échoué." }));
            } finally {
                setLoadingAi(prev => ({ ...prev, depotAnalysis: false }));
            }
        }

        // Customer Feedback Analysis
        if (!aiCache.customerFeedbackAnalysis) {
             const comments = filteredData.map(d => d.feedbackComment!).filter(Boolean);
             if (comments.length > 0) {
                setLoadingAi(prev => ({ ...prev, customerFeedback: true }));
                try {
                    const result = await analyzeCustomerFeedback({ comments });
                    setAiCache(prev => ({ ...prev, customerFeedbackAnalysis: result }));
                } catch (error) {
                     setAiCache(prev => ({ ...prev, customerFeedbackAnalysis: { categoryCounts: {}, analysisSummary: "L'analyse par IA a échoué." } }));
                } finally {
                    setLoadingAi(prev => ({ ...prev, customerFeedback: false }));
                }
             } else {
                 setAiCache(prev => ({ ...prev, customerFeedbackAnalysis: { categoryCounts: {}, analysisSummary: "Aucun commentaire à analyser." } }));
             }
        }
    };

    runBackgroundAnalyses();
  }, [filteredData, aiCache, setAiCache, setLoadingAi]);
  
  const handleGenerateReport = () => {
    setIsReportOpen(true);
  }

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
        return <ReportDisplay 
            data={filteredData} 
            onBack={() => setIsReportOpen(false)} 
            storesExcluded={excludeMagasin} 
            report={report}
            setReport={setReport}
            error={reportError}
            setError={setReportError}
            isLoading={isReportLoading}
            setIsLoading={setIsReportLoading}
        />;
    }

    switch (activeView) {
      case "overview":
        return <div ref={overviewRef}><Overview data={filteredData} objectives={objectives} setActiveView={setActiveView} aiCache={aiCache} setAiCache={setAiCache} loadingAi={loadingAi} setLoadingAi={setLoadingAi} /></div>;
      case "depots":
        return <DepotAnalytics data={filteredData} objectives={objectives} aiCache={aiCache} setAiCache={setAiCache} loadingAi={loadingAi} setLoadingAi={setLoadingAi} />;
      case "warehouses":
        return <WarehouseAnalytics data={filteredData} />;
      case "carriers":
        return <CarrierAnalytics data={filteredData} objectives={objectives} aiCache={aiCache} setAiCache={setAiCache} loadingAi={loadingAi} setLoadingAi={setLoadingAi} />;
      case "drivers":
        return <DriverAnalytics data={filteredData} objectives={objectives} />;
      case "satisfaction":
        return <CustomerSatisfaction data={filteredData} objectives={objectives} aiCache={aiCache} setAiCache={setAiCache} loadingAi={loadingAi} setLoadingAi={setLoadingAi} />;
      default:
        return <div ref={overviewRef}><Overview data={filteredData} objectives={objectives} setActiveView={setActiveView} aiCache={aiCache} setAiCache={setAiCache} loadingAi={loadingAi} setLoadingAi={setLoadingAi} /></div>;
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
                         <Button variant="outline" onClick={handleGenerateReport}>
                            <FileText className="mr-2 h-4 w-4" />
                            Générer un rapport
                        </Button>
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
