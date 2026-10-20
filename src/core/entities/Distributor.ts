export type DistributorStatus = "active" | "inactive";

/** Cada cuánto se liquida lo ganado (lo del período en curso no se puede retirar) */
export type SettlementPeriod = "instant" | "weekly" | "biweekly" | "monthly";

export const SETTLEMENT_LABELS: Record<SettlementPeriod, string> = {
  instant: "Al instante",
  weekly: "Semanal (lunes a domingo)",
  biweekly: "Quincenal (1 al 15 y 16 a fin de mes)",
  monthly: "Mensual",
};

/** Qué pasa con la parte de un distribuidor inactivo */
export type InactiveShare = "magnate" | "distributor";

export interface Distributor {
  id: string;
  name: string;
  cuit?: string;
  contactEmail?: string;
  status: DistributorStatus;
  createdAt: string;
  /** Usuario con el que entra al panel (si ya tiene acceso) */
  userId?: string;
  loginEmail?: string;
  accountsCount: number;
  /** Comisiones acumuladas en su cuenta de comisiones */
  commissionBalance: number;
  /** Lo que ya puede retirar (sin el período en curso ni los retiros pendientes) */
  availableBalance: number;
  /** Distribuidor que lo trajo (red) */
  parentId: string | null;
  parentName?: string;
  /** % de cada comisión para el distribuidor; null = el de la regla */
  sharePercent: number | null;
  /** Cobra de su red; null = según la configuración general */
  networkEnabled: boolean | null;
  /** null = la liquidación general */
  settlementPeriod: SettlementPeriod | null;
  /** Distribuidores que trajo directamente */
  networkCount: number;
}

export interface DistributorCommissionInput {
  id: string;
  parentId: string | null;
  sharePercent: number | null;
  networkEnabled: boolean | null;
  settlementPeriod: SettlementPeriod | null;
}

/** Configuración general de comisiones de los distribuidores */
export interface CommissionSettings {
  networkEnabled: boolean;
  /** % de la comisión para cada nivel hacia arriba: [nivel 1, nivel 2, ...] */
  networkLevelPercents: number[];
  settlementPeriod: SettlementPeriod;
  inactiveDistributorShare: InactiveShare;
}

/** Un distribuidor de la red de otro */
export interface NetworkMember {
  id: string;
  name: string;
  status: DistributorStatus;
  /** 1 = lo trajo directamente */
  level: number;
  parentName?: string;
  accountsCount: number;
}

/** Comisión de red cobrada por un distribuidor */
export interface NetworkEarning {
  id: string;
  createdAt: string;
  distributorName: string;
  /** Distribuidor de la red que generó la comisión */
  sourceName: string;
  level: number;
  operation: FeeOperation;
  feeTotal: number;
  ratePercent: number;
  amount: number;
}

/** Lo ganado en un período de liquidación */
export interface PeriodSummary {
  periodStart: string;
  periodEnd: string;
  isOpen: boolean;
  commissions: number;
  network: number;
  adjustments: number;
  withdrawals: number;
}

/** Ajuste manual del saldo de un distribuidor */
export interface Adjustment {
  id: string;
  createdAt: string;
  distributorId: string;
  distributorName: string;
  /** Positivo a favor, negativo en contra */
  amount: number;
  reason: string;
}

/** Datos del distribuidor que inició sesión */
export interface DistributorProfile {
  id: string;
  name: string;
  cuit?: string;
  status: DistributorStatus;
  accountsCount: number;
  commissionBalance: number;
  parentName?: string;
  networkCount: number;
  settlementPeriod: SettlementPeriod;
}

/** Volumen y comisiones de un CVU en un período */
export interface AccountVolume {
  accountId: string;
  distributorId: string;
  distributorName: string;
  holderName: string;
  cvu: string;
  alias: string;
  accountStatus: string;
  accountType: string;
  volumeIn: number;
  volumeOut: number;
  operations: number;
  feeTotal: number;
  distributorAmount: number;
}

export type FeeOperation = "payin" | "payout" | "internal_out" | "internal_in";

export const FEE_OPERATION_LABELS: Record<FeeOperation, string> = {
  payin: "Ingreso desde fuera (pay-in)",
  payout: "Envío fuera de la billetera (pay-out)",
  internal_out: "Transferencia interna: envía",
  internal_in: "Transferencia interna: recibe",
};

export const FEE_OPERATION_SHORT: Record<FeeOperation, string> = {
  payin: "Pay-in",
  payout: "Pay-out",
  internal_out: "Interna (envía)",
  internal_in: "Interna (recibe)",
};

/** Las operaciones salientes pueden cobrar la comisión aparte; las entrantes siempre la descuentan */
export const OUTGOING_OPERATIONS: FeeOperation[] = ["payout", "internal_out"];

export interface CommissionEntry {
  id: string;
  createdAt: string;
  operation: FeeOperation;
  holderName: string;
  cvu: string;
  alias: string;
  baseAmount: number;
  ratePercent: number;
  feeTotal: number;
  magnateAmount: number;
  distributorAmount: number;
  distributorName?: string;
}

export interface CommissionSummary {
  feeTotal: number;
  magnateTotal: number;
  distributorTotal: number;
  /** Parte pagada a los niveles de red */
  networkTotal: number;
  count: number;
  magnateBalance: number;
}

export type ChargeMode = "deduct" | "on_top";

export interface FeeRule {
  id: string;
  /** Regla de un CVU (si no hay CVU ni distribuidor, es la regla por defecto) */
  accountId: string | null;
  /** Regla para todos los CVUs de un distribuidor */
  distributorId: string | null;
  distributorName?: string;
  accountAlias?: string;
  accountCvu?: string;
  holderName?: string;
  operation: FeeOperation;
  ratePercent: number;
  fixedAmount: number;
  minAmount: number;
  maxAmount: number | null;
  chargeMode: ChargeMode;
  /** null = usa el reparto del distribuidor (solo en reglas de CVU o de distribuidor) */
  magnateSharePercent: number | null;
  isActive: boolean;
  updatedAt: string;
}

export type FeeRuleInput = Omit<FeeRule, "id" | "accountAlias" | "accountCvu" | "holderName" | "distributorName" | "updatedAt">;

export const isDefaultRule = (rule: Pick<FeeRule, "accountId" | "distributorId">) =>
  rule.accountId === null && rule.distributorId === null;
