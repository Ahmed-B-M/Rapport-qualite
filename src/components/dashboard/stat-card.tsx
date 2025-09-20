import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { type LucideIcon, AlertTriangle, Info } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  description?: string;
  isBelowObjective?: boolean;
  onClick?: () => void;
  as?: React.ElementType;
  tooltipText?: string;
}

export function StatCard({ title, value, icon: Icon, description, isBelowObjective, onClick, as, tooltipText }: StatCardProps) {
  const CardComponent = as || (onClick ? "button" : "div");
  
  return (
    <Card as={CardComponent} onClick={onClick} className={cn(
      "text-left",
      onClick && "cursor-pointer hover:bg-muted/20 transition-colors"
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-1">
          {title}
          {tooltipText && (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{tooltipText}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
          )}
        </CardTitle>
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
