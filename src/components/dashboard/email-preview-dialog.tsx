
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Copy, Send, FileCode } from "lucide-react";
import { sendEmail } from "@/lib/analysis";

interface EmailPreviewDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  emailBody: string;
}

export function EmailPreviewDialog({
  isOpen,
  onOpenChange,
  emailBody,
}: EmailPreviewDialogProps) {
  const { toast } = useToast();

  const handleCopyAsText = () => {
    const plainTextBody = new DOMParser().parseFromString(emailBody, "text/html").documentElement.textContent || "";
    
    navigator.clipboard.writeText(plainTextBody).then(
      () => {
        toast({
          title: "Copié !",
          description: "Le contenu de l'e-mail a été copié en tant que texte brut.",
        });
      },
      (err) => {
        toast({
          title: "Erreur",
          description: "Impossible de copier le texte.",
          variant: "destructive",
        });
        console.error("Could not copy text: ", err);
      }
    );
  };

  const handleCopyAsHtml = () => {
    navigator.clipboard.writeText(emailBody).then(
      () => {
        toast({
          title: "Copié !",
          description: "Le code HTML de l'e-mail a été copié dans le presse-papiers.",
        });
      },
      (err) => {
        toast({
          title: "Erreur",
          description: "Impossible de copier le code HTML.",
          variant: "destructive",
        });
        console.error("Could not copy HTML: ", err);
      }
    );
  };
  
  const handleSendEmail = () => {
    navigator.clipboard.writeText(emailBody).then(
      () => {
        toast({
          title: "Copié !",
          description: "Le code HTML de l'e-mail a été copié. Collez-le dans votre e-mail.",
        });
        sendEmail({
            to: '',
            subject: 'Synthèse de la satisfaction client',
        });
      },
      (err) => {
         toast({
          title: "Erreur",
          description: "Impossible de copier le code HTML pour l'e-mail.",
          variant: "destructive",
        });
        console.error("Could not copy HTML for email: ", err);
      }
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Aperçu de l'e-mail de synthèse</DialogTitle>
          <DialogDescription>
            Copiez le contenu ou envoyez-le directement via votre client de messagerie.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] border rounded-md p-4 bg-white">
          <div dangerouslySetInnerHTML={{ __html: emailBody }} />
        </ScrollArea>
        <DialogFooter className="gap-2">
          <Button onClick={handleCopyAsText} variant="outline">
            <Copy className="mr-2 h-4 w-4" />
            Copier comme Texte
          </Button>
           <Button onClick={handleCopyAsHtml} variant="outline">
            <FileCode className="mr-2 h-4 w-4" />
            Copier le HTML
          </Button>
          <Button onClick={handleSendEmail}>
            <Send className="mr-2 h-4 w-4" />
            Ouvrir dans Gmail
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
