import { supabase } from "./client";
import {
  AccountVolume,
  CommissionEntry,
  CommissionSummary,
  Distributor,
  DistributorProfile,
  DistributorStatus,
  FeeOperation,
} from "../../core/entities/Distributor";
import { Period } from "../../lib/format";

export interface DistributorInput {
  id?: string;
  name: string;
  cuit?: string;
  contactEmail?: string;
  status: DistributorStatus;
}

export interface DistributorAccessInput {
  distributorId: string;
  email: string;
  firstName: string;
  lastName: string;
}

/** Mensajes legibles para los errores de las funciones de la BD (CODIGO: mensaje) */
function dbErrorMessage(message: string): string {
  const known = message.match(/^[A-Z_]+: (.+)$/);
  if (known) return known[1];
  if (message.includes("FORBIDDEN")) return "No tienes permisos para hacer esto.";
  return message;
}

/** Errores de la edge function: el cuerpo trae { error } */
async function functionErrorMessage(error: any): Promise<string> {
  try {
    const body = await error?.context?.json?.();
    if (body?.error) return body.error;
  } catch {
    // sin cuerpo JSON
  }
  return error?.message || "No se pudo completar la operación";
}

const num = (value: unknown) => Number(value) || 0;

export class SupabaseDistributorRepository {
  // ── Administración ─────────────────────────────────────────────────────────

  async list(): Promise<Distributor[]> {
    const { data, error } = await supabase.rpc("admin_distributor_list");
    if (error) throw new Error(dbErrorMessage(error.message));
    return (data || []).map((d: any) => ({
      id: d.id,
      name: d.name,
      cuit: d.cuit || undefined,
      contactEmail: d.contact_email || undefined,
      status: d.status,
      createdAt: d.created_at,
      userId: d.user_id || undefined,
      loginEmail: d.login_email || undefined,
      accountsCount: num(d.accounts_count),
      commissionBalance: num(d.commission_balance),
    }));
  }

  async save(input: DistributorInput): Promise<string> {
    const { data, error } = await supabase.rpc("admin_upsert_distributor", {
      p_id: input.id ?? null,
      p_name: input.name,
      p_cuit: input.cuit ?? "",
      p_contact_email: input.contactEmail ?? "",
      p_status: input.status,
    });
    if (error) throw new Error(dbErrorMessage(error.message));
    return data as string;
  }

  /** Asigna los CVUs al distribuidor (o los libera con distributorId = null) */
  async assignAccounts(accountIds: string[], distributorId: string | null): Promise<number> {
    const { data, error } = await supabase.rpc("admin_assign_accounts", {
      p_account_ids: accountIds,
      p_distributor_id: distributorId,
    });
    if (error) throw new Error(dbErrorMessage(error.message));
    return num(data);
  }

  /** Crea el usuario con el que el distribuidor entra al panel. Devuelve la contraseña temporal. */
  async createAccess(input: DistributorAccessInput): Promise<string> {
    const { data, error } = await supabase.functions.invoke("admin-create-distributor", {
      body: {
        action: "create",
        distributor_id: input.distributorId,
        email: input.email,
        first_name: input.firstName,
        last_name: input.lastName,
      },
    });
    if (error) throw new Error(await functionErrorMessage(error));
    return data.password as string;
  }

  async resetPassword(distributorId: string): Promise<string> {
    const { data, error } = await supabase.functions.invoke("admin-create-distributor", {
      body: { action: "reset_password", distributor_id: distributorId },
    });
    if (error) throw new Error(await functionErrorMessage(error));
    return data.password as string;
  }

  async getCommissionSummary(period: Period): Promise<CommissionSummary> {
    const { data, error } = await supabase.rpc("admin_commission_summary", {
      p_from: period.from.toISOString(),
      p_to: period.to.toISOString(),
    });
    if (error) throw new Error(dbErrorMessage(error.message));
    const d = (data || {}) as any;
    return {
      feeTotal: num(d.fee_total),
      magnateTotal: num(d.magnate_total),
      distributorTotal: num(d.distributor_total),
      count: num(d.count),
      magnateBalance: num(d.magnate_balance),
    };
  }

  // ── Reportes (admin y distribuidor) ────────────────────────────────────────
  // Para el distribuidor la BD ignora distributorId y usa el suyo.

  async getAccountVolume(period: Period, distributorId?: string | null): Promise<AccountVolume[]> {
    const { data, error } = await supabase.rpc("distributor_account_volume", {
      p_from: period.from.toISOString(),
      p_to: period.to.toISOString(),
      p_distributor_id: distributorId ?? null,
    });
    if (error) throw new Error(dbErrorMessage(error.message));
    return (data || []).map((r: any) => ({
      accountId: r.account_id,
      distributorId: r.distributor_id,
      distributorName: r.distributor_name,
      holderName: r.holder_name || "—",
      cvu: r.cvu,
      alias: r.alias,
      accountStatus: r.account_status,
      accountType: r.account_type || "personal",
      volumeIn: num(r.volume_in),
      volumeOut: num(r.volume_out),
      operations: num(r.operations),
      feeTotal: num(r.fee_total),
      distributorAmount: num(r.distributor_amount),
    }));
  }

  async getCommissionDetail(period: Period, distributorId?: string | null, limit = 1000): Promise<CommissionEntry[]> {
    const { data, error } = await supabase.rpc("distributor_commission_detail", {
      p_from: period.from.toISOString(),
      p_to: period.to.toISOString(),
      p_distributor_id: distributorId ?? null,
      p_limit: limit,
    });
    if (error) throw new Error(dbErrorMessage(error.message));
    return (data || []).map((r: any) => ({
      id: r.id,
      createdAt: r.created_at,
      operation: r.operation as FeeOperation,
      holderName: r.holder_name || "—",
      cvu: r.cvu,
      alias: r.alias,
      baseAmount: num(r.base_amount),
      ratePercent: num(r.rate_percent),
      feeTotal: num(r.fee_total),
      magnateAmount: num(r.magnate_amount),
      distributorAmount: num(r.distributor_amount),
      distributorName: r.distributor_name || undefined,
    }));
  }

  /** Datos del distribuidor que inició sesión */
  async getMe(): Promise<DistributorProfile | null> {
    const { data, error } = await supabase.rpc("distributor_me");
    if (error) throw new Error(dbErrorMessage(error.message));
    if (!data) return null;
    const d = data as any;
    return {
      id: d.id,
      name: d.name,
      cuit: d.cuit || undefined,
      status: d.status,
      accountsCount: num(d.accounts_count),
      commissionBalance: num(d.commission_balance),
    };
  }
}
