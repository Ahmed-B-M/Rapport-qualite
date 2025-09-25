
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
import { Copy } from "lucide-react";

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

  const handleCopy = () => {
    // We need to convert the HTML to plain text for a better copy-paste experience
    const plainTextBody = new DOMParser().parseFromString(emailBody, "text/html").documentElement.textContent || "";
    
    navigator.clipboard.writeText(plainTextBody).then(
      () => {
        toast({
          title: "Copié !",
          description: "Le contenu de l'e-mail a été copié dans le presse-papiers.",
        });
      },
      (err) => {
        toast({
          title: "Erreur",
          description: "Impossible de copier le contenu.",
          variant: "destructive",
        });
        console.error("Could not copy text: ", err);
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Aperçu de l'e-mail de synthèse</DialogTitle>
          <DialogDescription>
            Copiez le contenu ci-dessous et collez-le dans votre client de messagerie.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] border rounded-md p-4">
          <div dangerouslySetInnerHTML={{ __html: emailBody }} />
        </ScrollArea>
        <DialogFooter>
          <Button onClick={handleCopy}>
            <Copy className="mr-2 h-4 w-4" />
            Copier le contenu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
