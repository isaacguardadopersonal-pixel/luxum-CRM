import { useMemo, useRef } from "react";
import { CRMLayout } from "@/components/CRMLayout";
import { useClients } from "@/hooks/useClients";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Download } from "lucide-react";
import ExcelJS from "exceljs";
import html2canvas from "html2canvas";
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
  const chartRef = useRef<HTMLDivElement>(null);

  const allPolicies = useMemo(() => {
    const policies: any[] = [];

    clients.forEach(client => {
      if (client.products && client.products.length > 0) {
        client.products.forEach(product => {
          policies.push({
            clientName: `${client.firstName} ${client.lastName}`,
            policyNumber: product.policyNumber || "N/A",
            company: product.company || "N/A",
            effectiveDate: product.effectiveDate || "N/A",
            expirationDate: product.expirationDate || "N/A"
          });
        });
      }
    });

    return policies;
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
    if (!chartRef.current) return;
    try {
      // 1. Capture chart
      const canvas = await html2canvas(chartRef.current, { backgroundColor: '#1a1b1e' }); // Use dark bg for visibility
      const base64Image = canvas.toDataURL('image/png');

      // 2. Create workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Reporte Activos');

      // 3. Add columns
      worksheet.columns = [
        { header: 'Cliente', key: 'clientName', width: 30 },
        { header: 'Número de Póliza', key: 'policyNumber', width: 25 },
        { header: 'Compañía', key: 'company', width: 30 },
        { header: 'Fecha Inicio', key: 'effectiveDate', width: 15 },
        { header: 'Fecha Finaliza', key: 'expirationDate', width: 15 },
      ];

      worksheet.getRow(1).font = { bold: true };

      allPolicies.forEach(policy => {
        worksheet.addRow(policy);
      });

      // 4. Add Image to worksheet
      const imageId = workbook.addImage({
        base64: base64Image,
        extension: 'png',
      });
      
      // Place image next to the table
      worksheet.addImage(imageId, {
        tl: { col: 6, row: 1 },
        ext: { width: 450, height: 300 }
      });

      // 5. Save file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, 'Reporte.xlsx');
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
            Listado de todos los productos (pólizas) y distribución por compañía.
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="glass-card p-5 lg:col-span-1 animate-fade-in flex flex-col items-center">
          <h3 className="font-semibold text-foreground w-full mb-4">Seguros por Compañía</h3>
          <div className="w-full h-[300px]" ref={chartRef}>
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie 
                  data={companyChartData} 
                  cx="50%" 
                  cy="50%" 
                  innerRadius={60} 
                  outerRadius={100} 
                  dataKey="value" 
                  paddingAngle={2}
                >
                  {companyChartData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ background: "hsl(228, 12%, 14%)", border: "1px solid hsl(228, 10%, 20%)", borderRadius: "8px", color: "hsl(210, 20%, 95%)" }} 
                />
                <Legend verticalAlign="bottom" height={36}/>
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-5 lg:col-span-2 animate-fade-in flex flex-col max-h-[400px]">
          <h3 className="font-semibold text-foreground mb-4">Listado de Pólizas (Todos los Productos)</h3>
          <div className="overflow-y-auto flex-1 pr-2">
            <table className="w-full">
              <thead className="sticky top-0 bg-background/95 backdrop-blur-sm z-10">
                <tr className="border-b border-border/50">
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 uppercase tracking-wider">Cliente</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 uppercase tracking-wider">Póliza</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 uppercase tracking-wider">Compañía</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 uppercase tracking-wider">Inicio</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 uppercase tracking-wider">Finaliza</th>
                </tr>
              </thead>
              <tbody>
                {allPolicies.length > 0 ? allPolicies.map((p, i) => (
                  <tr key={i} className="border-b border-border/30 hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{p.clientName}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{p.policyNumber}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{p.company}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{p.effectiveDate}</td>
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
    </CRMLayout>
  );
}
