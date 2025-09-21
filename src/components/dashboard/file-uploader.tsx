
"use client";

import { useDropzone } from "react-dropzone";
import { UploadCloud, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import { traiterDonneesBrutes } from "@/lib/analysis";
import { type Livraison } from "@/lib/definitions";
import { useToast } from "@/hooks/use-toast";

interface TelechargeurFichierProps {
  onDonneesTelechargees: (donnees: Livraison[], erreur?: string) => void;
  setChargement: (chargement: boolean) => void;
}

export function FileUploader({
  onDonneesTelechargees,
  setChargement,
}: TelechargeurFichierProps) {
  const { toast } = useToast();

  const onDrop = (fichiersAcceptes: File[]) => {
    if (fichiersAcceptes.length > 0) {
      setChargement(true);
      const fichier = fichiersAcceptes[0];
      const lecteur = new FileReader();

      lecteur.onload = (event) => {
        try {
          const classeur = XLSX.read(event.target?.result, { type: "binary" });
          const nomFeuille = classeur.SheetNames[0];
          const feuilleCalcul = classeur.Sheets[nomFeuille];
          const donneesJson = XLSX.utils.sheet_to_json(feuilleCalcul);
          
          if(donneesJson.length === 0) {
            throw new Error("Le fichier est vide ou ne contient pas de données lisibles.");
          }

          const donneesTraitees = traiterDonneesBrutes(donneesJson);
          onDonneesTelechargees(donneesTraitees);
          toast({
            title: "Succès",
            description: `${donneesTraitees.length} lignes ont été traitées avec succès.`,
          });
        } catch (error) {
          const messageErreur = error instanceof Error ? error.message : "Une erreur inconnue est survenue.";
          onDonneesTelechargees([], messageErreur);
          toast({
            title: "Erreur",
            description: `Échec du traitement du fichier : ${messageErreur}`,
            variant: "destructive",
          });
        }
      };
      
      lecteur.onerror = () => {
        onDonneesTelechargees([], "Erreur lors de la lecture du fichier.");
        toast({
            title: "Erreur",
            description: "Impossible de lire le fichier. Veuillez réessayer.",
            variant: "destructive",
        });
      }

      lecteur.readAsBinaryString(fichier);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
    },
    maxFiles: 1,
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors duration-200 ease-in-out
        ${
          isDragActive
            ? "border-primary bg-primary/10"
            : "border-muted-foreground/30 hover:border-primary hover:bg-primary/5"
        }`}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center justify-center gap-4">
        <div className="p-4 bg-primary/10 rounded-full text-primary">
            <UploadCloud className="h-12 w-12" />
        </div>
        <div className="space-y-2">
            <h3 className="text-2xl font-bold font-headline">
                Déposez votre fichier ici
            </h3>
            <p className="text-muted-foreground">
                ou cliquez pour sélectionner un fichier (XLS, XLSX)
            </p>
        </div>
        <div className="flex items-center text-sm text-muted-foreground/80 mt-4">
            <FileSpreadsheet className="h-4 w-4 mr-2"/>
            <span>Seuls les fichiers Excel sont acceptés</span>
        </div>
      </div>
    </div>
  );
}
