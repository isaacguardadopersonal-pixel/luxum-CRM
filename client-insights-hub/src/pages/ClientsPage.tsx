import { useMemo, useState } from "react";
import { CRMLayout } from "@/components/CRMLayout";
import { useClients } from "@/hooks/useClients";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { getStatusColor, Client, Product, ChangeLog, Reminder, parseCSVRow } from "@/lib/clientData";
import { Search, Filter, Download, Plus, ChevronLeft, ChevronRight, ChevronDown, Phone, Mail, Eye, Upload, Edit, Trash2, RefreshCw } from "lucide-react";
import * as XLSX from 'xlsx';
import Papa from "papaparse";
import { FloatingEmailComposer } from "@/components/FloatingEmailComposer";

export default function ClientsPage() {
  const { clients, loading, addClients, updateClient, deleteClient, pullFromSupabase, deleteAllClients } = useClients();
  const { role, username } = useAuth();
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [editingClient, setEditingClient] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Client>>({});
  const [editReason, setEditReason] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddProductFields, setShowAddProductFields] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [productForm, setProductForm] = useState<Partial<Product>>({ category: "Auto" });
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderForm, setReminderForm] = useState<{ id?: string; date?: string; notes?: string }>({});
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [showDetailAddDriverModal, setShowDetailAddDriverModal] = useState(false);
  const [newDetailDriver, setNewDetailDriver] = useState<any>({});
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [emailClient, setEmailClient] = useState<Client | null>(null);
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [renewalProductTarget, setRenewalProductTarget] = useState<Product | null>(null);
  const [isSameProviderRenewal, setIsSameProviderRenewal] = useState(false);
  const [showActionSelectModal, setShowActionSelectModal] = useState(false);
  const [actionSelectType, setActionSelectType] = useState<'renovar' | 'reemplazar'>('renovar');
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
      case "Auto": return ["Progressive", "National General", "Gainsco", "Geico", "State Farm"];
      case "Home":
      case "Rent": return ["National General", "Progressive", "State Farm"];
      case "Commercial auto": return ["Progressive", "National General", "Geico", "State Farm"];
      case "Comercial": return ["Next Ergo", "State Farm"];
      case "Life": return ["National Life Group"];
      default: return ["National General", "Progressive", "Gainsco", "Geico", "National Life Group", "Next Ergo", "State Farm"];
    }
  };
  const [addForm, setAddForm] = useState<Partial<Client>>({ status: "Quoting" });
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ company: "", dlState: "" });
  const [activeDetailTab, setActiveDetailTab] = useState<"detalles" | "productos" | "recordatorios" | "modificaciones" | "notas">("detalles");
  const [showEditNotesModal, setShowEditNotesModal] = useState(false);
  const [editNotesValue, setEditNotesValue] = useState("");
  const perPage = 15;

  const statuses = ["all", "IMPORTANTE", "Website", "Current Customer", "Quoting", "Opportunities", "Not Interested"];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let globalReferral = "";
    if (file.name.includes("-")) {
      const parts = file.name.split("-");
      const afterHyphen = parts.slice(1).join("-").trim();
      globalReferral = afterHyphen.replace(/\.[^/.]+$/, "").trim();
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });

      const newClients: Client[] = [];

      for (const wsname of wb.SheetNames) {
        const ws = wb.Sheets[wsname];
        // raw: false asegura que las fechas (o números con formato) se conviertan a texto asumiendo el formato de Excel
        const data = XLSX.utils.sheet_to_json(ws, { defval: "", raw: false }) as Record<string, unknown>[];

        const mappedSheet = data.map(rawRow => {
          const rowData: Record<string, string> = {};
          for (const [key, value] of Object.entries(rawRow)) {
            rowData[key.trim()] = String(value).trim();
          }
          const parsed = parseCSVRow(rowData);
          parsed.created_by = 'unknown';
          if (globalReferral) {
            if (!parsed.referredBy) parsed.referredBy = globalReferral;
            parsed.status = 'IMPORTANTE';
          }
          return parsed;
        });

        newClients.push(...mappedSheet);
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

    // Papa.parse interceptará comas o tabuladores dinámicamente y emparejará la primera fila a llaves de Obj.
    const result = Papa.parse(importText.trim(), { header: true, skipEmptyLines: true });

    const newClients: Client[] = (result.data as Record<string, unknown>[]).map(rawRow => {
      const rowData: Record<string, string> = {};
      for (const [key, value] of Object.entries(rawRow)) {
        rowData[key.trim()] = String(value).trim();
      }
      const parsed = parseCSVRow(rowData);
      parsed.created_by = 'unknown';
      return parsed;
    });

    if (newClients.length > 0) {
      addClients(newClients);
      setShowImportModal(false);
      setImportText("");
    } else {
      alert(t("clients.modal.import_error_invalid"));
    }
  };

  const handleExport = () => {
    const flatData = clients.flatMap(c => {
      const base = {
        "First Name": c.firstName || "",
        "Last Name": c.lastName || "",
        "Email": c.email || "",
        "Work Phone": c.workPhone || "",
        "DOB": c.dob || "",
        "Drivers License #": c.driversLicense || "",
        "DL State": c.dlState || "",
        "Address": c.address || "",
        "City": c.city || "",
        "State": c.state || "",
        "Zip": c.zip || "",
        "Status": c.status || "",
        "Referred By": c.referredBy || "",
        "Notes": c.notes || ""
      };

      if (!c.products || c.products.length === 0) {
        return [{ ...base, "Policy Number": "", "Company": "", "Premium": "", "Policy Type": "", "Effective Date": "", "Expiration Date": "" }];
      }

      return c.products.map(p => ({
        ...base,
        "Policy Number": p.policyNumber || "",
        "Company": p.company || "",
        "Premium": p.premium || "",
        "Policy Type": p.category || "",
        "Effective Date": p.effectiveDate || "",
        "Expiration Date": p.expirationDate || ""
      }));
    });

    const ws = XLSX.utils.json_to_sheet(flatData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clientes");

    const now = new Date();
    const date = now.toLocaleDateString('es-ES').replace(/\//g, '-');
    const time = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }).replace(/:/g, '');
    XLSX.writeFile(wb, `LUXUM ${date} ${time}.xlsx`);
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
      products: createdProducts,
      reminders: [],
      logs: [],
      drivers: addForm.drivers || [],
      created_by: username || 'unknown'
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
        `${c.firstName} ${c.lastName} ${c.products?.[0]?.policyNumber || ""} ${c.email} ${c.products?.[0]?.company || ""} ${c.referredBy || ""}`
          .toLowerCase()
          .includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all"
        ? !["Opportunities", "Website", "IMPORTANTE"].includes(c.status)
        : c.status === statusFilter;
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
    const counts: Record<string, number> = {
      all: clients.filter(c => !["Opportunities", "Website", "IMPORTANTE"].includes(c.status)).length
    };
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
          <h1 className="text-2xl font-bold text-foreground">Lista de Clientes de {username || "Luxum"}</h1>
          <p className="text-sm text-muted-foreground mt-1">{filtered.length} {t("clients.found")}</p>
        </div>
        <div className="flex items-center gap-3">
          {role === 'admin' && (
            <>
              <button
                onClick={() => {
                  if (window.confirm("¿Estás absolutamente seguro de que deseas BORRAR TODOS los clientes? Esta acción eliminará toda la base de datos local y no se puede deshacer.")) {
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
            </>
          )}
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
          const label = s === "all" ? t("status.all") : s === "IMPORTANTE" ? "Importante" : s === "Website" ? "Website" : s === "Current Customer" ? t("status.actives") : s === "Quoting" ? t("status.quoting") : s === "Opportunities" ? t("status.opportunities_plural") : t("status.not_interested_plural");
          const colorClass =
            s === "IMPORTANTE" ? "bg-purple-500/15 text-purple-400 border-purple-500/20" :
              s === "Website" ? "bg-blue-500/15 text-blue-400 border-blue-500/20" :
                s === "Current Customer" ? "bg-success/15 text-success border-success/20" :
                  s === "Quoting" ? "bg-warning/15 text-warning border-warning/20" :
                    s === "Opportunities" ? "bg-info/15 text-info border-info/20" :
                      s === "Not Interested" ? "bg-destructive/15 text-destructive border-destructive/20" :
                        "bg-secondary text-secondary-foreground border-border";
          return (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${statusFilter === s ? colorClass : "bg-secondary/50 text-muted-foreground border-transparent hover:bg-secondary"
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
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors border ${showFilters || filters.company || filters.dlState
              ? 'bg-primary/10 border-primary/30 text-primary'
              : 'bg-secondary text-muted-foreground border-border hover:text-foreground'
              }`}
          >
            <Filter className="w-4 h-4" /> Filtros
          </button>
          {role === 'admin' && (
            <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors border border-border">
              <Download className="w-4 h-4" /> {t("common.export")}
            </button>
          )}
        </div>

        {/* Extended Filters */}
        {showFilters && (
          <div className="flex items-center gap-4 p-4 bg-secondary/40 rounded-lg border border-border animate-fade-in flex-wrap">
            <div className="flex flex-col gap-1.5 min-w-[160px]">
              <label className="text-xs font-medium text-muted-foreground">Compañía</label>
              <select
                value={filters.company}
                onChange={e => { setFilters({ ...filters, company: e.target.value }); setPage(1); }}
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
                onChange={e => { setFilters({ ...filters, dlState: e.target.value }); setPage(1); }}
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
                const activeProducts = (client.products || []).filter(p => !p.status || (!p.status.toLowerCase().includes('cancelad') && !p.status.toLowerCase().includes('removida') && !p.status.toLowerCase().includes('finalizada') && !p.status.toLowerCase().includes('inactiva')));
                const totalPremium = activeProducts.reduce((sum, p) => sum + (p.premium || 0), 0);
                const primaryProduct = activeProducts.length > 0
                  ? activeProducts.reduce((max, obj) => (obj.premium || 0) > (max.premium || 0) ? obj : max)
                  : undefined;
                const uniqueCategories = new Set(activeProducts.map(p => p.category));
                const productCount = uniqueCategories.size;
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
                        {client.status === "IMPORTANTE" ? "Importante" : client.status === "Website" ? "Website" : client.status === "Current Customer" ? t("status.active") : client.status === "Quoting" ? t("status.quoting") : client.status === "Opportunities" ? t("status.opportunities") : client.status === "Not Interested" ? t("status.not_interested") : client.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm("¿Seguro que deseas eliminar este cliente por completo? Esta acción no se puede deshacer.")) {
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
                          <button onClick={(e) => { e.stopPropagation(); setEmailClient(client); }} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Enviar Correo">
                            <Mail className="w-3.5 h-3.5" />
                          </button>
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
          <div className="glass-card max-w-[90vw] md:max-w-6xl w-full p-6 max-h-[90vh] overflow-y-auto custom-scrollbar animate-fade-in flex flex-col" onClick={(e) => e.stopPropagation()}>

            {/* 1. INFORMACIÓN PRINCIPAL (Cabecera Global) */}
            <div className="w-full mb-6 pb-6 border-b border-border/50">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                {/* Lado Izquierdo: Nombre, Creador y Estado */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                      {detail.firstName} {detail.lastName}
                    </h2>
                    {(role === 'admin' || detail.created_by === username || detail.created_by === 'unknown') && (
                      <button
                        onClick={() => { setEditingClient(detail.id); setEditForm(detail); setEditReason(""); }}
                        className="p-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                        title="Editar cliente"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <button
                        onClick={() => {
                          if (role === 'admin' || detail.created_by === username || detail.created_by === 'unknown') {
                            setShowStatusDropdown(!showStatusDropdown);
                          }
                        }}
                        className={`text-xs font-medium px-4 py-1.5 rounded-full border transition-colors flex items-center gap-1.5 shadow-sm ${getStatusColor(detail.status)} ${(role === 'admin' || detail.created_by === username || detail.created_by === 'unknown') ? 'cursor-pointer hover:border-border/80' : 'cursor-not-allowed opacity-80'}`}
                      >
                        {detail.status === "Current Customer" ? t("status.active") :
                          detail.status === "Quoting" ? t("status.quoting") :
                            detail.status === "Opportunities" ? t("status.opportunities") :
                              detail.status === "Not Interested" ? t("status.not_interested") :
                                detail.status}
                        {(role === 'admin' || detail.created_by === username || detail.created_by === 'unknown') && (
                          <ChevronDown className={`w-3.5 h-3.5 opacity-70 transition-transform duration-200 ${showStatusDropdown ? 'rotate-180' : ''}`} />
                        )}
                      </button>

                      {showStatusDropdown && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowStatusDropdown(false)}></div>
                          <div className="absolute top-full mt-2 left-0 w-44 bg-[#1e2343] border border-border/40 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] overflow-hidden z-50 animate-fade-in backdrop-blur-xl">
                            <div className="p-1">
                              {[
                                { val: "Current Customer", label: t("status.active") },
                                { val: "Quoting", label: t("status.quoting") },
                                { val: "Opportunities", label: t("status.opportunities") },
                                { val: "Not Interested", label: t("status.not_interested") },
                                { val: "IMPORTANTE", label: "Importante" },
                                { val: "Website", label: "Website" },
                              ].map(opt => (
                                <button
                                  key={opt.val}
                                  onClick={() => {
                                    updateClient(detail.id, { status: opt.val });
                                    setShowStatusDropdown(false);
                                  }}
                                  className={`w-full text-left px-3 py-2 text-xs font-medium transition-all rounded-lg flex items-center ${detail.status === opt.val ? 'bg-primary/20 text-primary' : 'text-foreground/80 hover:bg-white/5 hover:text-foreground'}`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Centro: Contacto Primario */}
                <div className="flex-1 max-w-md bg-secondary/30 p-4 rounded-xl border border-border/40">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <span className="block text-[10px] uppercase text-muted-foreground font-semibold mb-1">Teléfono</span>
                      <span className="text-sm font-medium text-foreground">{detail.workPhone || "—"}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase text-muted-foreground font-semibold mb-1">Email</span>
                      <span className="text-sm font-medium text-foreground truncate block">{detail.email || "—"}</span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="block text-[10px] uppercase text-muted-foreground font-semibold mb-1">Dirección</span>
                      <span className="text-sm font-medium text-foreground truncate block">
                        {detail.address ? `${detail.address}, ${detail.city}, ${detail.state} ${detail.zip}` : "—"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Botón de Cierre */}
                <div className="flex self-start justify-end">
                  <button onClick={() => setSelectedClient(null)} className="p-2 bg-secondary text-muted-foreground rounded-lg hover:bg-secondary/80 hover:text-foreground transition-colors shadow-sm">
                    <span className="text-xl leading-none">&times;</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 2. NAVEGACIÓN POR PESTAÑAS (Tabs tipo Píldora) */}
            <div className="flex flex-wrap mt-8 mb-6 gap-4 pb-3 pt-2 px-2 w-full justify-center">
              {[
                { id: "detalles", label: "Detalles" },
                { id: "productos", label: "Productos" },
                { id: "recordatorios", label: "Recordatorios" },
                { id: "modificaciones", label: "Modificaciones" },
                { id: "notas", label: "Notas" },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveDetailTab(tab.id as any)}
                  className={`px-8 py-3 rounded-full text-sm md:text-base font-bold transition-all border whitespace-nowrap flex items-center justify-center ${activeDetailTab === tab.id
                    ? "bg-[#fca311] text-[#0f172a] border-[#fca311] shadow-[0_4px_15px_-3px_rgba(252,163,17,0.5)] scale-105"
                    : "bg-[#1e2343] text-white/80 border-white/10 hover:bg-[#2a3055] hover:text-white hover:border-white/30 hover:scale-105"
                    }`}
                  style={{ minWidth: '140px' }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* 3. CONTENIDO DE LA PESTAÑA */}
            <div className="flex-1 min-h-[400px] bg-secondary/10 rounded-2xl border border-border/20 relative">

              {/* === MÓDULO 1: DETALLES === */}
              {activeDetailTab === "detalles" && (
                <div className="p-6 h-full flex flex-col animate-fade-in">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-bold text-primary uppercase tracking-wider">Información Detallada</h3>
                    <button
                      onClick={(e) => { e.preventDefault(); setNewDetailDriver({}); setShowDetailAddDriverModal(true); }}
                      className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:bg-primary/90 transition-all shadow-md shadow-primary/20 hover:scale-105"
                    >
                      + Add Driver
                    </button>
                  </div>

                  <div className="space-y-6 flex-1">
                    <div className="flex flex-col border border-border/30 rounded-xl overflow-hidden bg-secondary/10 shadow-sm">
                      <div className="flex justify-between items-center p-4 border-b border-border/30 hover:bg-secondary/30 transition-colors">
                        <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{t("field.dob")}</span>
                        <span className="text-base font-medium text-foreground">{detail.dob || "—"}</span>
                      </div>
                      <div className="flex justify-between items-center p-4 border-b border-border/30 hover:bg-secondary/30 transition-colors">
                        <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{t("field.license")}</span>
                        <span className="text-base font-medium text-foreground">{detail.driversLicense || "—"}</span>
                      </div>
                      <div className="flex justify-between items-center p-4 border-b border-border/30 hover:bg-secondary/30 transition-colors">
                        <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{t("field.dl_state")}</span>
                        <span className="text-base font-medium text-foreground">{detail.dlState || "—"}</span>
                      </div>
                      <div className="flex justify-between items-center p-4 hover:bg-secondary/30 transition-colors">
                        <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{t("field.referred_by")}</span>
                        <span className="text-base font-medium text-foreground">{detail.referredBy || "—"}</span>
                      </div>
                    </div>

                    {detail.drivers && detail.drivers.length > 0 && (
                      <div className="pt-4 border-t border-border/30">
                        <span className="text-sm text-foreground mb-3 block font-semibold">Conductores Adicionales:</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {detail.drivers.map((d: any, i: number) => (
                            <div key={i} className="p-4 bg-secondary/40 rounded-xl border border-border/50 shadow-sm">
                              <div className="flex justify-between font-bold text-foreground mb-2">
                                <span>{d.firstName || d.first_name} {d.lastName || d.last_name}</span>
                              </div>
                              <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                                <span>Tel: {d.phone || '—'}</span>
                                <span>DOB: {d.dob || '—'}</span>
                                <span>Lic: {d.driversLicense || d.drivers_license || '—'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* === MÓDULO: NOTAS === */}
              {activeDetailTab === "notas" && (
                <div className="p-6 h-full flex flex-col animate-fade-in">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-bold text-primary uppercase tracking-wider">Notas del Cliente</h3>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setEditNotesValue(detail.notes || "");
                        setShowEditNotesModal(true);
                      }}
                      className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:bg-primary/90 transition-all shadow-md shadow-primary/20 hover:scale-105"
                    >
                      <Edit className="w-3.5 h-3.5" /> Editar Notas
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                    {detail.notes ? (
                      <p className="text-sm text-foreground bg-secondary/30 p-5 rounded-xl border border-border/30 whitespace-pre-wrap leading-relaxed shadow-inner">
                        {detail.notes}
                      </p>
                    ) : (
                      <div className="h-full flex items-center justify-center p-10 bg-secondary/20 rounded-xl border border-border/20 border-dashed">
                        <div className="text-center">
                          <p className="text-sm font-medium text-foreground mb-1">Este cliente no tiene notas.</p>
                          <p className="text-xs text-muted-foreground">Usa el botón "Editar Notas" para agregar información adicional importante.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* === MÓDULO 2: PRODUCTOS === */}
              {activeDetailTab === "productos" && (
                <div className="p-6 h-full flex flex-col animate-fade-in">
                  <div className="flex justify-between items-center mb-6 shrink-0">
                    <h3 className="text-sm font-bold text-primary uppercase tracking-wider">Catálogo de Productos</h3>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setActionSelectType('renovar');
                          setShowActionSelectModal(true);
                        }}
                        className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:bg-primary/90 transition-all shadow-md shadow-primary/20 hover:scale-105"
                      >
                        Renovar
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setActionSelectType('reemplazar');
                          setShowActionSelectModal(true);
                        }}
                        className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:bg-primary/90 transition-all shadow-md shadow-primary/20 hover:scale-105"
                      >
                        Reemplazar
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
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
                        className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:bg-primary/90 transition-all shadow-md shadow-primary/20 hover:scale-105"
                      >
                        + Agregar Producto
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                    {detail.products && detail.products.length > 0 ? (
                      [...detail.products].sort((a, b) => {
                        const isAActive = !a.status || a.status === 'Activa' || a.tipo_movimiento === 'Fidelización';
                        const isBActive = !b.status || b.status === 'Activa' || b.tipo_movimiento === 'Fidelización';
                        if (isAActive && !isBActive) return -1;
                        if (!isAActive && isBActive) return 1;
                        return 0;
                      }).map(prod => (
                        <div key={prod.id} className={`p-4 rounded-xl border ${prod.status === 'Cancelada por Reemplazo' || prod.status === 'Renovada' || prod.status === 'Inactiva' || prod.status === 'Removida por Reemplazo' || prod.status === 'Finalizada' ? 'bg-secondary/30 border-border/30 opacity-75' : 'bg-secondary/80 border-border/80 shadow-md'}`}>
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="text-base font-bold text-foreground">{prod.category}</span>
                              <span className="text-sm text-muted-foreground font-mono bg-background/50 px-2 py-1 rounded-md">#{prod.policyNumber || 'N/A'}</span>
                              {(prod.status === 'Cancelada por Reemplazo' || prod.status === 'Removida por Reemplazo') && (
                                <span className="px-2 py-1 text-xs font-bold bg-destructive/15 text-destructive rounded-md uppercase tracking-wider">Removida</span>
                              )}
                              {prod.status === 'Inactiva' && (
                                <span className="px-2 py-1 text-xs font-bold bg-destructive/15 text-destructive rounded-md uppercase tracking-wider">Inactiva</span>
                              )}
                              {prod.status === 'Renovada' && (
                                <span className="px-2 py-1 text-xs font-bold bg-info/15 text-info rounded-md uppercase tracking-wider">Renovada</span>
                              )}
                              {prod.status === 'Finalizada' && (
                                <span className="px-2 py-1 text-xs font-bold bg-success/15 text-success rounded-md uppercase tracking-wider">Finalizada</span>
                              )}
                              {(!prod.status || prod.status === 'Activa') && (
                                <span className="px-2 py-1 text-xs font-bold bg-success/15 text-success rounded-md uppercase tracking-wider">
                                  {prod.tipo_movimiento === 'Fidelización' ? 'Fidelización' : 'Vigente'}
                                </span>
                              )}
                            </div>
                            <span className="text-lg font-bold text-primary">{prod.premium ? `$${prod.premium.toLocaleString()}` : "—"}</span>
                          </div>

                          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mt-3 pt-3 border-t border-border/30 gap-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 text-sm text-foreground/80">
                              <div><span className="text-xs text-muted-foreground block mb-0.5">Compañía</span><span className="font-medium">{prod.company}</span></div>
                              <div><span className="text-xs text-muted-foreground block mb-0.5">Vigencia</span><span className="font-medium">{prod.expirationDate || '—'}</span></div>
                              <div><span className="text-xs text-muted-foreground block mb-0.5">Titular</span><span className="font-medium">{prod.firstName} {prod.lastName}</span></div>
                            </div>

                            <div className="flex gap-2 items-center w-full md:w-auto justify-end">

                              {(role === 'admin' || detail.created_by === username || detail.created_by === 'unknown') && (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setProductForm(prod);
                                    setIsSameProviderRenewal(false);
                                    setShowProductModal(true);
                                  }}
                                  className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors bg-secondary/50"
                                  title="Editar"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                              )}
                              {(role === 'admin' || detail.created_by === username || detail.created_by === 'unknown') && (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    if (window.confirm("¿Estás seguro de que deseas eliminar este producto?")) {
                                      const updatedProducts = detail.products?.filter(p => p.id !== prod.id) || [];
                                      updateClient(detail.id, {
                                        products: updatedProducts,
                                        logs: [...(detail.logs || []), { id: Math.random().toString(36).substring(2, 9), date: new Date().toISOString(), reason: `[${username}] Eliminó producto: ${prod.category} - ${prod.policyNumber}` }]
                                      });
                                    }
                                  }}
                                  className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors bg-secondary/50"
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="h-full flex items-center justify-center p-10 bg-secondary/20 rounded-xl border border-border/20 border-dashed">
                        <div className="text-center">
                          <p className="text-sm font-medium text-foreground mb-1">Aún no hay productos registrados.</p>
                          <p className="text-xs text-muted-foreground">Haz clic en "Agregar Producto" para comenzar.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* === MÓDULO 3: RECORDATORIOS === */}
              {activeDetailTab === "recordatorios" && (
                <div className="p-6 h-full flex flex-col animate-fade-in">
                  <div className="flex justify-between items-center mb-6 shrink-0">
                    <h3 className="text-sm font-bold text-primary uppercase tracking-wider">Agenda y Recordatorios</h3>
                    <button
                      onClick={() => {
                        setReminderForm({ date: "", notes: "" });
                        setShowReminderModal(true);
                      }}
                      className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:bg-primary/90 transition-all shadow-md shadow-primary/20 hover:scale-105"
                    >
                      + Agendar Nuevo
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                    {detail.reminders && detail.reminders.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {detail.reminders.map((r, i) => (
                          <div key={i} className="p-4 bg-secondary/50 rounded-xl border border-border shadow-sm">
                            <div className="flex justify-between items-center mb-2 pb-2 border-b border-border/30">
                              <span className="text-sm font-bold text-foreground flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                                Para: <span className="text-primary">{r.date}</span>
                              </span>
                              <span className="text-xs text-muted-foreground">Creado: {new Date(r.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p className="text-sm text-foreground/90 mt-2 leading-relaxed">{r.notes}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center p-10 bg-secondary/20 rounded-xl border border-border/20 border-dashed">
                        <p className="text-sm text-muted-foreground">No hay recordatorios agendados para este cliente.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* === MÓDULO 4: MODIFICACIONES === */}
              {activeDetailTab === "modificaciones" && (
                <div className="p-6 h-full flex flex-col animate-fade-in">
                  <div className="flex justify-between items-center mb-6 shrink-0">
                    <div>
                      <h3 className="text-sm font-bold text-primary uppercase tracking-wider">Historial de Cambios</h3>
                      <p className="text-xs text-muted-foreground mt-1">Registros de actividad para este cliente. Creado por: {detail.created_by || 'unknown'}</p>
                    </div>
                    <button
                      onClick={() => {
                        setNoteText("");
                        setShowAddNoteModal(true);
                      }}
                      className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:bg-primary/90 transition-all shadow-md shadow-primary/20 hover:scale-105"
                    >
                      + Agregar Registro
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                    {detail.logs && detail.logs.length > 0 ? (
                      detail.logs.slice().reverse().map(log => (
                        <div key={log.id} className="p-4 bg-secondary/30 rounded-xl border border-border flex flex-col md:flex-row md:items-start gap-4">
                          <div className="shrink-0 bg-background/50 px-3 py-1.5 rounded-lg border border-border/50 text-center w-auto md:w-32">
                            <span className="text-[10px] uppercase text-muted-foreground font-bold block mb-0.5">Fecha</span>
                            <span className="text-xs font-mono text-foreground">{new Date(log.date).toLocaleDateString()}</span>
                            <span className="text-[10px] font-mono text-muted-foreground block mt-0.5">{new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div className="flex-1 pt-1">
                            <p className="text-sm text-foreground/90">{log.reason}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="h-full flex items-center justify-center p-10 bg-secondary/20 rounded-xl border border-border/20 border-dashed">
                        <p className="text-sm text-muted-foreground">No hay historial de cambios registrado.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
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
                    <input type="text" value={editForm.firstName || ""} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">{t("field.last_name")}</label>
                    <input type="text" value={editForm.lastName || ""} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">{t("clients.table.status")}</label>
                    <select value={editForm.status || ""} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50">
                      <option value="Current Customer">Current Customer</option>
                      <option value="Quoting">Quoting</option>
                      <option value="Opportunities">Opportunities</option>
                      <option value="Not Interested">Not Interested</option>
                      <option value="IMPORTANTE">IMPORTANTE</option>
                      <option value="Website">Website</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Referido por</label>
                    <input type="text" value={editForm.referredBy || ""} onChange={(e) => setEditForm({ ...editForm, referredBy: e.target.value })} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                  </div>
                </div>
              </Section>

              <Section title="Contacto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Teléfono</label>
                    <input type="text" value={editForm.workPhone || ""} onChange={(e) => setEditForm({ ...editForm, workPhone: formatPhoneInput(e.target.value) })} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Email</label>
                    <input type="email" value={editForm.email || ""} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs text-muted-foreground mb-1 block">Dirección</label>
                    <input type="text" value={editForm.address || ""} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} className="w-full px-3 py-2 mb-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" placeholder="Calle y número" />
                    <div className="grid grid-cols-3 gap-2">
                      <input type="text" value={editForm.city || ""} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" placeholder="Ciudad" />
                      <input type="text" value={editForm.state || ""} onChange={(e) => setEditForm({ ...editForm, state: e.target.value })} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" placeholder="Estado (ej. VA)" />
                      <input type="text" value={editForm.zip || ""} onChange={(e) => setEditForm({ ...editForm, zip: e.target.value })} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" placeholder="Código Postal" />
                    </div>
                  </div>
                </div>
              </Section>

              <Section title="Identificación">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Fecha de Nacimiento</label>
                    <input type="text" value={editForm.dob || ""} onChange={(e) => setEditForm({ ...editForm, dob: formatDateInput(e.target.value) })} placeholder="MM/DD/YYYY" className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Licencia</label>
                    <input type="text" value={editForm.driversLicense || ""} onChange={(e) => setEditForm({ ...editForm, driversLicense: e.target.value })} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Estado DL</label>
                    <input type="text" value={editForm.dlState || ""} onChange={(e) => setEditForm({ ...editForm, dlState: e.target.value })} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                  </div>
                </div>
              </Section>



              <Section title="Productos Asignados">
                {editForm.products && editForm.products.length > 0 ? (
                  <div className="space-y-3 mt-2">
                    {editForm.products.map(p => (
                      <div key={p.id} className={`flex justify-between items-center p-3 rounded-lg border border-border ${p.status === 'Cancelada por Reemplazo' ? 'bg-secondary/30 opacity-75' : 'bg-secondary/50'}`}>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">{p.category} - {p.company}</p>
                            {p.status === 'Cancelada por Reemplazo' && (
                              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-destructive/15 text-destructive rounded-sm">Cancelada</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{p.policyNumber || "Sin póliza"}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          {role === "admin" && (!p.status || p.status === 'Activa') && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                setProductForm({
                                  ...p,
                                  id: "",
                                  id_poliza_padre: p.id,
                                  tipo_movimiento: "Reemplazo",
                                  createdAt: new Date().toISOString()
                                });
                                setShowProductModal(true);
                              }}
                              className="p-2 text-warning hover:bg-warning/10 rounded-md transition-colors"
                              title="Reemplazar Producto"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                          )}
                          {role === "admin" && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                setProductForm(p);
                                setShowProductModal(true);
                              }}
                              className="p-2 text-primary hover:bg-primary/10 rounded-md transition-colors"
                              title="Editar Producto"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                        </div>
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
                    reason: `[${username || 'Usuario'}] ${editReason}`
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
                    <input type="text" value={addForm.firstName || ""} onChange={(e) => setAddForm({ ...addForm, firstName: e.target.value })} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Apellido <span className="text-destructive">*</span></label>
                    <input type="text" value={addForm.lastName || ""} onChange={(e) => setAddForm({ ...addForm, lastName: e.target.value })} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Estado</label>
                    <select value={addForm.status || "Quoting"} onChange={(e) => setAddForm({ ...addForm, status: e.target.value })} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50">
                      <option value="Current Customer">Current Customer</option>
                      <option value="Quoting">Quoting</option>
                      <option value="Opportunities">Opportunities</option>
                      <option value="Not Interested">Not Interested</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Referido por</label>
                    <input type="text" value={addForm.referredBy || ""} onChange={(e) => setAddForm({ ...addForm, referredBy: e.target.value })} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                  </div>
                </div>
              </Section>

              <Section title="Contacto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Teléfono <span className="text-destructive">*</span></label>
                    <input type="text" value={addForm.workPhone || ""} onChange={(e) => setAddForm({ ...addForm, workPhone: formatPhoneInput(e.target.value) })} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Email</label>
                    <input type="email" value={addForm.email || ""} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs text-muted-foreground mb-1 block">Dirección</label>
                    <input type="text" value={addForm.address || ""} onChange={(e) => setAddForm({ ...addForm, address: e.target.value })} className="w-full px-3 py-2 mb-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" placeholder="Calle y número" />
                    <div className="grid grid-cols-3 gap-2">
                      <input type="text" value={addForm.city || ""} onChange={(e) => setAddForm({ ...addForm, city: e.target.value })} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" placeholder="Ciudad" />
                      <input type="text" value={addForm.state || ""} onChange={(e) => setAddForm({ ...addForm, state: e.target.value })} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" placeholder="Estado (ej. VA)" />
                      <input type="text" value={addForm.zip || ""} onChange={(e) => setAddForm({ ...addForm, zip: e.target.value })} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" placeholder="Código Postal" />
                    </div>
                  </div>
                </div>
              </Section>

              <Section title="Identificación">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Fecha de Nacimiento</label>
                    <input type="text" value={addForm.dob || ""} onChange={(e) => setAddForm({ ...addForm, dob: formatDateInput(e.target.value) })} placeholder="MM/DD/YYYY" className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Licencia</label>
                    <input type="text" value={addForm.driversLicense || ""} onChange={(e) => setAddForm({ ...addForm, driversLicense: e.target.value })} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Estado DL <span className="text-destructive">*</span></label>
                    <input type="text" value={addForm.dlState || ""} onChange={(e) => setAddForm({ ...addForm, dlState: e.target.value })} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                  </div>
                </div>
              </Section>

              <Section title="Conductores Adicionales">
                <div className="flex justify-end mb-2">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      const newDrivers = [...(addForm.drivers || []), { id: Math.random().toString(36).substring(2, 15) + Date.now().toString(36), first_name: "", last_name: "", phone: "", drivers_license: "", dob: "" }];
                      setAddForm({ ...addForm, drivers: newDrivers });
                    }}
                    className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-xs font-medium hover:bg-primary/20 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Add Driver
                  </button>
                </div>
                {addForm.drivers && addForm.drivers.length > 0 && (
                  <div className="space-y-3 mt-3">
                    {addForm.drivers.map((driver, idx) => (
                      <div key={idx} className="relative p-3 bg-secondary/30 rounded-lg border border-border/50">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            const newDrivers = addForm.drivers!.filter((_, i) => i !== idx);
                            setAddForm({ ...addForm, drivers: newDrivers });
                          }}
                          className="absolute right-2 top-2 p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="grid grid-cols-2 gap-3 pr-8">
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Nombre</label>
                            <input type="text" value={driver.first_name} onChange={(e) => {
                              const newDrivers = [...addForm.drivers!];
                              newDrivers[idx].first_name = e.target.value;
                              setAddForm({ ...addForm, drivers: newDrivers });
                            }} className="w-full px-3 py-2 bg-background rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Apellido</label>
                            <input type="text" value={driver.last_name} onChange={(e) => {
                              const newDrivers = [...addForm.drivers!];
                              newDrivers[idx].last_name = e.target.value;
                              setAddForm({ ...addForm, drivers: newDrivers });
                            }} className="w-full px-3 py-2 bg-background rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                          </div>
                          <div className="col-span-2">
                            <label className="text-xs text-muted-foreground mb-1 block">Teléfono</label>
                            <input type="text" value={driver.phone} onChange={(e) => {
                              const newDrivers = [...addForm.drivers!];
                              newDrivers[idx].phone = formatPhoneInput(e.target.value);
                              setAddForm({ ...addForm, drivers: newDrivers });
                            }} placeholder="+1 (___) ___-____" className="w-full px-3 py-2 bg-background rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Fecha de Nacimiento</label>
                            <input type="text" value={driver.dob || ""} onChange={(e) => {
                              const newDrivers = [...addForm.drivers!];
                              newDrivers[idx].dob = formatDateInput(e.target.value);
                              setAddForm({ ...addForm, drivers: newDrivers });
                            }} placeholder="MM/DD/YYYY" className="w-full px-3 py-2 bg-background rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Licencia</label>
                            <input type="text" value={driver.drivers_license || ""} onChange={(e) => {
                              const newDrivers = [...addForm.drivers!];
                              newDrivers[idx].drivers_license = e.target.value;
                              setAddForm({ ...addForm, drivers: newDrivers });
                            }} className="w-full px-3 py-2 bg-background rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              <Section title={
                <div className="flex justify-between items-center w-full pr-4">
                  <span>Agregar Producto (Opcional)</span>
                  <button
                    onClick={(e) => { e.preventDefault(); setShowAddProductFields(!showAddProductFields); }}
                    className="flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-lg text-xs font-medium hover:bg-primary/20 transition-colors"
                  >
                    {showAddProductFields ? 'Ocultar' : '+ Agregar Producto'}
                  </button>
                </div>
              }>
                {showAddProductFields && (
                  <div className="space-y-4 mt-2 animate-fade-in">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Categoría de Producto</label>
                      <select
                        value={productForm.category || "Auto"}
                        onChange={(e) => {
                          const newCat = e.target.value;
                          const allowed = getAllowedCompanies(newCat);
                          setProductForm({ ...productForm, category: newCat, company: allowed.includes(productForm.company || "") ? productForm.company : "" });
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
                        <input type="text" value={productForm.firstName || ""} onChange={(e) => setProductForm({ ...productForm, firstName: e.target.value })} placeholder={addForm.firstName} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Apellido en la póliza</label>
                        <input type="text" value={productForm.lastName || ""} onChange={(e) => setProductForm({ ...productForm, lastName: e.target.value })} placeholder={addForm.lastName} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Número de Póliza</label>
                        <input type="text" value={productForm.policyNumber || ""} onChange={(e) => setProductForm({ ...productForm, policyNumber: e.target.value })} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Compañía</label>
                        <select
                          value={productForm.company || ""}
                          onChange={(e) => setProductForm({ ...productForm, company: e.target.value })}
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
                        <input type="number" value={productForm.premium || ""} onChange={(e) => setProductForm({ ...productForm, premium: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Número de Licencia</label>
                        <input type="text" value={productForm.licenseNumber || ""} onChange={(e) => setProductForm({ ...productForm, licenseNumber: e.target.value })} placeholder={addForm.driversLicense} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Fecha de Efectividad</label>
                        <input type="text" value={productForm.effectiveDate || ""} onChange={(e) => setProductForm({ ...productForm, effectiveDate: formatDateInput(e.target.value) })} placeholder="MM/DD/YYYY" className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Fecha de Vencimiento</label>
                        <input type="text" value={productForm.expirationDate || ""} onChange={(e) => setProductForm({ ...productForm, expirationDate: formatDateInput(e.target.value) })} placeholder="MM/DD/YYYY" className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                      </div>
                    </div>
                  </div>
                )}
              </Section>


              <Section title="Adicional">
                <label className="text-xs text-muted-foreground mb-1 block">Notas de Seguimiento</label>
                <textarea
                  value={addForm.notes || ""}
                  onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
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
              <p className="text-sm text-muted-foreground mt-1">Sube un archivo (.xlsx, .csv) o pega la tabla desde Excel (separada por tabulaciones). Reconocemos las columnas automáticamente. <strong className="text-primary font-bold">Capacidad máxima: 100 datos</strong> a la vez.</p>
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
                Subir Archivo (.xlsx - Max 100)
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

      {/* Edit Notes Modal */}
      {showEditNotesModal && detail && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4" onClick={() => setShowEditNotesModal(false)}>
          <div className="glass-card max-w-2xl w-full p-6 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-foreground mb-4">Editar Notas del Cliente</h2>
            <textarea
              value={editNotesValue}
              onChange={(e) => setEditNotesValue(e.target.value)}
              placeholder="Añade notas o información importante sobre el cliente..."
              className="w-full h-64 p-4 bg-secondary rounded-xl text-sm text-foreground border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y mb-6 leading-relaxed"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowEditNotesModal(false)}
                className="px-4 py-2 bg-secondary text-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  updateClient(detail.id, { notes: editNotesValue });
                  setShowEditNotesModal(false);
                }}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:opacity-90 transition-opacity shadow-md shadow-primary/20"
              >
                Guardar Notas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Renewal Modal */}
      {showRenewalModal && renewalProductTarget && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4" onClick={() => setShowRenewalModal(false)}>
          <div className="glass-card max-w-sm w-full p-6 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-foreground mb-4">Tipo de Renovación</h2>
            <p className="text-sm text-muted-foreground mb-6">Selecciona cómo deseas renovar el producto <strong>{renewalProductTarget.category}</strong> de {renewalProductTarget.company}.</p>
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => {
                  setProductForm({
                    ...renewalProductTarget,
                    id: "",
                    id_poliza_padre: renewalProductTarget.id,
                    tipo_movimiento: "Renovación",
                    createdAt: new Date().toISOString(),
                    effectiveDate: "",
                    expirationDate: ""
                  });
                  setIsSameProviderRenewal(true);
                  setShowRenewalModal(false);
                  setShowProductModal(true);
                }}
                className="w-full px-4 py-3 bg-secondary text-foreground hover:bg-secondary/80 border border-border rounded-lg text-sm font-medium transition-colors"
              >
                Mismo proveedor
              </button>
              <button
                onClick={() => {
                  setProductForm({
                    id: "",
                    id_poliza_padre: renewalProductTarget.id,
                    tipo_movimiento: "Renovación",
                    createdAt: new Date().toISOString(),
                    category: renewalProductTarget.category,
                    firstName: renewalProductTarget.firstName,
                    lastName: renewalProductTarget.lastName,
                    licenseNumber: renewalProductTarget.licenseNumber
                  });
                  setIsSameProviderRenewal(false);
                  setShowRenewalModal(false);
                  setShowProductModal(true);
                }}
                className="w-full px-4 py-3 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 rounded-lg text-sm font-medium transition-colors"
              >
                Proveedor nuevo
              </button>
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={() => setShowRenewalModal(false)} className="text-sm text-muted-foreground hover:text-foreground">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Select Modal */}
      {showActionSelectModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4" onClick={() => setShowActionSelectModal(false)}>
          <div className="glass-card max-w-md w-full p-6 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-foreground mb-4">
              {actionSelectType === 'renovar' ? 'Renovar Producto' : 'Reemplazar Producto'}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Selecciona el producto vigente que deseas {actionSelectType}:
            </p>
            <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {(() => {
                const activeProds = (detail?.products || []).filter(p => !p.status || p.status === 'Activa' || p.tipo_movimiento === 'Fidelización');
                if (activeProds.length === 0) {
                  return <p className="text-sm text-muted-foreground italic">No hay productos vigentes para realizar esta acción.</p>;
                }
                return activeProds.map(prod => (
                  <button
                    key={prod.id}
                    onClick={() => {
                      if (actionSelectType === 'renovar') {
                        setRenewalProductTarget(prod);
                        setShowRenewalModal(true);
                      } else {
                        setProductForm({
                          ...prod,
                          id: "",
                          id_poliza_padre: prod.id,
                          tipo_movimiento: "Reemplazo",
                          createdAt: new Date().toISOString()
                        });
                        setIsSameProviderRenewal(false);
                        setShowProductModal(true);
                      }
                      setShowActionSelectModal(false);
                    }}
                    className="w-full text-left p-3 bg-secondary/50 hover:bg-secondary border border-border rounded-lg transition-colors flex justify-between items-center"
                  >
                    <div>
                      <p className="text-sm font-bold text-foreground">{prod.category} - {prod.company}</p>
                      <p className="text-xs text-muted-foreground">Póliza: #{prod.policyNumber || 'N/A'}</p>
                    </div>
                    <span className="text-xs font-bold text-primary">Seleccionar</span>
                  </button>
                ));
              })()}
            </div>
            <div className="flex justify-end mt-6">
              <button onClick={() => setShowActionSelectModal(false)} className="px-4 py-2 bg-secondary text-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4" onClick={() => setShowProductModal(false)}>
          <div className="glass-card max-w-lg w-full p-6 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-foreground mb-4">
              {isSameProviderRenewal ? "Renovación de Producto" : "Agregar Nuevo Producto"}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Categoría de Producto</label>
                <select
                  value={productForm.category || "Auto"}
                  disabled={isSameProviderRenewal}
                  onChange={(e) => {
                    const newCat = e.target.value;
                    const allowed = getAllowedCompanies(newCat);
                    setProductForm({ ...productForm, category: newCat, company: allowed.includes(productForm.company || "") ? productForm.company : "" });
                  }}
                  className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-50"
                >
                  {productCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Nombre</label>
                  <input type="text" disabled={isSameProviderRenewal} value={productForm.firstName || ""} onChange={(e) => setProductForm({ ...productForm, firstName: e.target.value })} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-50" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Apellido</label>
                  <input type="text" disabled={isSameProviderRenewal} value={productForm.lastName || ""} onChange={(e) => setProductForm({ ...productForm, lastName: e.target.value })} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-50" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Número de Póliza</label>
                  <input type="text" disabled={isSameProviderRenewal} value={productForm.policyNumber || ""} onChange={(e) => setProductForm({ ...productForm, policyNumber: e.target.value })} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-50" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Compañía</label>
                  <select
                    value={productForm.company || ""}
                    disabled={isSameProviderRenewal}
                    onChange={(e) => setProductForm({ ...productForm, company: e.target.value })}
                    className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-50"
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
                  <input type="number" value={productForm.premium || ""} onChange={(e) => setProductForm({ ...productForm, premium: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Número de Licencia</label>
                  <input type="text" disabled={isSameProviderRenewal} value={productForm.licenseNumber || ""} onChange={(e) => setProductForm({ ...productForm, licenseNumber: e.target.value })} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-50" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Fecha de Efectividad</label>
                  <input type="text" value={productForm.effectiveDate || ""} onChange={(e) => setProductForm({ ...productForm, effectiveDate: formatDateInput(e.target.value) })} placeholder="MM/DD/YYYY" className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Fecha de Vencimiento</label>
                  <input type="text" value={productForm.expirationDate || ""} onChange={(e) => setProductForm({ ...productForm, expirationDate: formatDateInput(e.target.value) })} placeholder="MM/DD/YYYY" className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                </div>
              </div>

              {/* Drivers Section */}
              <div className="pt-2 border-t border-border/50">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Conductores Adicionales</label>
                  {!isSameProviderRenewal && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        const newDrivers = [...(productForm.drivers || []), { id: Math.random().toString(36).substring(2, 15) + Date.now().toString(36), firstName: "", lastName: "", phone: "" }];
                        setProductForm({ ...productForm, drivers: newDrivers });
                      }}
                      className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-xs font-medium hover:bg-primary/20 transition-colors"
                    >
                      <Plus className="w-3 h-3" /> Add Driver
                    </button>
                  )}
                </div>
                {productForm.drivers && productForm.drivers.length > 0 && (
                  <div className="space-y-3 mt-3">
                    {productForm.drivers.map((driver, idx) => (
                      <div key={idx} className="relative p-3 bg-secondary/30 rounded-lg border border-border/50">
                        {!isSameProviderRenewal && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              const newDrivers = productForm.drivers!.filter((_, i) => i !== idx);
                              setProductForm({ ...productForm, drivers: newDrivers });
                            }}
                            className="absolute right-2 top-2 p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <div className="grid grid-cols-2 gap-3 pr-8">
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Nombre</label>
                            <input type="text" disabled={isSameProviderRenewal} value={driver.firstName} onChange={(e) => {
                              const newDrivers = [...productForm.drivers!];
                              newDrivers[idx].firstName = e.target.value;
                              setProductForm({ ...productForm, drivers: newDrivers });
                            }} className="w-full px-3 py-2 bg-background rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-50" />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Apellido</label>
                            <input type="text" disabled={isSameProviderRenewal} value={driver.lastName} onChange={(e) => {
                              const newDrivers = [...productForm.drivers!];
                              newDrivers[idx].lastName = e.target.value;
                              setProductForm({ ...productForm, drivers: newDrivers });
                            }} className="w-full px-3 py-2 bg-background rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-50" />
                          </div>
                          <div className="col-span-2">
                            <label className="text-xs text-muted-foreground mb-1 block">Teléfono</label>
                            <input type="text" disabled={isSameProviderRenewal} value={driver.phone} onChange={(e) => {
                              const newDrivers = [...productForm.drivers!];
                              newDrivers[idx].phone = formatPhoneInput(e.target.value);
                              setProductForm({ ...productForm, drivers: newDrivers });
                            }} placeholder="+1 (___) ___-____" className="w-full px-3 py-2 bg-background rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-50" />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Fecha de Nacimiento</label>
                            <input type="text" disabled={isSameProviderRenewal} value={driver.dob || ""} onChange={(e) => {
                              const newDrivers = [...productForm.drivers!];
                              newDrivers[idx].dob = formatDateInput(e.target.value);
                              setProductForm({ ...productForm, drivers: newDrivers });
                            }} placeholder="MM/DD/YYYY" className="w-full px-3 py-2 bg-background rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-50" />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Licencia</label>
                            <input type="text" disabled={isSameProviderRenewal} value={driver.driversLicense || ""} onChange={(e) => {
                              const newDrivers = [...productForm.drivers!];
                              newDrivers[idx].driversLicense = e.target.value;
                              setProductForm({ ...productForm, drivers: newDrivers });
                            }} className="w-full px-3 py-2 bg-background rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-50" />
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
                  let isReemplazo = false;
                  let movimiento = productForm.tipo_movimiento || "Venta Nueva";
                  const allProductsContext = editingClient ? (editForm.products || []) : (detail?.products || []);

                  if (productForm.id_poliza_padre) {
                    const oldProduct = allProductsContext.find(p => p.id === productForm.id_poliza_padre);
                    if (oldProduct) {
                      isReemplazo = true;
                      if (productForm.tipo_movimiento === "Renovación") {
                        movimiento = "Fidelización";
                      } else if (productForm.tipo_movimiento === "Reemplazo") {
                        movimiento = "Reemplazo";
                      }
                    }
                  }

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
                    createdAt: productForm.createdAt || new Date().toISOString(),
                    tipo_movimiento: movimiento,
                    id_poliza_padre: productForm.id_poliza_padre,
                    fecha_sustitucion: isReemplazo ? new Date().toISOString() : undefined,
                    status: !productForm.id ? "Activa" : (productForm.status || "Activa")
                  };

                  const isNewProduct = !productForm.id;
                  const isNewReplacement = isNewProduct && productForm.id_poliza_padre;

                  if (editingClient) {
                    let existingProducts = editForm.products || [];
                    if (isNewReplacement) {
                      const cancelStatus = productForm.tipo_movimiento === "Renovación" ? "Finalizada" : "Removida por Reemplazo";
                      existingProducts = existingProducts.map(p => p.id === productForm.id_poliza_padre ? { ...p, status: cancelStatus } : p);
                    }

                    let updatedProducts;
                    if (!isNewProduct) {
                      updatedProducts = existingProducts.map(p => p.id === productForm.id ? newProduct : p);
                    } else {
                      updatedProducts = [...existingProducts, newProduct];
                    }
                    setEditForm({ ...editForm, products: updatedProducts });
                    setShowProductModal(false);
                  } else if (detail) {
                    let existingProducts = detail.products || [];
                    if (isNewReplacement) {
                      const cancelStatus = productForm.tipo_movimiento === "Renovación" ? "Finalizada" : "Removida por Reemplazo";
                      existingProducts = existingProducts.map(p => p.id === productForm.id_poliza_padre ? { ...p, status: cancelStatus } : p);
                    }

                    let updatedProducts;
                    if (!isNewProduct) {
                      updatedProducts = existingProducts.map(p => p.id === productForm.id ? newProduct : p);
                    } else {
                      updatedProducts = [...existingProducts, newProduct];
                    }

                    const actionName = isNewProduct ? "agregó" : "editó";
                    const newLog: ChangeLog = {
                      id: Math.random().toString(36).substring(2, 15),
                      date: new Date().toISOString(),
                      reason: `${username || 'Usuario'} ${actionName} el producto ${newProduct.category} - ${newProduct.policyNumber || 'Sin Póliza'}`
                    };
                    const updatedLogs = [...(detail.logs || []), newLog];

                    updateClient(detail.id, { products: updatedProducts, logs: updatedLogs });
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
      {showReminderModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 shadow-2xl" onClick={() => setShowReminderModal(false)}>
          <div className="glass-card max-w-sm w-full p-6 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-foreground mb-4">Agendar Recordatorio</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Fecha (MM/DD/YYYY) <span className="text-destructive">*</span></label>
                <input
                  type="text"
                  value={reminderForm.date || ""}
                  onChange={(e) => setReminderForm({ ...reminderForm, date: formatDateInput(e.target.value) })}
                  placeholder="04/15/2026"
                  className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Notas <span className="text-destructive">*</span></label>
                <textarea
                  value={reminderForm.notes || ""}
                  onChange={(e) => setReminderForm({ ...reminderForm, notes: e.target.value })}
                  placeholder="Llamar para renovar póliza..."
                  className="w-full h-24 px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setShowReminderModal(false)}
                className="px-4 py-2 bg-secondary text-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (!reminderForm.date || !reminderForm.notes) {
                    alert("Debes llenar la fecha y las notas.");
                    return;
                  }

                  const newReminder: Reminder = {
                    id: Math.random().toString(36).substring(2, 15),
                    date: reminderForm.date,
                    notes: reminderForm.notes,
                    createdAt: new Date().toISOString()
                  };

                  if (detail) {
                    const existingReminders = detail.reminders || [];
                    const updatedReminders = [...existingReminders, newReminder];
                    updateClient(detail.id, { reminders: updatedReminders });
                  }
                  setShowReminderModal(false);
                }}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Agendar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Note Modal */}
      {showAddNoteModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4" onClick={() => setShowAddNoteModal(false)}>
          <div className="glass-card max-w-md w-full p-6 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-foreground mb-4">Agregar Nota al Seguimiento</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Comentario / Nota</label>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Escribe tu nota aquí..."
                  className="w-full h-32 px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50 resize-y"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowAddNoteModal(false)} className="px-4 py-2 bg-secondary text-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors">
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (!noteText.trim()) {
                    alert("Debes escribir una nota.");
                    return;
                  }

                  if (detail) {
                    const newLog = {
                      id: Math.random().toString(36).substring(2, 15),
                      date: new Date().toISOString(),
                      reason: `[${username || 'Usuario'}] Nota de seguimiento: ${noteText}`
                    };
                    updateClient(detail.id, { logs: [...(detail.logs || []), newLog] });
                  }
                  setShowAddNoteModal(false);
                }}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Guardar Nota
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Detail Add Driver Modal */}
      {showDetailAddDriverModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4" onClick={() => setShowDetailAddDriverModal(false)}>
          <div className="glass-card max-w-lg w-full p-6 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-foreground mb-4">Agregar Nuevo Conductor</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Nombre</label>
                  <input type="text" value={newDetailDriver.firstName || ""} onChange={(e) => setNewDetailDriver({ ...newDetailDriver, firstName: e.target.value })} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Apellido</label>
                  <input type="text" value={newDetailDriver.lastName || ""} onChange={(e) => setNewDetailDriver({ ...newDetailDriver, lastName: e.target.value })} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground mb-1 block">Teléfono</label>
                  <input type="text" value={newDetailDriver.phone || ""} onChange={(e) => setNewDetailDriver({ ...newDetailDriver, phone: formatPhoneInput(e.target.value) })} placeholder="+1 (___) ___-____" className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Fecha de Nacimiento</label>
                  <input type="text" value={newDetailDriver.dob || ""} onChange={(e) => setNewDetailDriver({ ...newDetailDriver, dob: formatDateInput(e.target.value) })} placeholder="MM/DD/YYYY" className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Licencia</label>
                  <input type="text" value={newDetailDriver.driversLicense || ""} onChange={(e) => setNewDetailDriver({ ...newDetailDriver, driversLicense: e.target.value })} className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-primary/50" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowDetailAddDriverModal(false)} className="px-4 py-2 bg-secondary text-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors">
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (!newDetailDriver.firstName || !newDetailDriver.lastName) {
                    alert("El nombre y apellido son obligatorios.");
                    return;
                  }

                  if (detail) {
                    const d: any = {
                      id: Math.random().toString(36).substring(2, 15) + Date.now().toString(36),
                      firstName: newDetailDriver.firstName,
                      lastName: newDetailDriver.lastName,
                      phone: newDetailDriver.phone || "",
                      dob: newDetailDriver.dob || "",
                      driversLicense: newDetailDriver.driversLicense || ""
                    };
                    const updatedDrivers = [...(detail.drivers || []), d];
                    updateClient(detail.id, {
                      drivers: updatedDrivers,
                      logs: [...(detail.logs || []), { id: Math.random().toString(36).substring(2, 9), date: new Date().toISOString(), reason: `[${username}] Agregó conductor adicional: ${d.firstName} ${d.lastName}` }]
                    });
                  }
                  setShowDetailAddDriverModal(false);
                }}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Script Modal */}
      {emailClient && (
        <FloatingEmailComposer client={emailClient} onClose={() => setEmailClient(null)} />
      )}
    </CRMLayout>
  );
}

function Section({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
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
