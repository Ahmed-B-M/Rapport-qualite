
"use client";

import Image from "next/image";
import { useState, useMemo } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { type Livraison, type Objectifs } from "@/lib/definitions";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { FileUploader } from "@/components/dashboard/file-uploader";
import { Overview } from "@/components/dashboard/overview";
import { WarehouseAnalytics } from "@/components/dashboard/warehouse-analytics";
import { CustomerSatisfaction } from "@/components/dashboard/customer-satisfaction";
import { QualityReport } from "@/components/dashboard/quality-report";
import { PrintableReport } from "@/components/dashboard/printable-report"; 
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertTriangle, Settings, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { genererRapportPerformance } from '@/lib/analysis';
import { generateSynthesis } from '@/lib/synthesis';

export default function DashboardPage() {
  const [donnees, setDonnees] = useState<Livraison[]>([]);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [vueActive, setVueActive] = useState("overview");
  const [parametresOuverts, setParametresOuverts] = useState(false);
  const [exclureMagasin, setExclureMagasin] = useState(false);

  const [objectifs, setObjectives] = useState<Objectifs>({
    noteMoyenne: 4.8, sentimentMoyen: 8.0, tauxPonctualite: 95, tauxEchec: 2,
    tauxForceSurSite: 10, tauxForceSansContact: 10, tauxCompletionWeb: 1,
  });

  const handleDonneesTelechargees = (processedData: Livraison[], error?: string) => {
    if (error) { setErreur(error); setDonnees([]); } 
    else { setDonnees(processedData); setErreur(null); }
    setChargement(false);
  };
  
  const handleReinitialiser = () => { setDonnees([]); setErreur(null); setVueActive("overview"); };

  const handleEnregistrerParametres = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const nouveauxObjectifs: Objectifs = {
        noteMoyenne: parseFloat(formData.get("noteMoyenne") as string), sentimentMoyen: parseFloat(formData.get("sentimentMoyen") as string),
        tauxPonctualite: parseFloat(formData.get("tauxPonctualite") as string), tauxEchec: parseFloat(formData.get("tauxEchec") as string),
        tauxForceSurSite: parseFloat(formData.get("tauxForceSurSite") as string), tauxForceSansContact: parseFloat(formData.get("tauxForceSansContact") as string),
        tauxCompletionWeb: parseFloat(formData.get("tauxCompletionWeb") as string),
    };
    setObjectives(nouveauxObjectifs);
    setParametresOuverts(false);
  };

  const handleImprimer = () => window.print();

  const donneesFiltrees = useMemo(() => {
    return exclureMagasin ? donnees.filter(d => d.depot !== 'Magasin') : donnees;
  }, [donnees, exclureMagasin]);

  // Mémoriser la génération du rapport
  const donneesRapport = useMemo(() => genererRapportPerformance(donneesFiltrees), [donneesFiltrees]);
  const donneesSynthese = useMemo(() => generateSynthesis(donneesRapport, objectifs), [donneesRapport, objectifs]);


  const renderContent = () => {
    if (chargement) return <div className="flex flex-col items-center justify-center h-full min-h-[400px]"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="mt-4 text-muted-foreground">Traitement...</p></div>;
    if (erreur) return <Alert variant="destructive" className="max-w-lg mx-auto"><AlertTriangle className="h-4 w-4" /><AlertTitle>Erreur</AlertTitle><AlertDescription>{erreur}</AlertDescription></Alert>;
    if (donnees.length === 0) return <FileUploader onDonneesTelechargees={handleDonneesTelechargees} setChargement={setChargement} />;

    switch (vueActive) {
      case "overview": return <Overview donnees={donneesFiltrees} />;
      case "report": return <QualityReport donnees={donneesFiltrees} objectifs={objectifs} />;
      case "warehouses": return <WarehouseAnalytics donnees={donneesFiltrees} />;
      case "satisfaction": return <CustomerSatisfaction data={donneesFiltrees} />;
      default: return <Overview donnees={donneesFiltrees} />;
    }
  };

  return (
    <SidebarProvider>
      <div id="sidebar-container" className="print-hide">
        <DashboardSidebar activeView={vueActive} setActiveView={setVueActive} />
      </div>
      <SidebarInset>
        <div className="p-4 sm:p-6 lg:p-8">
            <header id="main-header" className="flex items-center justify-between mb-8 print-hide">
                <div className="flex items-center gap-4">
                    <Image src="/logos/logo-crf.jpg" alt="Logo CLCV" width={60} height={60} className="rounded-lg"/>
                    <div>
                        <h1 className="text-3xl font-bold font-headline text-primary">Analyse Qualité CLCV</h1>
                        <p className="text-muted-foreground">Importez et analysez les données de performance de livraison.</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {donnees.length > 0 && (
                      <>
                        <div className="flex items-center space-x-2"><Switch id="exclude-magasin" checked={exclureMagasin} onCheckedChange={setExclureMagasin} /><Label htmlFor="exclude-magasin">Exclure Magasin</Label></div>
                        <Button variant="outline" onClick={handleImprimer}><Printer className="mr-2 h-4 w-4" /> Imprimer / PDF</Button>
                        <Button variant="outline" onClick={handleReinitialiser}>Nouveau fichier</Button>
                      </>
                    )}
                     <Button variant="ghost" size="icon" onClick={() => setParametresOuverts(true)}><Settings /></Button>
                </div>
            </header>
            <main id="main-content" className="non-printable">
              {renderContent()}
            </main>
            {donneesRapport && donneesSynthese && (
                <div className="printable-version">
                    <PrintableReport donneesRapport={donneesRapport} donneesSynthese={donneesSynthese} objectifs={objectifs} />
                </div>
            )}
        </div>
      </SidebarInset>
      <Dialog open={parametresOuverts} onOpenChange={setParametresOuverts}>
          <DialogContent>
              <DialogHeader><DialogTitle>Définir les objectifs</DialogTitle><DialogDescription>Ajustez les valeurs cibles pour les métriques clés.</DialogDescription></DialogHeader>
              <form onSubmit={handleEnregistrerParametres}>
                  <div className="grid gap-4 py-4">
                      {Object.entries(objectifs).map(([key, value]) => (
                          <div className="grid grid-cols-4 items-center gap-4" key={key}><Label htmlFor={key} className="text-right capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</Label><Input id={key} name={key} type="number" step="0.1" defaultValue={value} className="col-span-3" /></div>
                      ))}
                  </div>
                  <DialogFooter><Button type="button" variant="secondary" onClick={() => setParametresOuverts(false)}>Annuler</Button><Button type="submit">Sauvegarder</Button></DialogFooter>
              </form>
          </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
