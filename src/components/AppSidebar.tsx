import { BarChart3, Shield, Activity, AlertTriangle, Syringe, Table, PieChart, UserCircle } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from '@/components/ui/sidebar';

const items = [
  { title: 'Главная страница', url: '/', icon: BarChart3 },
  { title: 'Вакцинация', url: '/vaccination', icon: Syringe },
  { title: 'Здравоохранение', url: '/healthcare', icon: Activity },
  { title: 'Факторы риска', url: '/risk-factors', icon: AlertTriangle },
  { title: 'Таблицы', url: '/tables', icon: Table },
  { title: 'Графики', url: '/charts', icon: PieChart },
  { title: 'Личный кабинет', url: '/profile', icon: UserCircle },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className={`p-4 ${collapsed ? 'px-2' : ''}`}>
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-sidebar-primary shrink-0" />
            {!collapsed && <span className="font-semibold text-sidebar-primary-foreground text-lg">HepB Monitor</span>}
          </div>
        </div>
        <SidebarGroup>
          <SidebarGroupLabel>Аналитика</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map(item => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end={item.url === '/'} className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                      <item.icon className="mr-2 h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
