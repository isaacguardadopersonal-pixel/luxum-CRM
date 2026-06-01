import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { CRMLayout } from "@/components/CRMLayout";
import { useClients } from "@/hooks/useClients";
import { calculateMonthlyBookOfBusiness } from "@/lib/clientData";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Download, Mail } from "lucide-react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const CHART_COLORS = [
  "hsl(217, 91%, 60%)",
  "hsl(142, 71%, 45%)",
  "hsl(45, 93%, 58%)",
  "hsl(24, 95%, 53%)",
  "hsl(270, 70%, 60%)",
  "hsl(0, 72%, 51%)",
];

export default function ReportsPage() {
  const { clients, loading } = useClients();
  const { t } = useLanguage();
  const { role } = useAuth();
  const navigate = useNavigate();

  const currentMonthStr = useMemo(() => {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    return `${mm}/${yyyy}`;
  }, []);

  const bookOfBusiness = useMemo(() => {
    return calculateMonthlyBookOfBusiness(clients, currentMonthStr);
  }, [clients, currentMonthStr]);

  const allPolicies = useMemo(() => {
    const policies: any[] = [];
    clients.forEach(client => {
      // Regla: Solo clientes activos ("Current Customer")
      if (client.status === "Current Customer" && client.products && client.products.length > 0) {
        client.products.forEach(product => {
          if (!product.status?.toLowerCase().includes('cancelad')) {
            policies.push({
              clientId: client.id,
              clientName: `${client.firstName} ${client.lastName}`,
              clientEmail: client.email || "",
              policyNumber: product.policyNumber || "N/A",
              company: product.company || "N/A",
              premium: product.premium || 0,
              effectiveDate: product.effectiveDate || "N/A",
              expirationDate: product.expirationDate || "N/A"
            });
          }
        });
      }
    });
    return policies;
  }, [clients]);

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
      if (isWithinNext75Days(policy.expirationDate)) {
        renewals.push(policy);
      }
    });

    // Ordenar por fecha de expiración más próxima
    return renewals.sort((a, b) => {
      const dateA = new Date(a.expirationDate).getTime();
      const dateB = new Date(b.expirationDate).getTime();
      return dateA - dateB;
    });
  }, [allPolicies]);

  const uniquePoliciesList = useMemo(() => {
    const list: any[] = [];
    clients.forEach(client => {
      if (client.status === "Current Customer" && client.products) {
        const activeProducts = client.products.filter(p => !p.status?.toLowerCase().includes('cancelad'));
        if (activeProducts.length === 1) {
          const product = activeProducts[0];
          list.push({
            clientId: client.id,
            clientName: `${client.firstName} ${client.lastName}`,
            clientPhone: client.workPhone || client.phone || "N/A",
            policyNumber: product.policyNumber || "N/A",
            company: product.company || "N/A",
            premium: product.premium || 0,
            category: product.category || "N/A"
          });
        }
      }
    });
    return list;
  }, [clients]);

  const companyChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    allPolicies.forEach(p => {
      if (p.company !== "N/A") {
        counts[p.company] = (counts[p.company] || 0) + 1;
      }
    });
    
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [allPolicies]);

  const handleExportExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      
      // Hoja 1: Pólizas Activas
      const wsActive = workbook.addWorksheet('Pólizas Activas');
      wsActive.columns = [
        { header: 'Cliente', key: 'clientName', width: 30 },
        { header: 'Número de Póliza', key: 'policyNumber', width: 25 },
        { header: 'Compañía', key: 'company', width: 30 },
        { header: 'Prima ($)', key: 'premium', width: 15 },
        { header: 'Fecha Finaliza', key: 'expirationDate', width: 15 },
      ];
      wsActive.getRow(1).font = { bold: true };
      allPolicies.forEach(policy => {
        wsActive.addRow(policy);
      });

      // Hoja 2: Renovaciones 75 días
      const wsRenewals = workbook.addWorksheet('Próximas Renovaciones (75d)');
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
      saveAs(blob, 'Reporte_LUXUM.xlsx');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Hubo un error al exportar.');
    }
  };

  if (role !== "admin") {
    return (
      <CRMLayout activePage="reports">
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <span className="text-2xl text-destructive">🔒</span>
          </div>
          <h2 className="text-xl font-bold text-foreground">Acceso Denegado</h2>
          <p className="text-muted-foreground">Solo los administradores pueden ver los reportes.</p>
        </div>
      </CRMLayout>
    );
  }

  if (loading) {
    return (
      <CRMLayout activePage="reports">
        <div className="flex items-center justify-center h-full">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </CRMLayout>
    );
  }

  return (
    <CRMLayout activePage="reports">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("sidebar.reports")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Listado de productos de clientes activos y próximas renovaciones.
          </p>
        </div>
        <button 
          onClick={handleExportExcel}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" />
          Exportar a Excel
        </button>
      </div>

      {/* Resumen del Libro de Negocios Mensual */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-fade-in">
        <div className="glass-card p-5 flex flex-col justify-between border-l-4 border-l-primary">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Primas Activas ({currentMonthStr})</span>
          <span className="text-xl font-bold text-foreground mt-2">${bookOfBusiness.activeTotal.toLocaleString()}</span>
        </div>
        <div className="glass-card p-5 flex flex-col justify-between border-l-4 border-l-info">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Primas Renovadas ({currentMonthStr})</span>
          <span className="text-xl font-bold text-foreground mt-2">${bookOfBusiness.historicalTotal.toLocaleString()}</span>
        </div>
        <div className="glass-card p-5 flex flex-col justify-between border-l-4 border-l-destructive">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Pérdidas por Cancelación</span>
          <span className="text-xl font-bold text-destructive mt-2">-${bookOfBusiness.lossTotal.toLocaleString()}</span>
        </div>
        <div className="glass-card p-5 flex flex-col justify-between border-l-4 border-l-success bg-success/5">
          <span className="text-xs font-bold text-success uppercase tracking-wider">Libro Neto Acumulado</span>
          <span className="text-xl font-bold text-success mt-2">${bookOfBusiness.netTotal.toLocaleString()}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="glass-card p-5 lg:col-span-1 animate-fade-in flex flex-col">
          <h3 className="font-semibold text-foreground mb-4">Seguros por Compañía</h3>
          <div className="w-full" style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie 
                  data={companyChartData} 
                  cx="50%" 
                  cy="50%" 
                  innerRadius={50} 
                  outerRadius={80} 
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
          <div className="space-y-1.5 mt-2">
            {companyChartData.map((item, i) => (
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

        <div className="glass-card p-5 lg:col-span-2 animate-fade-in flex flex-col max-h-[400px]">
          <h3 className="font-semibold text-foreground mb-4">Pólizas (Solo Clientes Activos)</h3>
          <div className="overflow-y-auto flex-1 pr-2">
            <table className="w-full">
              <thead className="sticky top-0 bg-background/95 backdrop-blur-sm z-10">
                <tr className="border-b border-border/50">
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 uppercase tracking-wider">Cliente</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 uppercase tracking-wider">Póliza</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 uppercase tracking-wider">Compañía</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 uppercase tracking-wider">Prima</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 uppercase tracking-wider">Finaliza</th>
                </tr>
              </thead>
              <tbody>
                {allPolicies.length > 0 ? allPolicies.map((p, i) => (
                  <tr key={i} className="border-b border-border/30 hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium">
                      <button 
                        onClick={() => navigate(`/clients?clientId=${p.clientId}`)}
                        className="text-primary hover:underline focus:outline-none"
                      >
                        {p.clientName}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{p.policyNumber}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{p.company}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">${p.premium.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{p.expirationDate}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No hay productos registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="glass-card p-5 animate-fade-in flex flex-col max-h-[400px]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Próximas Renovaciones (75 días)</h3>
          <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full font-medium">
            {renewalsPolicies.length} pendientes
          </span>
        </div>
        <div className="overflow-y-auto flex-1 pr-2">
          <table className="w-full">
            <thead className="sticky top-0 bg-background/95 backdrop-blur-sm z-10">
              <tr className="border-b border-border/50">
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 uppercase tracking-wider">Cliente</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 uppercase tracking-wider">Póliza</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 uppercase tracking-wider">Compañía</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 uppercase tracking-wider">Vence En</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {renewalsPolicies.length > 0 ? renewalsPolicies.map((p, i) => (
                <tr key={i} className="border-b border-border/30 hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium">
                    <button 
                      onClick={() => navigate(`/clients?clientId=${p.clientId}`)}
                      className="text-primary hover:underline focus:outline-none"
                    >
                      {p.clientName}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{p.policyNumber}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{p.company}</td>
                  <td className="px-4 py-3 text-sm font-medium text-warning">{p.expirationDate}</td>
                  <td className="px-4 py-3 text-right">
                    {p.clientEmail ? (
                      <a 
                        href={`mailto:${p.clientEmail}?subject=Renovación de tu póliza ${p.company}&body=Hola ${p.clientName},%0D%0A%0D%0ATu póliza de seguro está próxima a vencer. Nos gustaría revisar tus opciones de renovación.%0D%0A%0D%0ASaludos`}
                        className="inline-flex items-center justify-center p-2 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground rounded-md transition-colors"
                        title="Enviar correo de renovación"
                      >
                        <Mail className="w-4 h-4" />
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sin email</span>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No hay renovaciones pendientes en los próximos 75 días.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="glass-card p-5 animate-fade-in flex flex-col max-h-[400px] mt-8 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Pólizas Únicas (Clientes con 1 solo producto)</h3>
          <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full font-medium">
            {uniquePoliciesList.length} clientes
          </span>
        </div>
        <div className="overflow-y-auto flex-1 pr-2">
          <table className="w-full">
            <thead className="sticky top-0 bg-background/95 backdrop-blur-sm z-10">
              <tr className="border-b border-border/50">
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 uppercase tracking-wider">Cliente</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 uppercase tracking-wider">Teléfono</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 uppercase tracking-wider">Póliza</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 uppercase tracking-wider">Compañía</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 uppercase tracking-wider">Tipo</th>
              </tr>
            </thead>
            <tbody>
              {uniquePoliciesList.length > 0 ? uniquePoliciesList.map((p, i) => (
                <tr key={i} className="border-b border-border/30 hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium">
                    <button 
                      onClick={() => navigate(`/clients?clientId=${p.clientId}`)}
                      className="text-primary hover:underline focus:outline-none"
                    >
                      {p.clientName}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{p.clientPhone}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{p.policyNumber}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{p.company}</td>
                  <td className="px-4 py-3 text-sm text-primary font-medium">{p.category}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No hay clientes con pólizas únicas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </CRMLayout>
  );
}
