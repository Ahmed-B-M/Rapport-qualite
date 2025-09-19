"use client";

import {
  Sidebar,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard,
  Building2,
  Warehouse,
  Truck,
  Users,
  Smile,
  PenSquare,
} from "lucide-react";

interface DashboardSidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
}

const menuItems = [
  { id: "overview", label: "Aperçu", icon: LayoutDashboard },
  { id: "satisfaction", label: "Satisfaction Clients", icon: Smile },
  { id: "depots", label: "Dépôts", icon: Building2 },
  { id: "warehouses", label: "Entrepôts", icon: Warehouse },
  { id: "carriers", label: "Transporteurs", icon: Truck },
  { id: "drivers", label: "Livreurs", icon: Users },
];

const CarrefourIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      className="w-8 h-8"
      fill="none"
    >
      <path
        d="M50 15C36.2 15 25 26.2 25 40C25 53.8 36.2 65 50 65C63.8 65 75 53.8 75 40C75 26.2 63.8 15 50 15Z"
        fill="hsl(var(--primary))"
      />
      <path
        d="M50 15C36.2 15 25 26.2 25 40L50 65V15Z"
        fill="hsl(var(--accent))"
      />
      <text
        x="50"
        y="85"
        fontFamily="sans-serif"
        fontSize="20"
        fill="hsl(var(--primary))"
        textAnchor="middle"
        fontWeight="bold"
      >
        C
      </text>
    </svg>
  );
  

export function DashboardSidebar({ activeView, setActiveView }: DashboardSidebarProps) {
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2">
            <CarrefourIcon />
            <div className="flex flex-col">
                <h2 className="text-lg font-semibold font-headline">Carrefour</h2>
            </div>
        </div>
      </SidebarHeader>
      <Separator />
      <SidebarMenu>
        {menuItems.map((item) => (
          <SidebarMenuItem key={item.id}>
            <SidebarMenuButton
              onClick={() => setActiveView(item.id)}
              isActive={activeView === item.id}
              tooltip={item.label}
            >
              <item.icon />
              <span>{item.label}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
      <SidebarFooter>
        <div className="text-xs text-muted-foreground p-2">
            <p>&copy; {new Date().getFullYear()} Carrefour</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
