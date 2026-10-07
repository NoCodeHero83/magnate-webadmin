export type DistributorStatus = "active" | "inactive";

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
}

/** Datos del distribuidor que inició sesión */
export interface DistributorProfile {
  id: string;
  name: string;
  cuit?: string;
  status: DistributorStatus;
  accountsCount: number;
  commissionBalance: number;
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
  count: number;
  magnateBalance: number;
}

export type ChargeMode = "deduct" | "on_top";

export interface FeeRule {
  id: string;
  /** null = regla por defecto */
  accountId: string | null;
  accountAlias?: string;
  accountCvu?: string;
  holderName?: string;
  operation: FeeOperation;
  ratePercent: number;
  fixedAmount: number;
  minAmount: number;
  maxAmount: number | null;
  chargeMode: ChargeMode;
  magnateSharePercent: number;
  isActive: boolean;
  updatedAt: string;
}

export type FeeRuleInput = Omit<FeeRule, "id" | "accountAlias" | "accountCvu" | "holderName" | "updatedAt">;
