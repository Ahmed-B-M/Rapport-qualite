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
    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-5 w-5"
        >
            <path d="M12 2C17.52 2 22 6.48 22 12C22 17.52 17.52 22 12 22C6.48 22 2 17.52 2 12C2 6.48 6.48 2 12 2ZM12 4C7.58 4 4 7.58 4 12C4 16.42 7.58 20 12 20C16.42 20 20 16.42 20 12C20 7.58 16.42 4 12 4Z" />
            <path d="M12 4C9.79 4 8 5.79 8 8L12 14V4Z" fill="hsl(var(--accent))" />
        </svg>
    </div>
);
  

export function DashboardSidebar({ activeView, setActiveView }: DashboardSidebarProps) {
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-3 p-1">
            <CarrefourIcon />
            <h2 className="text-xl font-bold font-headline">Carrefour</h2>
        </div>
      </SidebarHeader>
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
