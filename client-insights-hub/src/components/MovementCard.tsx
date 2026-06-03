import React from "react";
import { Shield, Sparkles, Trophy, Award } from "lucide-react";

export type LoyaltyRankType = "Plata" | "Oro" | "Diamante";

export interface MovementData {
  id: string;
  fullName: string;
  company: string;
  premium: number;
  expirationDate: string;
  loyaltyRank: LoyaltyRankType;
  status: "Activa" | "Renovada" | "Cancelada" | string;
}

interface MovementCardProps {
  fullName: string;
  company: string;
  premium: number;
  expirationDate: string;
  loyaltyRank: LoyaltyRankType;
  status: string;
}

export function MovementCard({
  fullName,
  company,
  premium,
  expirationDate,
  loyaltyRank,
  status,
}: MovementCardProps) {
  // Lógica para color de prima y formato
  const isCanceled = status.toLowerCase() === "cancelada";
  const formattedPremium = isCanceled
    ? `-$${Math.abs(premium).toLocaleString()}`
    : `$${premium.toLocaleString()}`;
  
  const premiumColor = isCanceled
    ? "text-destructive font-extrabold"
    : "text-success font-extrabold";

  // Lógica visual para rangos de fidelización
  const getRankBadge = (rank: LoyaltyRankType) => {
    switch (rank) {
      case "Diamante":
        return {
          label: "Diamante",
          icon: <Trophy className="w-3 h-3 text-cyan-400" />,
          classes: "bg-cyan-500/10 text-cyan-400 border-cyan-500/25",
        };
      case "Oro":
        return {
          label: "Oro",
          icon: <Award className="w-3 h-3 text-amber-400" />,
          classes: "bg-amber-500/10 text-amber-400 border-amber-500/25",
        };
      case "Plata":
      default:
        return {
          label: "Plata",
          icon: <Sparkles className="w-3 h-3 text-slate-400" />,
          classes: "bg-slate-500/10 text-slate-400 border-slate-500/25",
        };
    }
  };

  const rankBadge = getRankBadge(loyaltyRank);

  return (
    <div className={`glass-card p-5 rounded-2xl border border-border/40 bg-secondary/35 hover:bg-secondary/45 hover:border-primary/45 transition-all duration-300 shadow-sm flex flex-col justify-between relative overflow-hidden group`}>
      {/* Glow Effect on Hover */}
      <div className="absolute -inset-px bg-gradient-to-r from-primary/10 to-info/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      <div className="relative z-10">
        {/* Cabecera: Nombre y Badge de Fidelidad */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <h4 className="text-base font-bold text-foreground tracking-tight line-clamp-1">
            {fullName}
          </h4>
          
          {/* Badge de Fidelización */}
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${rankBadge.classes} shadow-sm shrink-0`}>
            {rankBadge.icon}
            {rankBadge.label}
          </span>
        </div>

        {/* Detalles: Compañía y Vencimiento */}
        <div className="space-y-1.5 mt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">Compañía</span>
            <span className="text-foreground font-semibold flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-primary/70" />
              {company}
            </span>
          </div>
          
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">Vencimiento</span>
            <span className="text-foreground font-semibold">
              {expirationDate}
            </span>
          </div>
        </div>
      </div>

      {/* Pie de la tarjeta: Estado y Prima */}
      <div className="border-t border-border/30 mt-4 pt-3 flex items-center justify-between relative z-10">
        <div>
          <span className="text-[10px] text-muted-foreground block font-medium uppercase tracking-wider">Estado</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md inline-block mt-0.5 ${
            isCanceled
              ? "bg-destructive/15 text-destructive"
              : status.toLowerCase() === "renovada"
              ? "bg-info/15 text-info"
              : "bg-success/15 text-success"
          }`}>
            {status}
          </span>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-muted-foreground block font-medium uppercase tracking-wider">Prima</span>
          <span className={`text-base ${premiumColor}`}>
            {formattedPremium}
          </span>
        </div>
      </div>
    </div>
  );
}

interface MovementsListProps {
  movements: MovementData[];
}

export function MovementsList({ movements }: MovementsListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {movements.length > 0 ? (
        movements.map((mv) => (
          <MovementCard
            key={mv.id}
            fullName={mv.fullName}
            company={mv.company}
            premium={mv.premium}
            expirationDate={mv.expirationDate}
            loyaltyRank={mv.loyaltyRank}
            status={mv.status}
          />
        ))
      ) : (
        <div className="col-span-full py-12 text-center text-sm text-muted-foreground">
          No hay movimientos registrados para este filtro.
        </div>
      )}
    </div>
  );
}
