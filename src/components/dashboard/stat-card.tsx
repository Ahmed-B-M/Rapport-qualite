import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { type LucideIcon, AlertTriangle } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  description?: string;
  isBelowObjective?: boolean;
  onClick?: () => void;
}

export function StatCard({ title, value, icon: Icon, description, isBelowObjective, onClick }: StatCardProps) {
  const CardComponent = onClick ? "button" : "div";
  
  return (
    <Card as={CardComponent} onClick={onClick} className={cn(
      "text-left",
      onClick && "cursor-pointer hover:bg-muted/20 transition-colors"
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold flex items-center gap-2", isBelowObjective && "text-destructive")}>
            {isBelowObjective && <AlertTriangle className="h-6 w-6" />}
            {value}
        </div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
}
