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
  ChevronsRight,
} from "lucide-react";

interface DashboardSidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
}

const menuItems = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "depots", label: "Depots", icon: Building2 },
  { id: "warehouses", label: "Warehouses", icon: Warehouse },
  { id: "carriers", label: "Carriers", icon: Truck },
  { id: "drivers", label: "Drivers", icon: Users },
  { id: "sentiment", label: "Sentiment", icon: Smile },
];

export function DashboardSidebar({ activeView, setActiveView }: DashboardSidebarProps) {
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2">
            <Truck className="w-8 h-8 text-primary" />
            <div className="flex flex-col">
                <h2 className="text-lg font-semibold font-headline">Delivery Insights</h2>
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
            <p>&copy; {new Date().getFullYear()} Delivery Insights</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
