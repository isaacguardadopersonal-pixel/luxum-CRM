import { useMemo, useState } from "react";
import { CRMLayout } from "@/components/CRMLayout";
import { useClients } from "@/hooks/useClients";
import { useLanguage } from "@/contexts/LanguageContext";
import { getStatusColor, Client, Product, ChangeLog } from "@/lib/clientData";
import { Search, Filter, Download, Plus, ChevronLeft, ChevronRight, Phone, Mail, Eye, Upload, Edit, Trash2 } from "lucide-react";
import * as XLSX from 'xlsx';

export default function ClientsPage() {
  const { clients, loading, addClients, updateClient, deleteClient, deleteAllClients } = useClients();
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [editingClient, setEditingClient] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Client>>({});
  const [editReason, setEditReason] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [productForm, setProductForm] = useState<Partial<Product>>({ category: "Auto" });
  const productCategories = ["Auto", "Home", "Rent", "Comercial", "Commercial auto", "Life"];
  const formatPhoneInput = (value: string): string => {
    let digits = value.replace(/\D/g, "");
    if (digits.length > 0 && digits.startsWith("1")) {
      digits = digits.substring(1);
    }
    if (!digits) return "";
    let formatted = "+1 ";
    if (digits.length > 0) formatted += "(" + digits.substring(0, 3);
    if (digits.length >= 4) formatted += ") " + digits.substring(3, 6);
    if (digits.length >= 7) formatted += "-" + digits.substring(6, 10);
    return formatted;
  };
  const formatDateInput = (value: string): string => {
    const digits = value.replace(/\D/g, "");
    if (!digits) return "";
    let month = digits.substring(0, 2);
    if (month.length === 2 && parseInt(month) > 12) month = "12";
    if (month.length === 2 && parseInt(month) === 0) month = "01";
    let formatted = month;
    if (digits.length > 2) {
      formatted += "/";
      let day = digits.substring(2, 4);
      if (day.length === 2 && parseInt(day) > 31) day = "31";
      if (day.length === 2 && parseInt(day) === 0) day = "01";
      formatted += day;
    }
    if (digits.length > 4) {
      formatted += "/" + digits.substring(4, 8);
    }
    return formatted;
  };
  const getAllowedCompanies = (category: string) => {
    switch (category) {
      case "Auto": return ["Progressive", "National General", "Gainsco", "Geico"];
      case "Home":
      case "Rent": return ["National General", "Progressive"];
      case "Commercial auto": return ["Progressive", "National General", "Geico"];
      case "Comercial": return ["Next Ergo"];
      case "Life": return ["National Life Group"];
      default: return ["National General", "Progressive", "Gainsco", "Geico", "National Life Group", "Next Ergo"];
    }
  };
  const [addForm, setAddForm] = useState<Partial<Client>>({ status: "Quoting" });
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ company: "", dlState: "" });
  const perPage = 15;

  const statuses = ["all", "Current Customer", "Quoting", "Opportunities", "Not Interested"];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
      
      const newClients: Client[] = [];
      let startIdx = 0;
      if (data.length > 0) {
        const firstRow = ((data[0] as unknown[]) || []).map(v => String(v).toLowerCase());
        if (firstRow.includes('address') || firstRow.includes('city') || firstRow.includes('firstname')) {
          startIdx = 1;
        }
      }

      for (let i = startIdx; i < data.length; i++) {
        const row = data[i] as unknown[];
        if (!row || row.length === 0) continue;
        
        newClients.push({
            id: Math.random().toString(36).substring(2, 15) + Date.now().toString(36),
            address: String(row[0] || ""),
            city: String(row[1] || ""),
            state: String(row[2] || ""),
            firstName: String(row[3] || ""),
            lastName: String(row[4] || ""),
            workPhone: String(row[5] || ""),
            status: String(row[6] || ""),
            email: "", dob: "", driversLicense: "", dlState: "", zip: "",
            referredBy: "", notes: "", products: []
        });
      }

      if (newClients.length > 0) {
          addClients(newClients);
          setShowImportModal(false);
          e.target.value = "";
      } else {
        alert(t("clients.modal.import_error_empty"));
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImportData = () => {
    if (!importText.trim()) return;
    const lines = importText.trim().split('\n');
    const newClients: Client[] = [];
    
    const firstLine = lines[0].toLowerCase();
    let startIdx = 0;
    if (firstLine.includes('address') && firstLine.includes('city') && firstLine.includes('firstname')) {
        startIdx = 1;
    }

    for (let i = startIdx; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const columns = line.split('\t'); 
        
        if (columns.length >= 7) {
            newClients.push({
                id: Math.random().toString(36).substring(2, 15) + Date.now().toString(36),
                address: columns[0] || "",
                city: columns[1] || "",
                state: columns[2] || "",
                firstName: columns[3] || "",
                lastName: columns[4] || "",
                workPhone: columns[5] || "",
                status: columns[6] || "",
                email: "", dob: "", driversLicense: "", dlState: "", zip: "",
                referredBy: "", notes: "", products: []
            });
        }
    }

    if (newClients.length > 0) {
        addClients(newClients);
        setShowImportModal(false);
        setImportText("");
    } else {
        alert(t("clients.modal.import_error_invalid"));
    }
  };

  const handleAddNewClient = () => {
    if (!addForm.firstName?.trim() || !addForm.lastName?.trim() || !addForm.workPhone?.trim() || !addForm.dlState?.trim()) {
      alert(t("clients.modal.add_error_required"));
      return;
    }
    
    const createdProducts: Product[] = [];
    if (productForm.policyNumber || productForm.company || productForm.premium) {
      createdProducts.push({
        id: Math.random().toString(36).substring(2, 15),
        category: productForm.category || "Auto",
        firstName: productForm.firstName || addForm.firstName || "",
        lastName: productForm.lastName || addForm.lastName || "",
        policyNumber: productForm.policyNumber || "",
        company: productForm.company || "",
        premium: productForm.premium || 0,
        licenseNumber: productForm.licenseNumber || addForm.driversLicense || "",
        effectiveDate: productForm.effectiveDate || "",
        expirationDate: productForm.expirationDate || "",
        drivers: productForm.drivers || [],
        createdAt: new Date().toISOString()
      });
    }

    const newClient: Client = {
      id: Math.random().toString(36).substring(2, 15) + Date.now().toString(36),
      status: addForm.status || "Quoting",
      firstName: addForm.firstName || "",
      lastName: addForm.lastName || "",
      email: addForm.email || "",
      workPhone: addForm.workPhone || "",
      dob: addForm.dob || "",
      driversLicense: addForm.driversLicense || "",
      dlState: addForm.dlState || "",
      address: addForm.address || "",
      city: addForm.city || "",
      zip: addForm.zip || "",
      state: addForm.state || "",
      referredBy: addForm.referredBy || "",
      notes: addForm.notes || "",
      products: createdProducts
    };
    
    addClients([newClient]);
    setShowAddModal(false);
    setAddForm({ status: "Quoting" });
    setProductForm({ category: "Auto", drivers: [] });
  };

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      const matchesSearch =
        !search ||
        `${c.firstName} ${c.lastName} ${c.products?.[0]?.policyNumber || ""} ${c.email} ${c.products?.[0]?.company || ""}`
          .toLowerCase()
          .includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || c.status === statusFilter;
      const matchesCompany = !filters.company || (c.products && c.products.length > 0 && c.products[0].company === filters.company);
      const matchesDLState = !filters.dlState || c.dlState === filters.dlState;
      return matchesSearch && matchesStatus && matchesCompany && matchesDLState;
    });
  }, [clients, search, statusFilter, filters]);

  const uniqueCompanies = useMemo(() => Array.from(new Set(clients.map(c => c.products?.[0]?.company).filter(Boolean) as string[])).sort(), [clients]);
  const uniqueDLStates = useMemo(() => Array.from(new Set(clients.map(c => c.dlState).filter(Boolean))).sort(), [clients]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);
  const detail = selectedClient ? clients.find(c => c.id === selectedClient) || null : null;

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: clients.length };
    clients.forEach((c) => {
      counts[c.status] = (counts[c.status] || 0) + 1;
    });
    return counts;
  }, [clients]);

  if (loading) {
    return (
      <CRMLayout activePage="clients">
        <div className="flex items-center justify-center h-full">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </CRMLayout>
    );
  }

  return (
    <CRMLayout activePage="clients">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("clients.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{filtered.length} {t("clients.found")}</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              if(window.confirm("¿Estás absolutamente seguro de que deseas BORRAR TODOS los clientes? Esta acción eliminará toda la base de datos local y no se puede deshacer.")) {
                deleteAllClients();
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-destructive/10 text-destructive border border-destructive/30 rounded-lg text-sm font-medium hover:bg-destructive/20 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Borrar Todos
          </button>
          <button 
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-secondary text-foreground border border-border rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors"
          >
            <Upload className="w-4 h-4" />
            {t("common.import")}
          </button>
          <button 
            onClick={() => { setAddForm({ status: "Quoting" }); setProductForm({ category: "Auto", drivers: [] }); setShowAddModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            {t("clients.add_client")}
          </button>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-3 mb-6 flex-wrap">
        {statuses.map((s) => {
          const label = s === "all" ? t("status.all") : s === "Current Customer" ? t("status.actives") : s === "Quoting" ? t("status.quoting") : s === "Opportunities" ? t("status.opportunities_plural") : t("status.not_interested_plural");
          const colorClass =
            s === "Current Customer" ? "bg-success/15 text-success border-success/20" :
            s === "Quoting" ? "bg-warning/15 text-warning border-warning/20" :
            s === "Opportunities" ? "bg-info/15 text-info border-info/20" :
            s === "Not Interested" ? "bg-destructive/15 text-destructive border-destructive/20" :
            "bg-secondary text-secondary-foreground border-border";
          return (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                statusFilter === s ? colorClass : "bg-secondary/50 text-muted-foreground border-transparent hover:bg-secondary"
              }`}
            >
              {label}
              <span className="ml-2 text-xs opacity-70">{statusCounts[s] || 0}</span>
            </button>
          );
        })}
      </div>

      {/* Search & Actions */}
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={t("common.search_placeholder")}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 bg-secondary rounded-lg text-sm text-foreground placeholder:text-muted-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors border ${
              showFilters || filters.company || filters.dlState
                ? 'bg-primary/10 border-primary/30 text-primary' 
                : 'bg-secondary text-muted-foreground border-border hover:text-foreground'
            }`}
          >
            <Filter className="w-4 h-4" /> Filtros
          </button>
          <button className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors border border-border">
            <Download className="w-4 h-4" /> {t("common.export")}
          </button>
        </div>

        {/* Extended Filters */}
        {showFilters && (
          <div className="flex items-center gap-4 p-4 bg-secondary/40 rounded-lg border border-border animate-fade-in flex-wrap">
            <div className="flex flex-col gap-1.5 min-w-[160px]">
              <label className="text-xs font-medium text-muted-foreground">Compañía</label>
              <select 
                value={filters.company} 
                onChange={e => { setFilters({...filters, company: e.target.value}); setPage(1); }}
                className="w-full px-3 py-2 bg-background rounded-md text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50 appearance-none"
              >
                <option value="">Todas</option>
                {uniqueCompanies.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5 min-w-[160px]">
              <label className="text-xs font-medium text-muted-foreground">Estado DL</label>
              <select 
                value={filters.dlState} 
                onChange={e => { setFilters({...filters, dlState: e.target.value}); setPage(1); }}
                className="w-full px-3 py-2 bg-background rounded-md text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50 appearance-none"
              >
                <option value="">Todos</option>
                {uniqueDLStates.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            {(filters.company || filters.dlState) && (
              <button 
                onClick={() => { setFilters({ company: "", dlState: "" }); setPage(1); }}
                className="mt-6 text-xs text-muted-foreground hover:text-foreground font-medium underline underline-offset-2"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden animate-fade-in">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 uppercase tracking-wider">{t("clients.table.client")}</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 uppercase tracking-wider">{t("clients.table.company")}</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 uppercase tracking-wider">{t("clients.table.type")}</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 uppercase tracking-wider">{t("clients.table.premium")}</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 uppercase tracking-wider">{t("clients.table.expiration")}</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 uppercase tracking-wider">{t("clients.table.status")}</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 uppercase tracking-wider">{t("clients.table.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((client) => {
                const totalPremium = (client.products || []).reduce((sum, p) => sum + (p.premium || 0), 0);
                const primaryProduct = client.products && client.products.length > 0
                  ? client.products.reduce((max, obj) => (obj.premium || 0) > (max.premium || 0) ? obj : max)
                  : undefined;
                const productCount = (client.products || []).length;
                return (
                  <tr
                    key={client.id}
                    className="border-b border-border/30 hover:bg-secondary/30 transition-colors cursor-pointer"
                    onClick={() => setSelectedClient(client.id)}
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{client.firstName} {client.lastName}</p>
                        <p className="text-xs text-muted-foreground">{client.email || client.workPhone}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{primaryProduct?.company || "—"}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {productCount > 1 ? (
                        <span className="px-2 py-0.5 bg-primary/20 text-primary rounded-md font-medium text-xs">Bundle</span>
                      ) : (
                        primaryProduct?.category || "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground">
                      {totalPremium > 0 ? `$${totalPremium.toLocaleString()}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{primaryProduct?.expirationDate || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getStatusColor(client.status)}`}>
                        {client.status === "Current Customer" ? t("status.active") : client.status === "Quoting" ? t("status.quoting") : client.status === "Opportunities" ? t("status.opportunities") : client.status === "Not Interested" ? t("status.not_interested") : client.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if(window.confirm("¿Seguro que deseas eliminar este cliente por completo? Esta acción no se puede deshacer.")) {
                              deleteClient(client.id);
                            }
                          }}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          title="Eliminar Cliente"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        {client.workPhone && (
                          <a href={`tel:${client.workPhone}`} onClick={(e) => e.stopPropagation()} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {client.email && (
                          <a href={`mailto:${client.email}`} onClick={(e) => e.stopPropagation()} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                            <Mail className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
          <span className="text-xs text-muted-foreground">
            {t("clients.pagination.showing")} {(page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} {t("clients.pagination.of")} {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-foreground px-2">{page} / {totalPages}</span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Client Detail Modal */}
      {detail && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedClient(null)}>
          <div className="glass-card max-w-3xl w-full p-6 max-h-[80vh] overflow-y-auto animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-foreground">{detail.firstName} {detail.lastName}</h2>
                <button 
                  onClick={() => { setEditingClient(detail.id); setEditForm(detail); setEditReason(""); }}
                  className="p-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                  title="Editar cliente"
                >
                  <Edit className="w-4 h-4" />
                </button>
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getStatusColor(detail.status)}`}>
                {detail.status === "Current Customer" ? t("status.active") : detail.status === "Quoting" ? t("status.quoting") : detail.status === "Opportunities" ? t("status.opportunities") : detail.status === "Not Interested" ? t("status.not_interested") : detail.status}
              </span>
            </div>

            <div className="space-y-4">
              <Section title={t("field.contact")}>
                <Field label={t("field.email")} value={detail.email} />
                <Field label={t("field.phone")} value={detail.workPhone} />
                <Field label={t("field.address")} value={`${detail.address}, ${detail.city}, ${detail.state} ${detail.zip}`} />
              </Section>

              <Section title={t("field.id_section")}>
                <Field label={t("field.dob")} value={detail.dob} />
                <Field label={t("field.license")} value={detail.driversLicense} />
                <Field label={t("field.dl_state")} value={detail.dlState} />
              </Section>

              <Section title="Productos">
                {detail.products && detail.products.length > 0 ? (
                  <div className="space-y-3 mb-3">
                    {detail.products.map(prod => (
                      <div key={prod.id} className="p-3 bg-secondary/50 rounded-lg border border-border">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-semibold text-foreground">{prod.category}</span>
                          <span className="text-xs text-muted-foreground">{prod.company}</span>
                        </div>
                        <div className="grid grid-cols-1 gap-2 mt-2">
                          <Field label="Póliza" value={prod.policyNumber} />
                          <Field label="Prima" value={prod.premium ? `$${prod.premium.toLocaleString()}` : "—"} />
                          <Field label="Titular" value={`${prod.firstName} ${prod.lastName}`} />
                          <Field label="Licencia" value={prod.licenseNumber} />
                          <Field label="Vigencia" value={(prod.effectiveDate || prod.expirationDate) ? `${prod.effectiveDate || '—'} → ${prod.expirationDate || '—'}` : "—"} />
                        </div>
                        {prod.drivers && prod.drivers.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-border/50">
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase block mb-1">Conductores ({prod.drivers.length})</span>
                            <div className="flex flex-col gap-1">
                              {prod.drivers.map((d, i) => (
                                <div key={i} className="text-xs text-foreground flex justify-between">
                                  <span>{d.firstName} {d.lastName}</span>
                                  <span className="text-muted-foreground">{d.phone}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mb-3">No hay productos adicionales registrados.</p>
                )}
                <button 
                  onClick={() => {
                    setProductForm({
                      category: "Auto",
                      firstName: detail.firstName,
                      lastName: detail.lastName,
                      licenseNumber: detail.driversLicense,
                      effectiveDate: "",
                      expirationDate: "",
                      drivers: []
                    });
                    setShowProductModal(true);
                  }}
                  className="w-full py-2 bg-primary/10 text-primary border border-primary/20 rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors"
                >
                  + Agregar Producto
                </button>
              </Section>

              {(detail.referredBy || detail.notes) && (
                <Section title={t("field.additional")}>
                  {detail.referredBy && <Field label={t("field.referred_by")} value={detail.referredBy} />}
                  {detail.notes && <Field label={t("field.notes")} value={detail.notes} />}
                </Section>
              )}

              <Section title="Historial de Modificaciones">
                 {detail.logs && detail.logs.length > 0 ? (
                   <div className="space-y-3 mb-3">
                     {detail.logs.slice().reverse().map(log => (
                       <div key={log.id} className="p-3 bg-secondary/50 rounded-lg border border-border text-xs">
                         <div className="flex justify-between items-start mb-1">
                           <span className="font-semibold text-foreground text-primary">Edición</span>
                           <span className="text-muted-foreground">{new Date(log.date).toLocaleString()}</span>
                         </div>
                         <p className="text-foreground">{log.reason}</p>
                       </div>
                     ))}
                   </div>
                 ) : (
                   <p className="text-xs text-muted-foreground mb-3">No hay historial de cambios registrado.</p>
                 )}
              </Section>
            </div>

            <button
              onClick={() => setSelectedClient(null)}
              className="mt-6 w-full py-2.5 bg-secondary text-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors"
            >
              {t("common.close")}
            </button>
          </div>
        </div>
      )}

      {/* Edit Client Modal */}
      {editingClient && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={() => setEditingClient(null)}>
          <div className="glass-card max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-foreground mb-4">{t("clients.modal.edit_title")}</h2>
            <div className="space-y-6">
              
              <Section title={t("field.basic_info")}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">{t("field.first_name")}</label>
                    <input type="text" value={editForm.firstName || ""} onChange={(e) => setEditForm({...editForm, firstName: e.target.value})} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">{t("field.last_name")}</label>
                    <input type="text" value={editForm.lastName || ""} onChange={(e) => setEditForm({...editForm, lastName: e.target.value})} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">{t("clients.table.status")}</label>
                    <select value={editForm.status || ""} onChange={(e) => setEditForm({...editForm, status: e.target.value})} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50">
                      <option value="Current Customer">Current Customer</option>
                      <option value="Quoting">Quoting</option>
                      <option value="Opportunities">Opportunities</option>
                      <option value="Not Interested">Not Interested</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Referido por</label>
                    <input type="text" value={editForm.referredBy || ""} onChange={(e) => setEditForm({...editForm, referredBy: e.target.value})} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                  </div>
                </div>
              </Section>

              <Section title="Contacto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Teléfono</label>
                    <input type="text" value={editForm.workPhone || ""} onChange={(e) => setEditForm({...editForm, workPhone: formatPhoneInput(e.target.value)})} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Email</label>
                    <input type="email" value={editForm.email || ""} onChange={(e) => setEditForm({...editForm, email: e.target.value})} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs text-muted-foreground mb-1 block">Dirección</label>
                    <input type="text" value={editForm.address || ""} onChange={(e) => setEditForm({...editForm, address: e.target.value})} className="w-full px-3 py-2 mb-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" placeholder="Calle y número" />
                    <div className="grid grid-cols-3 gap-2">
                      <input type="text" value={editForm.city || ""} onChange={(e) => setEditForm({...editForm, city: e.target.value})} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" placeholder="Ciudad" />
                      <input type="text" value={editForm.state || ""} onChange={(e) => setEditForm({...editForm, state: e.target.value})} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" placeholder="Estado (ej. VA)" />
                      <input type="text" value={editForm.zip || ""} onChange={(e) => setEditForm({...editForm, zip: e.target.value})} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" placeholder="Código Postal" />
                    </div>
                  </div>
                </div>
              </Section>

              <Section title="Identificación">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Fecha de Nacimiento</label>
                    <input type="text" value={editForm.dob || ""} onChange={(e) => setEditForm({...editForm, dob: formatDateInput(e.target.value)})} placeholder="MM/DD/YYYY" className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Licencia</label>
                    <input type="text" value={editForm.driversLicense || ""} onChange={(e) => setEditForm({...editForm, driversLicense: e.target.value})} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Estado DL</label>
                    <input type="text" value={editForm.dlState || ""} onChange={(e) => setEditForm({...editForm, dlState: e.target.value})} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                  </div>
                </div>
              </Section>



              <Section title="Productos Asignados">
                 {editForm.products && editForm.products.length > 0 ? (
                   <div className="space-y-3 mt-2">
                     {editForm.products.map(p => (
                       <div key={p.id} className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg border border-border">
                         <div>
                           <p className="text-sm font-semibold text-foreground">{p.category} - {p.company}</p>
                           <p className="text-xs text-muted-foreground">{p.policyNumber || "Sin póliza"}</p>
                         </div>
                         <button 
                           onClick={(e) => {
                             e.preventDefault();
                             setProductForm(p);
                             setShowProductModal(true);
                           }} 
                           className="p-2 text-primary hover:bg-primary/10 rounded-md transition-colors"
                         >
                           <Edit className="w-4 h-4" />
                         </button>
                       </div>
                     ))}
                   </div>
                 ) : (
                   <p className="text-xs text-muted-foreground mt-2">Sin productos.</p>
                 )}
                 <button
                   onClick={(e) => {
                     e.preventDefault();
                     setProductForm({ category: "Auto", drivers: [] });
                     setShowProductModal(true);
                   }}
                   className="mt-3 text-xs w-full py-2 bg-primary/10 text-primary border border-primary/20 rounded-lg font-medium hover:bg-primary/20 transition-colors"
                 >
                   + Agregar Producto
                 </button>
              </Section>

              <Section title="Razón del Cambio / Comentario (Obligatorio)">
                 <textarea
                   value={editReason}
                   onChange={e => setEditReason(e.target.value)}
                   placeholder="Describe qué cambiaste y por qué..."
                   className="w-full mt-2 h-20 px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50 resize-y"
                 />
              </Section>
            </div>
            
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setEditingClient(null)} className="px-4 py-2 bg-secondary text-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors">
                Cancelar
              </button>
              <button 
                onClick={() => { 
                   if (!editReason.trim()) { alert("Debe ingresar una razón de cambio."); return; }
                   const newLog: ChangeLog = {
                       id: Math.random().toString(36).substring(2, 15),
                       date: new Date().toISOString(),
                       reason: editReason
                   };
                   const updatedLogs = [...(editForm.logs || []), newLog];
                   updateClient(editingClient, { ...editForm, logs: updatedLogs }); 
                   setEditingClient(null); 
                   setEditReason("");
                }} 
                className={`px-4 py-2 text-primary-foreground rounded-lg text-sm font-medium transition-opacity ${!editReason.trim() ? "bg-primary/50 cursor-not-allowed" : "bg-primary hover:opacity-90"}`}
                disabled={!editReason.trim()}
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Client Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
          <div className="glass-card max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-foreground mb-4">Agregar Nuevo Cliente</h2>
            <div className="space-y-6">
              
              <Section title="Información Básica">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Nombre <span className="text-destructive">*</span></label>
                    <input type="text" value={addForm.firstName || ""} onChange={(e) => setAddForm({...addForm, firstName: e.target.value})} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Apellido <span className="text-destructive">*</span></label>
                    <input type="text" value={addForm.lastName || ""} onChange={(e) => setAddForm({...addForm, lastName: e.target.value})} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Estado</label>
                    <select value={addForm.status || "Quoting"} onChange={(e) => setAddForm({...addForm, status: e.target.value})} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50">
                      <option value="Current Customer">Current Customer</option>
                      <option value="Quoting">Quoting</option>
                      <option value="Opportunities">Opportunities</option>
                      <option value="Not Interested">Not Interested</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Referido por</label>
                    <input type="text" value={addForm.referredBy || ""} onChange={(e) => setAddForm({...addForm, referredBy: e.target.value})} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                  </div>
                </div>
              </Section>

              <Section title="Contacto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Teléfono <span className="text-destructive">*</span></label>
                    <input type="text" value={addForm.workPhone || ""} onChange={(e) => setAddForm({...addForm, workPhone: formatPhoneInput(e.target.value)})} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Email</label>
                    <input type="email" value={addForm.email || ""} onChange={(e) => setAddForm({...addForm, email: e.target.value})} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs text-muted-foreground mb-1 block">Dirección</label>
                    <input type="text" value={addForm.address || ""} onChange={(e) => setAddForm({...addForm, address: e.target.value})} className="w-full px-3 py-2 mb-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" placeholder="Calle y número" />
                    <div className="grid grid-cols-3 gap-2">
                      <input type="text" value={addForm.city || ""} onChange={(e) => setAddForm({...addForm, city: e.target.value})} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" placeholder="Ciudad" />
                      <input type="text" value={addForm.state || ""} onChange={(e) => setAddForm({...addForm, state: e.target.value})} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" placeholder="Estado (ej. VA)" />
                      <input type="text" value={addForm.zip || ""} onChange={(e) => setAddForm({...addForm, zip: e.target.value})} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" placeholder="Código Postal" />
                    </div>
                  </div>
                </div>
              </Section>

              <Section title="Identificación">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Fecha de Nacimiento</label>
                    <input type="text" value={addForm.dob || ""} onChange={(e) => setAddForm({...addForm, dob: formatDateInput(e.target.value)})} placeholder="MM/DD/YYYY" className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Licencia</label>
                    <input type="text" value={addForm.driversLicense || ""} onChange={(e) => setAddForm({...addForm, driversLicense: e.target.value})} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Estado DL <span className="text-destructive">*</span></label>
                    <input type="text" value={addForm.dlState || ""} onChange={(e) => setAddForm({...addForm, dlState: e.target.value})} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                  </div>
                </div>
              </Section>

              <Section title="Agregar Producto (Opcional)">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Categoría de Producto</label>
                    <select 
                      value={productForm.category || "Auto"} 
                      onChange={(e) => {
                        const newCat = e.target.value;
                        const allowed = getAllowedCompanies(newCat);
                        setProductForm({...productForm, category: newCat, company: allowed.includes(productForm.company || "") ? productForm.company : ""});
                      }}
                      className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50"
                    >
                      {productCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Nombre en la póliza</label>
                      <input type="text" value={productForm.firstName || ""} onChange={(e) => setProductForm({...productForm, firstName: e.target.value})} placeholder={addForm.firstName} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Apellido en la póliza</label>
                      <input type="text" value={productForm.lastName || ""} onChange={(e) => setProductForm({...productForm, lastName: e.target.value})} placeholder={addForm.lastName} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Número de Póliza</label>
                      <input type="text" value={productForm.policyNumber || ""} onChange={(e) => setProductForm({...productForm, policyNumber: e.target.value})} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Compañía</label>
                      <select 
                        value={productForm.company || ""} 
                        onChange={(e) => setProductForm({...productForm, company: e.target.value})} 
                        className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50"
                      >
                        <option value="" disabled>Selecciona una compañía...</option>
                        {getAllowedCompanies(productForm.category || "Auto").map(comp => (
                          <option key={comp} value={comp}>{comp}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Prima ($)</label>
                      <input type="number" value={productForm.premium || ""} onChange={(e) => setProductForm({...productForm, premium: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Número de Licencia</label>
                      <input type="text" value={productForm.licenseNumber || ""} onChange={(e) => setProductForm({...productForm, licenseNumber: e.target.value})} placeholder={addForm.driversLicense} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Fecha de Efectividad</label>
                      <input type="text" value={productForm.effectiveDate || ""} onChange={(e) => setProductForm({...productForm, effectiveDate: formatDateInput(e.target.value)})} placeholder="MM/DD/YYYY" className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Fecha de Vencimiento</label>
                      <input type="text" value={productForm.expirationDate || ""} onChange={(e) => setProductForm({...productForm, expirationDate: formatDateInput(e.target.value)})} placeholder="MM/DD/YYYY" className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                    </div>
                  </div>

                  {/* Drivers Section */}
                  <div className="pt-2 border-t border-border/50">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">Conductores Adicionales</label>
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          const newDrivers = [...(productForm.drivers || []), { firstName: "", lastName: "", phone: "" }];
                          setProductForm({...productForm, drivers: newDrivers});
                        }}
                        className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-xs font-medium hover:bg-primary/20 transition-colors"
                      >
                        <Plus className="w-3 h-3" /> Add Driver
                      </button>
                    </div>
                    {productForm.drivers && productForm.drivers.length > 0 && (
                      <div className="space-y-3 mt-3">
                        {productForm.drivers.map((driver, idx) => (
                          <div key={idx} className="relative p-3 bg-secondary/30 rounded-lg border border-border/50">
                            <button 
                              onClick={(e) => {
                                e.preventDefault();
                                const newDrivers = productForm.drivers!.filter((_, i) => i !== idx);
                                setProductForm({...productForm, drivers: newDrivers});
                              }}
                              className="absolute right-2 top-2 p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <div className="grid grid-cols-2 gap-3 pr-8">
                              <div>
                                <label className="text-xs text-muted-foreground mb-1 block">Nombre</label>
                                <input type="text" value={driver.firstName} onChange={(e) => {
                                  const newDrivers = [...productForm.drivers!];
                                  newDrivers[idx].firstName = e.target.value;
                                  setProductForm({...productForm, drivers: newDrivers});
                                }} className="w-full px-3 py-2 bg-background rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                              </div>
                              <div>
                                <label className="text-xs text-muted-foreground mb-1 block">Apellido</label>
                                <input type="text" value={driver.lastName} onChange={(e) => {
                                  const newDrivers = [...productForm.drivers!];
                                  newDrivers[idx].lastName = e.target.value;
                                  setProductForm({...productForm, drivers: newDrivers});
                                }} className="w-full px-3 py-2 bg-background rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                              </div>
                              <div className="col-span-2">
                                <label className="text-xs text-muted-foreground mb-1 block">Teléfono</label>
                                <input type="text" value={driver.phone} onChange={(e) => {
                                  const newDrivers = [...productForm.drivers!];
                                  newDrivers[idx].phone = formatPhoneInput(e.target.value);
                                  setProductForm({...productForm, drivers: newDrivers});
                                }} placeholder="+1 (___) ___-____" className="w-full px-3 py-2 bg-background rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Section>

              <Section title="Adicional">
                <label className="text-xs text-muted-foreground mb-1 block">Notas de Seguimiento</label>
                <textarea 
                  value={addForm.notes || ""} 
                  onChange={(e) => setAddForm({...addForm, notes: e.target.value})} 
                  placeholder="Añade notas del cliente aquí..."
                  className="w-full h-32 px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50 resize-y" 
                />
              </Section>
            </div>
            
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 bg-secondary text-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors">
                Cancelar
              </button>
              <button 
                onClick={handleAddNewClient} 
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Crear Cliente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowImportModal(false)}>
          <div className="glass-card max-w-3xl w-full p-6 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="mb-6">
              <h2 className="text-lg font-bold text-foreground">Importar Base de Datos Externa</h2>
              <p className="text-sm text-muted-foreground mt-1">Sube un archivo (.xlsx, .csv) o pega la tabla desde Excel (separada por tabulaciones). Columnas: Address, City, state, FirstName, LastName, Phone, status</p>
            </div>

            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Address&#9;City&#9;state&#9;FirstName&#9;LastName&#9;Phone&#9;status&#10;7992 Community Dr&#9;Manassas&#9;VA&#9;Brian&#9;Plombon&#9;7033932823&#9;Opportunities"
              className="w-full h-64 p-4 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 mb-4 resize-none font-mono whitespace-pre"
            />
            
            <div className="flex justify-between items-center mt-2">
              <label className="flex items-center gap-2 px-4 py-2 bg-secondary text-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors cursor-pointer border border-border">
                <Upload className="w-4 h-4" />
                Subir Archivo (.xlsx)
                <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileUpload} />
              </label>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 bg-secondary text-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleImportData}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Importar Texto
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4" onClick={() => setShowProductModal(false)}>
          <div className="glass-card max-w-lg w-full p-6 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-foreground mb-4">Agregar Nuevo Producto</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Categoría de Producto</label>
                <select 
                  value={productForm.category || "Auto"} 
                  onChange={(e) => {
                    const newCat = e.target.value;
                    const allowed = getAllowedCompanies(newCat);
                    setProductForm({...productForm, category: newCat, company: allowed.includes(productForm.company || "") ? productForm.company : ""});
                  }}
                  className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50"
                >
                  {productCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Nombre</label>
                  <input type="text" value={productForm.firstName || ""} onChange={(e) => setProductForm({...productForm, firstName: e.target.value})} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Apellido</label>
                  <input type="text" value={productForm.lastName || ""} onChange={(e) => setProductForm({...productForm, lastName: e.target.value})} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Número de Póliza</label>
                  <input type="text" value={productForm.policyNumber || ""} onChange={(e) => setProductForm({...productForm, policyNumber: e.target.value})} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Compañía</label>
                  <select 
                    value={productForm.company || ""} 
                    onChange={(e) => setProductForm({...productForm, company: e.target.value})} 
                    className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option value="" disabled>Selecciona una compañía...</option>
                    {getAllowedCompanies(productForm.category || "Auto").map(comp => (
                      <option key={comp} value={comp}>{comp}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Prima ($)</label>
                  <input type="number" value={productForm.premium || ""} onChange={(e) => setProductForm({...productForm, premium: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Número de Licencia</label>
                  <input type="text" value={productForm.licenseNumber || ""} onChange={(e) => setProductForm({...productForm, licenseNumber: e.target.value})} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Fecha de Efectividad</label>
                  <input type="text" value={productForm.effectiveDate || ""} onChange={(e) => setProductForm({...productForm, effectiveDate: formatDateInput(e.target.value)})} placeholder="MM/DD/YYYY" className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Fecha de Vencimiento</label>
                  <input type="text" value={productForm.expirationDate || ""} onChange={(e) => setProductForm({...productForm, expirationDate: formatDateInput(e.target.value)})} placeholder="MM/DD/YYYY" className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                </div>
              </div>

              {/* Drivers Section */}
              <div className="pt-2 border-t border-border/50">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Conductores Adicionales</label>
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      const newDrivers = [...(productForm.drivers || []), { firstName: "", lastName: "", phone: "" }];
                      setProductForm({...productForm, drivers: newDrivers});
                    }}
                    className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-xs font-medium hover:bg-primary/20 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Add Driver
                  </button>
                </div>
                {productForm.drivers && productForm.drivers.length > 0 && (
                  <div className="space-y-3 mt-3">
                    {productForm.drivers.map((driver, idx) => (
                      <div key={idx} className="relative p-3 bg-secondary/30 rounded-lg border border-border/50">
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            const newDrivers = productForm.drivers!.filter((_, i) => i !== idx);
                            setProductForm({...productForm, drivers: newDrivers});
                          }}
                          className="absolute right-2 top-2 p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="grid grid-cols-2 gap-3 pr-8">
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Nombre</label>
                            <input type="text" value={driver.firstName} onChange={(e) => {
                              const newDrivers = [...productForm.drivers!];
                              newDrivers[idx].firstName = e.target.value;
                              setProductForm({...productForm, drivers: newDrivers});
                            }} className="w-full px-3 py-2 bg-background rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Apellido</label>
                            <input type="text" value={driver.lastName} onChange={(e) => {
                              const newDrivers = [...productForm.drivers!];
                              newDrivers[idx].lastName = e.target.value;
                              setProductForm({...productForm, drivers: newDrivers});
                            }} className="w-full px-3 py-2 bg-background rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                          </div>
                          <div className="col-span-2">
                            <label className="text-xs text-muted-foreground mb-1 block">Teléfono</label>
                            <input type="text" value={driver.phone} onChange={(e) => {
                              const newDrivers = [...productForm.drivers!];
                              newDrivers[idx].phone = formatPhoneInput(e.target.value);
                              setProductForm({...productForm, drivers: newDrivers});
                            }} placeholder="+1 (___) ___-____" className="w-full px-3 py-2 bg-background rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
            
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setShowProductModal(false)} className="px-4 py-2 bg-secondary text-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors">
                Cancelar
              </button>
              <button 
                onClick={() => {
                  const newProduct: Product = {
                    id: productForm.id || Math.random().toString(36).substring(2, 15),
                    category: productForm.category || "Auto",
                    firstName: productForm.firstName || "",
                    lastName: productForm.lastName || "",
                    policyNumber: productForm.policyNumber || "",
                    company: productForm.company || "",
                    premium: productForm.premium || 0,
                    licenseNumber: productForm.licenseNumber || "",
                    effectiveDate: productForm.effectiveDate || "",
                    expirationDate: productForm.expirationDate || "",
                    drivers: productForm.drivers || [],
                    createdAt: productForm.createdAt || new Date().toISOString()
                  };
                  
                  if (editingClient) {
                    const existingProducts = editForm.products || [];
                    if (productForm.id) {
                      setEditForm({ ...editForm, products: existingProducts.map(p => p.id === productForm.id ? newProduct : p) });
                    } else {
                      setEditForm({ ...editForm, products: [...existingProducts, newProduct] });
                    }
                    setShowProductModal(false);
                  } else if (detail) {
                    const updatedProducts = [...(detail.products || []), newProduct];
                    updateClient(detail.id, { products: updatedProducts });
                    setShowProductModal(false);
                  }
                }}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Guardar Producto
              </button>
            </div>
          </div>
        </div>
      )}
    </CRMLayout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{title}</h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  if (!value || value === "—") return null;
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-medium text-right max-w-[60%]">{value}</span>
    </div>
  );
}
