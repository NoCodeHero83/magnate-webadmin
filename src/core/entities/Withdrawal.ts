import { SettlementPeriod } from "./Distributor";

export type WithdrawalCurrency = "ARS" | "USDT";
export type WithdrawalStatus = "pending" | "paid" | "rejected" | "cancelled";
export type UsdtNetwork = "TRC20" | "ERC20" | "BEP20" | "POLYGON";

export const USDT_NETWORKS: { value: UsdtNetwork; label: string }[] = [
  { value: "TRC20", label: "TRC20 (Tron)" },
  { value: "ERC20", label: "ERC20 (Ethereum)" },
  { value: "BEP20", label: "BEP20 (BNB Chain)" },
  { value: "POLYGON", label: "Polygon" },
];

export const WITHDRAWAL_STATUS_LABELS: Record<WithdrawalStatus, string> = {
  pending: "Pendiente",
  paid: "Pagado",
  rejected: "Rechazado",
  cancelled: "Cancelado",
};

/** Destino del retiro: CBU/CVU/alias en pesos o wallet en USDT */
export interface WithdrawalDestination {
  destination?: string;
  holderName?: string;
  wallet?: string;
  network?: UsdtNetwork;
}

export interface Withdrawal {
  id: string;
  distributorId: string;
  distributorName: string;
  /** Siempre en pesos: lo que se descuenta del saldo */
  amount: number;
  currency: WithdrawalCurrency;
  destination: WithdrawalDestination;
  /** Cotización vigente cuando se pidió (solo USDT) */
  usdtRateEstimate: number | null;
  status: WithdrawalStatus;
  createdAt: string;
  resolvedAt: string | null;
  rejectReason: string | null;
  paymentReference: string | null;
  /** Cotización y USDT enviados al pagar */
  usdtRate: number | null;
  usdtAmount: number | null;
  /** Saldo actual de la cuenta de comisiones */
  accountBalance: number;
}

export interface DistributorBalance {
  balance: number;
  /** Retiros pendientes */
  reserved: number;
  /** Ganado en el período de liquidación en curso: se libera al cerrar el período */
  inProgress: number;
  available: number;
  paidTotal: number;
  settlementPeriod: SettlementPeriod;
  /** Cuándo se libera lo del período en curso (null = liquidación al instante) */
  releaseAt: string | null;
}

export interface WithdrawalSettings {
  minAmount: number;
  /** Pesos por USDT; 0 = retiros en USDT deshabilitados */
  usdtRate: number;
  /** Redes habilitadas para los retiros en USDT */
  usdtNetworks: UsdtNetwork[];
}

export interface WithdrawalRequestInput {
  amount: number;
  currency: WithdrawalCurrency;
  destination: WithdrawalDestination;
}

export interface ResolveWithdrawalInput {
  id: string;
  action: "pay" | "reject";
  reference?: string;
  reason?: string;
  usdtRate?: number;
  usdtAmount?: number;
}

/** Depósitos, retiros y transferencias de un CVU del distribuidor */
export interface Movement {
  id: string;
  createdAt: string;
  accountId: string;
  holderName: string;
  cvu: string;
  alias: string;
  direction: "in" | "out";
  typeCode: string;
  typeName: string;
  amount: number;
  /** Comisión que pagó el CVU por este movimiento */
  commission: number;
  status: string;
  referenceNumber: string;
  distributorName: string;
}

/** Texto corto del destino para tablas y CSV */
export function describeDestination(currency: WithdrawalCurrency, d: WithdrawalDestination): string {
  if (currency === "USDT") return `${d.network ?? ""} · ${d.wallet ?? ""}`;
  return d.holderName ? `${d.destination ?? ""} (${d.holderName})` : d.destination ?? "";
}
