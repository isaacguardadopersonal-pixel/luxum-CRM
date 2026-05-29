import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FileText,
  TrendingUp,
  Settings,
  LogOut,
  Shield,
  PieChart
} from "lucide-react";

import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";

interface CRMSidebarProps {
  activePage: string;
}

export function CRMSidebar({ activePage }: CRMSidebarProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { role, toggleRole } = useAuth();

  const navItems = [
    { id: "dashboard", icon: LayoutDashboard, label: t("sidebar.dashboard"), path: "/" },
    { id: "clients", icon: Users, label: t("sidebar.clients"), path: "/clients" },
    { id: "policies", icon: FileText, label: t("sidebar.policies"), path: "/policies" },
    { id: "analytics", icon: TrendingUp, label: t("sidebar.analytics"), path: "/analytics" },
    ...(role === "admin" ? [{ id: "reports", icon: PieChart, label: t("sidebar.reports"), path: "/reports" }] : []),
    { id: "settings", icon: Settings, label: t("sidebar.settings"), path: "/settings" },
  ];

  return (
    <aside className="w-[72px] bg-sidebar flex flex-col items-center py-6 border-r border-sidebar-border shrink-0">
      {/* Logo */}
      <div className="mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
          <Shield className="w-5 h-5 text-primary-foreground" />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-2 flex-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            title={item.label}
            className={activePage === item.id ? "sidebar-icon-active" : "sidebar-icon"}
          >
            <item.icon className="w-5 h-5" />
          </button>
        ))}
      </nav>

      {/* Bottom */}
      <div className="flex flex-col gap-2">
        <button 
          onClick={toggleRole}
          className="sidebar-icon bg-secondary text-xs" 
          title="Cambiar Rol (Simulación)"
        >
          {role === 'admin' ? 'ADM' : 'AGT'}
        </button>
        <button className="sidebar-icon" title={t("sidebar.logout")}>
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </aside>
  );
}
