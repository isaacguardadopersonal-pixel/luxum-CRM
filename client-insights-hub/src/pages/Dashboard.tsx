import { useMemo, useState } from "react";
import { CRMLayout } from "@/components/CRMLayout";
import { StatCard } from "@/components/StatCard";
import { useClients } from "@/hooks/useClients";
import { useLanguage } from "@/contexts/LanguageContext";
import { getStatusColor, type Client, type Product, type Reminder } from "@/lib/clientData";
import { Search, Users, DollarSign, FileText, UserPlus, Bell, Gift, Calendar, LogOut, BookOpen, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

const CHART_COLORS = [
  "hsl(217, 91%, 60%)",
  "hsl(142, 71%, 45%)",
  "hsl(45, 93%, 58%)",
  "hsl(24, 95%, 53%)",
  "hsl(270, 70%, 60%)",
  "hsl(0, 72%, 51%)",
];

type SelectedClientType =
  | { type: "product"; client: Client; item: Product }
  | { type: "reminder"; client: Client; item: Reminder };

export default function Dashboard() {
  const { clients, loading } = useClients();
  const { t, locale, setLocale } = useLanguage();
  const { username, signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<SelectedClientType | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const stats = useMemo(() => {
    const isAll = selectedMonth === 'all';
    let filterYear = 0;
    let filterMonth = 0;
    
    if (!isAll) {
      const [filterYearStr, filterMonthStr] = selectedMonth.split('-');
      filterYear = parseInt(filterYearStr, 10);
      filterMonth = parseInt(filterMonthStr, 10) - 1; // 0-indexed
    }

    const isProductEffectiveInMonth = (p: Product) => {
      if (isAll) return true;
      if (!p.effectiveDate) return false;
      const dateObj = new Date(p.effectiveDate);
      if (isNaN(dateObj.getTime())) return false;
      return dateObj.getMonth() === filterMonth && dateObj.getFullYear() === filterYear;
    };

    const isProductExpiringInMonth = (p: Product) => {
      if (isAll) return true;
      if (!p.expirationDate) return false;
      const dateObj = new Date(p.expirationDate);
      if (isNaN(dateObj.getTime())) return false;
      return dateObj.getMonth() === filterMonth && dateObj.getFullYear() === filterYear;
    };

    const isReminderInMonth = (r: Reminder) => {
      if (isAll) return true;
      if (!r.date) return false;
      const dateObj = new Date(r.date);
      if (isNaN(dateObj.getTime())) return false;
      return dateObj.getMonth() === filterMonth && dateObj.getFullYear() === filterYear;
    };

    const current = clients.filter((c) => c.status === "Current Customer");
    const quoting = clients.filter((c) => c.status === "Quoting");
    const notInterested = clients.filter((c) => c.status === "Not Interested");
    
    // Filter products based on selected month
    const isProductValid = (p: Product) => {
      if (!isProductEffectiveInMonth(p)) return false;
      if (p.tipo_movimiento === 'Reemplazo') return false;
      if (p.status && p.status.toLowerCase().includes('cancelad')) return false;
      return true;
    };

    const validProductsInCurrent = current.flatMap(c => c.products || []).filter(isProductValid);
    const validProductsInAll = clients.flatMap(c => c.products || []).filter(isProductValid);

    const totalPremium = validProductsInCurrent.reduce((sum, p) => sum + (p.premium || 0), 0);
    const uniquePolicies = new Set(validProductsInCurrent.map((p) => p.policyNumber).filter(Boolean)).size;

    // By company
    const byCompany: Record<string, number> = {};
    validProductsInCurrent.forEach((p) => {
      if (p.company) {
        byCompany[p.company] = (byCompany[p.company] || 0) + (p.premium || 0);
      }
    });
    const companyData = Object.entries(byCompany)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // By policy type
    const byType: Record<string, number> = {};
    validProductsInAll.forEach((p) => {
      if (p.category) {
        byType[p.category] = (byType[p.category] || 0) + 1;
      }
    });
    const typeData = Object.entries(byType)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Expiring & Reminders in selected month
    const expiringSoon: SelectedClientType[] = [];
    clients.forEach((c) => {
      (c.products || []).forEach(p => {
        if (isProductExpiringInMonth(p)) {
          expiringSoon.push({ type: "product", client: c, item: p });
        }
      });
      (c.reminders || []).forEach(r => {
        if (isReminderInMonth(r)) {
          expiringSoon.push({ type: "reminder", client: c, item: r });
        }
      });
    });

    // Birthdays today (keep it independent of selected month)
    const now = new Date();
    const birthdaysToday = clients.filter((c) => {
      if (!c.dob) return false;
      const dobDate = new Date(c.dob);
      if (isNaN(dobDate.getTime())) return false;
      return dobDate.getMonth() === now.getMonth() && dobDate.getDate() === now.getDate();
    });

    // Referrals (all time)
    const byReferrer: Record<string, number> = {};
    clients.forEach((c) => {
      if (c.referredBy) {
        byReferrer[c.referredBy] = (byReferrer[c.referredBy] || 0) + 1;
      }
    });
    const topReferrers = Object.entries(byReferrer)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const premiumByType: Record<string, number> = {};

    validProductsInCurrent.forEach((p) => {
      if (p.category && p.premium) {
        if (premiumByType[p.category] !== undefined) {
          premiumByType[p.category] += p.premium;
        } else {
          premiumByType[p.category] = p.premium;
        }
      }
    });

    // Active clients this month
    const activeClientsThisMonth = current.filter(c => (c.products || []).some(isProductEffectiveInMonth)).length;

    // Reemplazos this month
    const reemplazosCount = clients.flatMap(c => c.products || [])
      .filter(p => isProductEffectiveInMonth(p) && p.tipo_movimiento === 'Reemplazo').length;

    return {
      totalClients: clients.length,
      currentCustomers: activeClientsThisMonth,
      quoting: quoting.length,
      notInterested: notInterested.length,
      totalPremium,
      uniquePolicies,
      reemplazosCount,
      companyData,
      typeData,
      expiringSoon,
      birthdaysToday,
      topReferrers,
      premiumByType,
    };
  }, [clients, selectedMonth]);

  if (loading) {
    return (
      <CRMLayout activePage="dashboard">
        <div className="flex items-center justify-center h-full">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </CRMLayout>
    );
  }

  return (
    <CRMLayout activePage="dashboard">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t("dashboard.welcome").replace('👋', '')} {username ? <span className="text-primary">{username}</span> : ''} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("dashboard.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-secondary rounded-lg border border-border pr-1">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="month"
                value={selectedMonth === 'all' ? '' : selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="pl-9 pr-3 py-2 bg-transparent text-sm text-foreground focus:outline-none"
              />
            </div>
            <div className="w-px h-5 bg-border mx-1"></div>
            <button
              onClick={() => {
                if (selectedMonth === 'all') {
                  const now = new Date();
                  setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
                } else {
                  setSelectedMonth('all');
                }
              }}
              className={`p-2 rounded-md transition-colors ${selectedMonth === 'all' ? 'bg-primary/20 text-primary' : 'hover:bg-background/50 text-muted-foreground hover:text-primary'}`}
              title={selectedMonth === 'all' ? "Volver al mes actual" : "Ver todos los meses (Global)"}
            >
              <BookOpen className="w-4 h-4" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={t("common.search")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-secondary rounded-lg text-sm text-foreground placeholder:text-muted-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 w-56"
            />
          </div>
          <button
            onClick={() => setLocale(locale === "es" ? "en" : "es")}
            className="w-10 h-10 rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors font-semibold text-xs border border-border flex items-center justify-center"
          >
            {locale === "es" ? "EN" : "ES"}
          </button>
          <button className="relative p-2.5 rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <Bell className="w-5 h-5" />
            {stats.expiringSoon.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full text-[10px] text-destructive-foreground flex items-center justify-center font-bold">
                {stats.expiringSoon.length}
              </span>
            )}
          </button>
          <button 
            onClick={signOut} 
            title={t("sidebar.logout")}
            className="p-2.5 rounded-lg bg-secondary text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard
          title={t("dashboard.premium_total")}
          value={`$${stats.totalPremium.toLocaleString("en-US", { minimumFractionDigits: 0 })}`}
          icon={<DollarSign className="w-5 h-5" />}
          subtitle={t("dashboard.desc_active")}
        />
        <StatCard
          title={t("dashboard.active_clients")}
          value={stats.currentCustomers}
          icon={<Users className="w-5 h-5" />}
          change={`${stats.quoting} ${t("dashboard.desc_quoting").toLowerCase()}`}
          changeType="positive"
        />
        <StatCard
          title={t("dashboard.unique_policies")}
          value={stats.uniquePolicies}
          icon={<FileText className="w-5 h-5" />}
          subtitle={t("dashboard.desc_policies")}
        />
        <StatCard
          title="Reemplazos"
          value={stats.reemplazosCount}
          icon={<RefreshCw className="w-5 h-5" />}
          subtitle="Pólizas sustituidas"
        />
        <StatCard
          title={t("dashboard.expiring")}
          value={stats.expiringSoon.length}
          icon={<Bell className="w-5 h-5" />}
          change={t("dashboard.desc_expiring")}
          changeType={stats.expiringSoon.length > 5 ? "negative" : "positive"}
        />
      </div>

      {stats.birthdaysToday.length > 0 && (
        <div className="glass-card mb-8 border-info/30 bg-info/5 animate-fade-in flex items-center justify-between p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-info/20 flex items-center justify-center text-info shadow-sm">
              <Gift className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-foreground flex items-center gap-2">¡Feliz Cumpleaños! 🎉</h3>
              <p className="text-sm text-muted-foreground">{stats.birthdaysToday.length} cliente(s) {stats.birthdaysToday.length === 1 ? "está" : "están"} celebrando su cumpleaños hoy.</p>
            </div>
          </div>
          <div className="flex gap-4">
            {stats.birthdaysToday.map(c => (
              <div key={c.id} className="text-sm text-right px-4 py-2 bg-secondary rounded-lg border border-border">
                <strong className="text-foreground">{c.firstName} {c.lastName}</strong><br />
                <span className="text-muted-foreground">{c.workPhone || c.email || "—"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        {/* Company Distribution Bar Chart */}
        <div className="glass-card p-5 lg:col-span-2 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">{t("dashboard.chart.company")}</h3>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.companyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(228, 10%, 20%)" />
              <XAxis dataKey="name" tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(value) => `$${value}`} />
              <Tooltip
                formatter={(value: number) => [`$${value.toLocaleString()}`, t("dashboard.premium_total")]}
                contentStyle={{ background: "hsl(228, 12%, 14%)", border: "1px solid hsl(228, 10%, 20%)", borderRadius: "8px", color: "hsl(210, 20%, 95%)" }}
              />
              <Bar dataKey="value" fill="hsl(217, 91%, 60%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Policy Type Pie */}
        <div className="glass-card p-5 animate-fade-in">
          <h3 className="font-semibold text-foreground mb-4">{t("dashboard.chart.policy")}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={stats.typeData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                {stats.typeData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "hsl(228, 12%, 14%)", border: "1px solid hsl(228, 10%, 20%)", borderRadius: "8px", color: "hsl(210, 20%, 95%)" }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {stats.typeData.map((item, i) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span className="text-muted-foreground">{item.name}</span>
                </div>
                <span className="text-foreground font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Expiring Soon */}
        <div className="glass-card p-5 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">{t("dashboard.expiring.title")} / Agenda</h3>
            <span className="text-xs text-muted-foreground">{t("dashboard.expiring.subtitle")}</span>
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto overflow-x-hidden">
            {stats.expiringSoon.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("dashboard.expiring.empty")}</p>
            ) : (
              stats.expiringSoon.slice(0, 8).map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2.5 px-3 border-b border-border/50 last:border-0 cursor-pointer hover:bg-secondary/50 rounded-lg transition-colors"
                  onClick={() => setSelectedClient(item)}
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.client.firstName} {item.client.lastName}</p>
                    {item.type === "product" ? (
                      <p className="text-xs text-muted-foreground">{item.item.policyNumber || "—"} · {item.item.company || "—"}</p>
                    ) : (
                      <p className="text-xs text-primary font-medium flex items-center gap-1">Recordatorio agendado</p>
                    )}
                  </div>
                  <div className="text-right">
                    {item.type === "product" ? (
                      <>
                        <p className="text-xs text-warning font-medium">{item.item.expirationDate || "—"}</p>
                        <p className="text-xs text-muted-foreground">{item.item.category || "—"}</p>
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-primary font-medium">{item.item.date}</p>
                        <p className="text-xs text-muted-foreground flex items-center justify-end gap-1"><Bell className="w-3 h-3"/> Agenda</p>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Referrers */}
        <div className="glass-card p-5 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">{t("dashboard.referrals.title")}</h3>
            <UserPlus className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="space-y-3">
            {stats.topReferrers.map((ref, i) => (
              <div key={ref.name} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary text-xs font-bold">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{ref.name}</p>
                  <div className="h-1.5 bg-secondary rounded-full mt-1.5">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${(ref.count / stats.topReferrers[0].count) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-semibold text-foreground">{ref.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Premium by Type */}
        <div className="glass-card p-5 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">{t("dashboard.chart.premium")}</h3>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="space-y-3">
            {Object.entries(stats.premiumByType)
              .sort((a, b) => b[1] - a[1])
              .map(([name, value], i) => (
                <div key={name} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-success/15 flex items-center justify-center text-success text-xs font-bold">
                      {i + 1}
                    </div>
                    <span className="text-sm font-medium text-foreground">{name}</span>
                  </div>
                  <span className="text-sm font-semibold text-success">${value.toLocaleString("en-US", { minimumFractionDigits: 0 })}</span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Expiring Policy Detail Modal */}
      {selectedClient && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedClient(null)}>
          <div className="glass-card max-w-sm w-full p-6 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-foreground mb-4">
              {selectedClient.type === "product" ? "Detalle de Póliza" : "Detalle de Recordatorio"}
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between text-sm py-2 border-b border-border/50">
                <span className="text-muted-foreground">{t("field.first_name")} / {t("field.last_name")}</span>
                <span className="text-foreground font-medium text-right">{selectedClient.client.firstName} {selectedClient.client.lastName}</span>
              </div>
              
              {selectedClient.type === "product" ? (
                <>
                  <div className="flex justify-between text-sm py-2 border-b border-border/50">
                    <span className="text-muted-foreground">{t("field.number")}</span>
                    <span className="text-foreground font-medium text-right">{selectedClient.item.policyNumber || "—"}</span>
                  </div>
                  <div className="flex justify-between text-sm py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Vencimiento</span>
                    <span className="text-foreground font-medium text-right text-warning">{selectedClient.item.expirationDate || "—"}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between text-sm py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Notas</span>
                    <span className="text-foreground font-medium text-right max-w-[60%] text-left">{selectedClient.item.notes || "—"}</span>
                  </div>
                  <div className="flex justify-between text-sm py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Fecha Agendada</span>
                    <span className="text-foreground font-medium text-right text-primary">{selectedClient.item.date || "—"}</span>
                  </div>
                </>
              )}

              <div className="flex justify-between text-sm py-2">
                <span className="text-muted-foreground">{t("field.phone")}</span>
                <span className="text-foreground font-medium text-right">{selectedClient.client.workPhone || "—"}</span>
              </div>
            </div>
            <button
              onClick={() => setSelectedClient(null)}
              className="mt-6 w-full py-2 bg-secondary text-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors"
            >
              {t("common.close")}
            </button>
          </div>
        </div>
      )}



    </CRMLayout>
  );
}
