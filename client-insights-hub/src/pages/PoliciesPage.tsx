import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CRMLayout } from "@/components/CRMLayout";
import { useClients } from "@/hooks/useClients";
import { calculateMonthlyBookOfBusiness, getClientLoyaltyRank } from "@/lib/clientData";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Download, Mail, Calendar, BookOpen, Search, FileText, User } from "lucide-react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { MovementsList } from "@/components/MovementCard";

const CHART_COLORS = [
  "hsl(217, 91%, 60%)",
  "hsl(142, 71%, 45%)",
  "hsl(45, 93%, 58%)",
  "hsl(24, 95%, 53%)",
  "hsl(270, 70%, 60%)",
  "hsl(0, 72%, 51%)",
];

export default function PoliciesPage() {
  const { clients, loading } = useClients();
  const { t } = useLanguage();
  const { role } = useAuth();
  const navigate = useNavigate();

  // Estados de filtrado
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [searchQuery, setSearchQuery] = useState("");

  // Handler para limpiar el filtro (Ver todas las ventas)
  const handleClearFilter = () => {
    setSelectedMonth("all");
  };

  // Convertir selectedMonth (format YYYY-MM) a MM/YYYY para el display de texto
  const currentMonthStr = useMemo(() => {
    if (selectedMonth === "all") return "Histórico Completo";
    const [yyyy, mm] = selectedMonth.split('-');
    return `${mm}/${yyyy}`;
  }, [selectedMonth]);

  // Libro de negocios dinámico (Supabase / In-Memory helper con las mismas reglas)
  const bookOfBusiness = useMemo(() => {
    return calculateMonthlyBookOfBusiness(clients, selectedMonth);
  }, [clients, selectedMonth]);

  // Lista de todas las pólizas bajo la regla de negocio
  const allPolicies = useMemo(() => {
    const policies: any[] = [];
    clients.forEach(client => {
      // Regla: Solo clientes activos ("Current Customer")
      if (client.status === "Current Customer" && client.products && client.products.length > 0) {
        const loyalty = getClientLoyaltyRank(client);
        client.products.forEach(product => {
          policies.push({
            id: product.id,
            clientId: client.id,
            clientName: `${client.firstName} ${client.lastName}`,
            clientEmail: client.email || "",
            policyNumber: product.policyNumber || "N/A",
            company: product.company || "N/A",
            premium: product.premium || 0,
            effectiveDate: product.effectiveDate || "N/A",
            expirationDate: product.expirationDate || "N/A",
            cancelationDate: product.cancelationDate || null,
            status: product.status || "Activa",
            category: product.category || "N/A",
            loyaltyRank: loyalty.rank
          });
        });
      }
    });
    return policies;
  }, [clients]);

  // Filtrar pólizas mostradas según el mes seleccionado y el input de búsqueda
  const filteredPolicies = useMemo(() => {
    return allPolicies.filter(policy => {
      // 1. Filtro de Búsqueda
      const matchesSearch = 
        policy.policyNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        policy.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        policy.company.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // 2. Filtro de Fecha (Mes/Año de efectividad o cancelación)
      if (selectedMonth === "all") return true;

      const [yyyy, mm] = selectedMonth.split('-');
      const targetPrefixSlash = `${mm.padStart(2, '0')}/`;
      const targetSuffixSlash = `/${yyyy}`;

      const matchesDateStr = (dateStr?: string | null) => {
        if (!dateStr || dateStr === "N/A") return false;
        // Formato MM/DD/YYYY
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          return parts[0].padStart(2, '0') === mm && parts[2] === yyyy;
        }
        // Formato YYYY-MM-DD
        const hyphenParts = dateStr.split('-');
        if (hyphenParts.length === 3) {
          return hyphenParts[1].padStart(2, '0') === mm && hyphenParts[0] === yyyy;
        }
        return false;
      };

      if (policy.status === 'Cancelada') {
        return matchesDateStr(policy.cancelationDate);
      } else {
        return matchesDateStr(policy.effectiveDate);
      }
    });
  }, [allPolicies, selectedMonth, searchQuery]);

  // Pólizas próximas a vencer en los siguientes 75 días
  const renewalsPolicies = useMemo(() => {
    const renewals: any[] = [];
    
    const isWithinNext75Days = (dateStr: string) => {
      if (!dateStr || dateStr === "N/A") return false;
      const dateObj = new Date(dateStr);
      if (isNaN(dateObj.getTime())) return false;
      const now = new Date();
      const diffTime = dateObj.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 75;
    };

    allPolicies.forEach(policy => {
      if (policy.status !== 'Cancelada' && isWithinNext75Days(policy.expirationDate)) {
        renewals.push(policy);
      }
    });

    return renewals.sort((a, b) => {
      const dateA = new Date(a.expirationDate).getTime();
      const dateB = new Date(b.expirationDate).getTime();
      return dateA - dateB;
    });
  }, [allPolicies]);

  // Distribución por Compañía para el Chart
  const companyChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredPolicies.forEach(p => {
      if (p.company !== "N/A" && p.status !== 'Cancelada') {
        counts[p.company] = (counts[p.company] || 0) + 1;
      }
    });
    
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredPolicies]);

  const handleExportExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      
      const wsActive = workbook.addWorksheet('Libro de Negocios');
      wsActive.columns = [
        { header: 'Cliente', key: 'clientName', width: 30 },
        { header: 'Número de Póliza', key: 'policyNumber', width: 25 },
        { header: 'Compañía', key: 'company', width: 30 },
        { header: 'Prima ($)', key: 'premium', width: 15 },
        { header: 'Fecha Inicio', key: 'effectiveDate', width: 15 },
        { header: 'Fecha Finaliza', key: 'expirationDate', width: 15 },
        { header: 'Estado', key: 'status', width: 15 },
        { header: 'Fecha Cancelación', key: 'cancelationDate', width: 18 }
      ];
      wsActive.getRow(1).font = { bold: true };
      filteredPolicies.forEach(policy => {
        wsActive.addRow(policy);
      });

      const wsRenewals = workbook.addWorksheet('Renovaciones (75d)');
      wsRenewals.columns = [
        { header: 'Cliente', key: 'clientName', width: 30 },
        { header: 'Email', key: 'clientEmail', width: 30 },
        { header: 'Número de Póliza', key: 'policyNumber', width: 25 },
        { header: 'Compañía', key: 'company', width: 30 },
        { header: 'Prima ($)', key: 'premium', width: 15 },
        { header: 'Fecha Finaliza', key: 'expirationDate', width: 15 },
      ];
      wsRenewals.getRow(1).font = { bold: true };
      renewalsPolicies.forEach(policy => {
        wsRenewals.addRow(policy);
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `Reporte_Negocio_LUXUM_${currentMonthStr.replace('/', '-')}.xlsx`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Hubo un error al exportar.');
    }
  };

  if (role !== "admin") {
    return (
      <CRMLayout activePage="policies">
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <span className="text-2xl text-destructive">🔒</span>
          </div>
          <h2 className="text-xl font-bold text-foreground">Acceso Denegado</h2>
          <p className="text-muted-foreground">Solo los administradores pueden ver esta sección.</p>
        </div>
      </CRMLayout>
    );
  }

  if (loading) {
    return (
      <CRMLayout activePage="policies">
        <div className="flex items-center justify-center h-full">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </CRMLayout>
    );
  }

  return (
    <CRMLayout activePage="policies">
      {/* Header and Filter Controls */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            Libro de Negocio ({currentMonthStr})
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestión integrada de pólizas de seguros, cálculos de primas y renovaciones.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Calendario de Filtro Mensual */}
          <div className="relative flex items-center bg-card/90 backdrop-blur-md rounded-xl border border-primary/30 p-1 shadow-lg shadow-primary/10 transition-colors hover:border-primary/50">
            <Calendar className="absolute left-3 w-4 h-4 text-primary" />
            <input
              type="month"
              value={selectedMonth === 'all' ? '' : selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="pl-9 pr-4 py-1.5 bg-transparent text-sm font-medium text-foreground focus:outline-none cursor-pointer [color-scheme:dark]"
              style={{ WebkitAppearance: 'none' }}
              title="Filtrar por mes y año"
            />
          </div>

          {/* Botón Ver Todas las Ventas */}
          <button
            onClick={handleClearFilter}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all duration-300 shadow-lg ${
              selectedMonth === 'all'
                ? 'bg-primary border-primary text-primary-foreground shadow-primary/20 scale-105'
                : 'bg-card/90 border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/50'
            }`}
            title="Mostrar todo el historial consolidado"
          >
            <BookOpen className="w-4 h-4" />
            Ver Todas las Ventas
          </button>

          {/* Exportar */}
          <button 
            onClick={handleExportExcel}
            className="flex items-center gap-2 bg-secondary text-foreground px-4 py-2 rounded-xl border border-border hover:bg-secondary/80 transition-colors shadow-sm text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Exportar
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-fade-in">
        <div className="glass-card p-5 flex flex-col justify-between border-l-4 border-l-primary relative overflow-hidden group hover:scale-[1.02] transition-all">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Primas Activas</span>
          <span className="text-2xl font-bold text-foreground mt-2">${bookOfBusiness.activeTotal.toLocaleString()}</span>
          <div className="absolute right-3 bottom-3 text-primary/10 group-hover:text-primary/20 transition-colors">
            <FileText className="w-12 h-12" />
          </div>
        </div>
        <div className="glass-card p-5 flex flex-col justify-between border-l-4 border-l-info relative overflow-hidden group hover:scale-[1.02] transition-all">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Primas Renovadas</span>
          <span className="text-2xl font-bold text-foreground mt-2">${bookOfBusiness.historicalTotal.toLocaleString()}</span>
          <div className="absolute right-3 bottom-3 text-info/10 group-hover:text-info/20 transition-colors">
            <Calendar className="w-12 h-12" />
          </div>
        </div>
        <div className="glass-card p-5 flex flex-col justify-between border-l-4 border-l-destructive relative overflow-hidden group hover:scale-[1.02] transition-all">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Pérdidas por Cancelación</span>
          <span className="text-2xl font-bold text-destructive mt-2">-${bookOfBusiness.lossTotal.toLocaleString()}</span>
          <div className="absolute right-3 bottom-3 text-destructive/10 group-hover:text-destructive/20 transition-colors">
            <span className="text-4xl font-bold">✕</span>
          </div>
        </div>
        <div className="glass-card p-5 flex flex-col justify-between border-l-4 border-l-success bg-success/5 relative overflow-hidden group hover:scale-[1.02] transition-all">
          <span className="text-xs font-bold text-success uppercase tracking-wider">Libro Neto Acumulado</span>
          <span className="text-2xl font-bold text-success mt-2">${bookOfBusiness.netTotal.toLocaleString()}</span>
          <div className="absolute right-3 bottom-3 text-success/10 group-hover:text-success/20 transition-colors">
            <span className="text-4xl font-bold">$</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Chart and Analytics */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-card p-5 animate-fade-in flex flex-col">
            <h3 className="font-semibold text-foreground mb-4">Pólizas por Compañía</h3>
            {companyChartData.length > 0 ? (
              <>
                <div className="w-full" style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie 
                        data={companyChartData} 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={55} 
                        outerRadius={75} 
                        dataKey="value" 
                        paddingAngle={3}
                      >
                        {companyChartData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ background: "hsl(228, 12%, 14%)", border: "1px solid hsl(228, 10%, 20%)", borderRadius: "8px", color: "hsl(210, 20%, 95%)" }} 
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1.5 mt-4">
                  {companyChartData.map((item, i) => (
                    <div key={item.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="text-muted-foreground">{item.name}</span>
                      </div>
                      <span className="text-foreground font-medium">{item.value} póliza(s)</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">No hay datos vigentes en este mes.</p>
            )}
          </div>

          {/* Renovaciones a 75 días */}
          <div className="glass-card p-5 animate-fade-in flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Renovaciones Próximas</h3>
              <span className="text-xs bg-primary/20 text-primary px-2.5 py-0.5 rounded-full font-bold">
                {renewalsPolicies.length} a 75d
              </span>
            </div>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {renewalsPolicies.length > 0 ? renewalsPolicies.map((p, i) => (
                <div key={i} className="p-3 bg-secondary/30 rounded-lg border border-border/30 hover:border-primary/30 transition-colors flex justify-between items-center text-xs">
                  <div>
                    <button 
                      onClick={() => navigate(`/clients?clientId=${p.clientId}`)}
                      className="font-semibold text-primary hover:underline block text-left"
                    >
                      {p.clientName}
                    </button>
                    <span className="text-muted-foreground">{p.company} · {p.policyNumber}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-warning font-bold block">{p.expirationDate}</span>
                    {p.clientEmail && (
                      <a 
                        href={`mailto:${p.clientEmail}?subject=Renovación de tu póliza ${p.company}&body=Hola ${p.clientName},%0D%0A%0D%0ATu póliza de seguro está próxima a vencer. Nos gustaría revisar tus opciones de renovación.%0D%0A%0D%0ASaludos`}
                        className="text-primary hover:text-primary/80 transition-colors inline-block mt-0.5"
                        title="Enviar correo"
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground py-4 text-center">No hay renovaciones próximas.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Reusable Visual Grid of Policies/Sales */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-5 animate-fade-in flex flex-col min-h-[500px]">
            {/* Search and Filters inside Content */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h3 className="font-semibold text-foreground">Registro de Ventas y Movimientos</h3>
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar por póliza, cliente o aseguradora..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-secondary rounded-lg text-xs text-foreground placeholder:text-muted-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
            </div>

            {/* Reutilización del Ítem/Componente Visual de Póliza en Formato Grid */}
            <MovementsList
              movements={filteredPolicies.map(p => ({
                id: p.id,
                fullName: p.clientName,
                company: p.company,
                premium: p.premium,
                expirationDate: p.expirationDate,
                loyaltyRank: p.loyaltyRank || "Plata",
                status: p.status
              }))}
            />
          </div>
        </div>
      </div>
    </CRMLayout>
  );
}
