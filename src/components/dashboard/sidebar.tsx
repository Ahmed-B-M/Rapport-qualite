
'use client';
import { Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { Home, BarChart2, Warehouse, Smile, Truck } from 'lucide-react';

interface DashboardSidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
}

export function DashboardSidebar({ activeView, setActiveView }: DashboardSidebarProps) {
    return (
        <Sidebar>
            <SidebarHeader>
                <div className="text-lg font-semibold">ID LOGISTICS</div>
            </SidebarHeader>
            <SidebarContent>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton isActive={activeView === 'overview'} onClick={() => setActiveView('overview')}>
                            <Home className="h-5 w-5" />
                            Aperçu
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                         <SidebarMenuButton isActive={activeView === 'report'} onClick={() => setActiveView('report')}>
                            <BarChart2 className="h-5 w-5" />
                            Rapport Qualité
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                     <SidebarMenuItem>
                         <SidebarMenuButton isActive={activeView === 'transporters'} onClick={() => setActiveView('transporters')}>
                            <Truck className="h-5 w-5" />
                            Transporteurs
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                         <SidebarMenuButton isActive={activeView === 'warehouses'} onClick={() => setActiveView('warehouses')}>
                            <Warehouse className="h-5 w-5" />
                            Entrepôts
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                         <SidebarMenuButton isActive={activeView === 'satisfaction'} onClick={() => setActiveView('satisfaction')}>
                            <Smile className="h-5 w-5" />
                            Satisfaction Client
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarContent>
            <SidebarFooter>
                <p className="text-xs text-muted-foreground">&copy; 2025 ID LOGISTICS</p>
            </SidebarFooter>
        </Sidebar>
    );
}
