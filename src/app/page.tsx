
"use client";

import Image from "next/image";
import { useState, useMemo } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { type Livraison, type Objectifs, type DonneesRapportPerformance, type RapportDepot } from "@/lib/definitions";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { FileUploader } from "@/components/dashboard/file-uploader";
import { Overview } from "@/components/dashboard/overview";
import { WarehouseAnalytics } from "@/components/dashboard/warehouse-analytics";
import { CustomerSatisfaction } from "@/components/dashboard/customer-satisfaction";
import { QualityReport } from "@/components/dashboard/quality-report";
import { TransporterReport } from "@/components/dashboard/transporter-report";
import { PrintableReport } from "@/components/dashboard/printable-report"; 
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertTriangle, Settings, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { genererRapportPerformance } from '@/lib/analysis';
import { generateSynthesis } from '@/lib/synthesis';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";

export default function DashboardPage() {
  const [donnees, setDonnees] = useState<Livraison[]>([]);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [vueActive, setVueActive] = useState("overview");
  const [parametresOuverts, setParametresOuverts] = useState(false);
  const [modalLivreursOuvert, setModalLivreursOuvert] = useState(false);
  const [exclureMagasin, setExclureMagasin] = useState(false);
  const [plageDates, setPlageDates] = useState<DateRange | undefined>();

  const [objectifs, setObjectives] = useState<Objectifs>({
    noteMoyenne: 4.8, sentimentMoyen: 8.0, tauxPonctualite: 95, tauxEchec: 2,
    tauxForceSurSite: 10, tauxForceSansContact: 10, tauxCompletionWeb: 1,
  });
  
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [selectedDepotsForPrint, setSelectedDepotsForPrint] = useState<Record<string, boolean>>({});
  const [printableReportData, setPrintableReportData] = useState<DonneesRapportPerformance | null>(null);

  const datesUniques = useMemo(() => {
    const dates = new Set(donnees.map(d => new Date(d.date).setHours(0,0,0,0)));
    return Array.from(dates).map(d => new Date(d));
  }, [donnees]);

  const handleDonneesTelechargees = (processedData: Livraison[], error?: string) => {
    if (error) { setErreur(error); setDonnees([]); } 
    else { 
        setDonnees(processedData); 
        setErreur(null); 
        const dates = new Set(processedData.map(d => new Date(d.date).setHours(0,0,0,0)));
        const datesArray = Array.from(dates).map(d => new Date(d));
        if (datesArray.length > 0) {
            const minDate = new Date(Math.min(...datesArray.map(d => d.getTime())));
            const maxDate = new Date(Math.max(...datesArray.map(d => d.getTime())));
            setPlageDates({ from: minDate, to: maxDate });
        }
    }
    setChargement(false);
  };
  
  const handleReinitialiser = () => { 
    setDonnees([]); 
    setErreur(null); 
    setVueActive("overview"); 
    setPlageDates(undefined);
  };

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

  const donneesFiltrees = useMemo(() => {
    let donneesFiltreMagasin = exclureMagasin ? donnees.filter(d => d.depot !== 'Magasin') : donnees;
    if (plageDates?.from && plageDates?.to) {
        const debut = new Date(plageDates.from.setHours(0, 0, 0, 0));
        const fin = new Date(plageDates.to.setHours(23, 59, 59, 999));
        donneesFiltreMagasin = donneesFiltreMagasin.filter(d => {
            const dateLivraison = new Date(d.date);
            return dateLivraison >= debut && dateLivraison <= fin;
        });
    }
    return donneesFiltreMagasin;
  }, [donnees, exclureMagasin, plageDates]);

  const livreursNonAssocies = useMemo(() => {
    return donnees.filter(d => d.transporteur === 'Inconnu');
  }, [donnees]);
  
  const livreursNonAssociesParDepot = useMemo(() => {
    const groupes: Record<string, { livreurs: string[], entrepot?: string }> = {};
    const livreursUniques = new Set(livreursNonAssocies.map(l => l.chauffeur));
  
    livreursUniques.forEach(chauffeur => {
      const livraison = livreursNonAssocies.find(l => l.chauffeur === chauffeur);
      if (livraison) {
        const key = livraison.depot === 'Magasin' ? `Magasin (${livraison.entrepot})` : livraison.depot;
        if (!groupes[key]) {
          groupes[key] = { livreurs: [] };
          if (livraison.depot === 'Magasin') {
            groupes[key].entrepot = livraison.entrepot;
          }
        }
        if (!groupes[key].livreurs.includes(livraison.chauffeur)) {
            groupes[key].livreurs.push(livraison.chauffeur);
        }
      }
    });
  
    for (const depot in groupes) {
      groupes[depot].livreurs.sort();
    }
    return groupes;
  }, [livreursNonAssocies]);

  // Mémoriser la génération du rapport
  const donneesRapport = useMemo(() => genererRapportPerformance(donneesFiltrees, 'depot'), [donneesFiltrees]);
  const donneesSynthese = useMemo(() => generateSynthesis(donneesRapport, objectifs), [donneesRapport, objectifs]);

  const handleOpenPrintModal = () => {
    const initialSelection: Record<string, boolean> = {};
    donneesRapport.depots.forEach(d => {
      const key = d.entrepot ? `${d.nom}_${d.entrepot}` : d.nom;
      initialSelection[key] = true;
    });
    setSelectedDepotsForPrint(initialSelection);
    setPrintModalOpen(true);
  };
  
  const handleConfirmPrint = () => {
    const depotsToPrint: RapportDepot[] = donneesRapport.depots.filter(d => {
        const key = d.entrepot ? `${d.nom}_${d.entrepot}` : d.nom;
        return selectedDepotsForPrint[key];
    });

    const reportDataForPrint: DonneesRapportPerformance = {
        global: donneesRapport.global,
        depots: depotsToPrint,
    };
    
    setPrintableReportData(reportDataForPrint);
    
    // Use a timeout to ensure state is updated before printing
    setTimeout(() => {
        window.print();
        setPrintModalOpen(false);
        setPrintableReportData(null); // Reset after printing
    }, 100);
  };


  const renderContent = () => {
    if (chargement) return <div className="flex flex-col items-center justify-center h-full min-h-[400px]"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="mt-4 text-muted-foreground">Traitement...</p></div>;
    if (erreur) return <Alert variant="destructive" className="max-w-lg mx-auto"><AlertTriangle className="h-4 w-4" /><AlertTitle>Erreur</AlertTitle><AlertDescription>{erreur}</AlertDescription></Alert>;
    if (donnees.length === 0) return <FileUploader onDonneesTelechargees={handleDonneesTelechargees} setChargement={setChargement} />;

    switch (vueActive) {
      case "overview": return <Overview donnees={donneesFiltrees} />;
      case "report": return <QualityReport donnees={donneesFiltrees} objectifs={objectifs} />;
      case "warehouses": return <WarehouseAnalytics donnees={donneesFiltrees} />;
      case "satisfaction": return <CustomerSatisfaction data={donneesFiltrees} />;
      case "transporters": return <TransporterReport donnees={donneesFiltrees} objectifs={objectifs} />;
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
            <header id="main-header" className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 print-hide gap-4">
                <div className="flex items-center gap-4">
                    <Image src="/logos/logo-crf.jpg" alt="Logo CLCV" width={60} height={60} className="rounded-lg"/>
                    <div>
                        <h1 className="text-3xl font-bold font-headline text-primary">Analyse Qualité CLCV</h1>
                        <p className="text-muted-foreground">Importez et analysez les données de performance de livraison.</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                    {donnees.length > 0 && (
                      <>
                        <DateRangePicker date={plageDates} onDateChange={setPlageDates} availableDates={datesUniques} />
                        <div className="flex items-center space-x-2"><Switch id="exclude-magasin" checked={exclureMagasin} onCheckedChange={setExclureMagasin} /><Label htmlFor="exclude-magasin">Exclure Magasin</Label></div>
                        <Button variant="outline" onClick={handleOpenPrintModal}><Printer className="mr-2 h-4 w-4" /> Imprimer / PDF</Button>
                        <Button variant="outline" onClick={handleReinitialiser}>Nouveau fichier</Button>
                      </>
                    )}
                     <Button variant="ghost" size="icon" onClick={() => setParametresOuverts(true)}><Settings /></Button>
                </div>
            </header>
            {livreursNonAssocies.length > 0 && (
                <Alert variant="destructive" className="mb-6 cursor-pointer hover:bg-destructive/10" onClick={() => setModalLivreursOuvert(true)}>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Attention !</AlertTitle>
                    <AlertDescription>
                        {new Set(livreursNonAssocies.map(l => l.chauffeur)).size} livreur(s) n'ont pas de transporteur associé. Cliquez ici pour voir la liste.
                    </AlertDescription>
                </Alert>
            )}
            <main id="main-content" className="non-printable">
              {renderContent()}
            </main>
            {(printableReportData || (donneesRapport && !printModalOpen)) && (
              <div className="printable-version">
                <PrintableReport 
                  donneesRapport={printableReportData ?? donneesRapport} 
                  donneesSynthese={generateSynthesis(printableReportData ?? donneesRapport, objectifs)} 
                  objectifs={objectifs} 
                  typeRapport="Dépôt"
                />
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
      <Dialog open={modalLivreursOuvert} onOpenChange={setModalLivreursOuvert}>
        <DialogContent className="max-w-4xl">
            <DialogHeader>
                <DialogTitle>Livreurs sans transporteur associé</DialogTitle>
                <DialogDescription>
                    La liste suivante montre les livreurs qui n'ont pas pu être automatiquement associés à un transporteur. Veuillez vérifier leurs noms dans le fichier source.
                </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[60vh] mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-1">
                    {Object.entries(livreursNonAssociesParDepot).sort(([depotA], [depotB]) => depotA.localeCompare(depotB)).map(([depot, data]) => (
                        <Card key={depot}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg">{depot.replace(/_/g, ' ')}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="list-disc pl-5 space-y-1 text-sm">
                                    {data.livreurs.map((livreur) => (
                                        <li key={livreur}>{livreur.replace(/\s*\([^)]*\)$/, '').trim()}</li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </ScrollArea>
             <DialogFooter>
                <Button onClick={() => setModalLivreursOuvert(false)}>Fermer</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
       <Dialog open={printModalOpen} onOpenChange={setPrintModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sélectionner les dépôts à imprimer</DialogTitle>
            <DialogDescription>
              Cochez les dépôts que vous souhaitez inclure dans le rapport PDF.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4 max-h-[60vh] overflow-y-auto">
            {donneesRapport?.depots.map(depot => {
              const key = depot.entrepot ? `${depot.nom}_${depot.entrepot}` : depot.nom;
              const label = depot.entrepot ? `${depot.nom} (${depot.entrepot})` : depot.nom;
              return (
                <div key={key} className="flex items-center space-x-2">
                  <Checkbox
                    id={key}
                    checked={selectedDepotsForPrint[key]}
                    onCheckedChange={(checked) => {
                      setSelectedDepotsForPrint(prev => ({ ...prev, [key]: !!checked }));
                    }}
                  />
                  <label htmlFor={key} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    {label}
                  </label>
                </div>
              )
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrintModalOpen(false)}>Annuler</Button>
            <Button onClick={handleConfirmPrint}>Imprimer la sélection</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
