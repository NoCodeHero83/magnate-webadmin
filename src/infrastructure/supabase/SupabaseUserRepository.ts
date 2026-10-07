import { User, VerificationStatus, AccountType, AccountReview } from "../../core/entities/User";
import { IUserRepository, UserStats } from "../../core/repositories/IUserRepository";
import { supabase } from "./client";
import { QueryOptions, PaginatedResult } from "../../core/types/pagination";

/** Fila de la vista admin_user_list (users + business_profiles) */
interface DbUser {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    dni: string;
    cuit_cuil: string | null;
    role: string;
    verification_status: string;
    account_type: string;
    status_reason: string | null;
    reviewed_at: string | null;
    photo_url: string | null;
    created_at: string;
    updated_at: string;
    company_cuit: string | null;
    company_legal_name: string | null;
    company_trade_name: string | null;
    company_entity_type: string | null;
    company_entity_type_name: string | null;
    company_incorporation_date: string | null;
    zapsign_contract_url: string | null;
    account_id: string | null;
    account_cvu: string | null;
    account_alias: string | null;
    distributor_id: string | null;
    distributor_name: string | null;
}

const DOCUMENTS_BUCKET = "documents";
const PUBLIC_DOCUMENTS_MARKER = `/storage/v1/object/public/${DOCUMENTS_BUCKET}/`;

const USER_VIEW = "admin_user_list";

const SEARCH_COLUMNS = [
    "first_name", "last_name", "email", "dni", "phone", "cuit_cuil",
    "company_legal_name", "company_trade_name", "company_cuit",
    "account_alias", "account_cvu",
];

/** Columnas guardadas solo con dígitos (se buscan sin guiones ni puntos) */
const NUMERIC_COLUMNS = ["dni", "cuit_cuil", "company_cuit"];

export class SupabaseUserRepository implements IUserRepository {
    private mapToEntity(dbUser: DbUser): User {
        return {
            id: dbUser.id,
            firstName: dbUser.first_name,
            lastName: dbUser.last_name,
            email: dbUser.email,
            phone: dbUser.phone,
            dni: dbUser.dni,
            cuitCuil: dbUser.cuit_cuil || undefined,
            role: dbUser.role as User["role"],
            verificationStatus: dbUser.verification_status as VerificationStatus,
            accountType: (dbUser.account_type || "personal") as AccountType,
            businessProfile: dbUser.company_cuit
                ? {
                    cuit: dbUser.company_cuit,
                    legalName: dbUser.company_legal_name || "",
                    tradeName: dbUser.company_trade_name || undefined,
                    entityType: dbUser.company_entity_type || "",
                    entityTypeName: dbUser.company_entity_type_name || undefined,
                    incorporationDate: dbUser.company_incorporation_date || "",
                }
                : undefined,
            statusReason: dbUser.status_reason || undefined,
            reviewedAt: dbUser.reviewed_at || undefined,
            contractRef: dbUser.zapsign_contract_url || undefined,
            photoUrl: dbUser.photo_url || undefined,
            accountId: dbUser.account_id || undefined,
            accountCvu: dbUser.account_cvu || undefined,
            accountAlias: dbUser.account_alias || undefined,
            distributorId: dbUser.distributor_id || undefined,
            distributorName: dbUser.distributor_name || undefined,
            createdAt: dbUser.created_at,
            updatedAt: dbUser.updated_at,
        };
    }

    async getAll(options?: QueryOptions): Promise<PaginatedResult<User> | User[]> {
        let query = supabase
            .from(USER_VIEW)
            .select("*", { count: "exact" });

        if (options?.search) {
            // Comas y paréntesis rompen la sintaxis del filtro .or()
            const search = options.search.replace(/[,()]/g, " ").trim();
            const filters = SEARCH_COLUMNS.map((col) => `${col}.ilike.%${search}%`);

            // "30-71234567-1" o "30.123.456" => buscar también solo los dígitos
            const digits = search.replace(/\D/g, "");
            if (digits && digits !== search && /^[\d\s.\-]+$/.test(search)) {
                filters.push(...NUMERIC_COLUMNS.map((col) => `${col}.ilike.%${digits}%`));
            }
            const searchFilter = filters.join(",");

            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(search);
            query = query.or(isUuid ? `${searchFilter},id.eq.${search}` : searchFilter);
        }

        if (options?.status && options.status !== "all") {
            query = query.eq("verification_status", options.status);
        }

        if (options?.accountType && options.accountType !== "all") {
            query = query.eq("account_type", options.accountType);
        }

        // "none" = sin distribuidor asignado
        if (options?.distributorId && options.distributorId !== "all") {
            query = options.distributorId === "none"
                ? query.is("distributor_id", null)
                : query.eq("distributor_id", options.distributorId);
        }

        query = query.eq("role", "user");
        query = query.order("created_at", { ascending: false });

        if (options?.page !== undefined && options?.pageSize !== undefined) {
            const from = options.page * options.pageSize;
            const to = from + options.pageSize - 1;
            query = query.range(from, to);

            const { data, error, count } = await query;
            if (error) throw new Error(`Error fetching users: ${error.message}`);

            return {
                data: ((data || []) as DbUser[]).map((u) => this.mapToEntity(u)),
                total: count || 0,
                page: options.page,
                pageSize: options.pageSize,
                totalPages: Math.ceil((count || 0) / options.pageSize),
            };
        }

        const { data, error } = await query;
        if (error) throw new Error(`Error fetching users: ${error.message}`);
        return ((data || []) as DbUser[]).map((u) => this.mapToEntity(u));
    }

    async getById(id: string): Promise<User | null> {
        const { data, error } = await supabase
            .from(USER_VIEW)
            .select("*")
            .eq("id", id)
            .single();

        if (error) {
            if (error.code === "PGRST116") return null; // Not found
            throw new Error(`Error fetching user: ${error.message}`);
        }
        return this.mapToEntity(data as DbUser);
    }

    async create(user: User): Promise<User> {
        throw new Error("User creation is handled by Supabase Auth");
    }

    async update(user: User): Promise<User> {
        const { error } = await supabase
            .from("users")
            .update({
                first_name: user.firstName,
                last_name: user.lastName,
                phone: user.phone,
                photo_url: user.photoUrl,
                updated_at: new Date().toISOString(),
            })
            .eq("id", user.id);

        if (error) throw new Error(`Error updating user: ${error.message}`);
        const updated = await this.getById(user.id);
        if (!updated) throw new Error("Error updating user: not found");
        return updated;
    }

    async delete(id: string): Promise<void> {
        throw new Error("User deletion should be handled through Supabase Auth");
    }

    async updateStatus(id: string, status: VerificationStatus): Promise<void> {
        const { error } = await supabase
            .from("users")
            .update({ verification_status: status, updated_at: new Date().toISOString() })
            .eq("id", id);

        if (error) throw new Error(`Error updating user status: ${error.message}`);
    }

    /** Aprueba o rechaza una cuenta (la RPC valida en la BD que quien llama sea admin) */
    async reviewUser(id: string, decision: "approve" | "reject", reason?: string): Promise<void> {
        const { error } = await supabase.rpc("admin_review_user", {
            p_user_id: id,
            p_decision: decision,
            p_reason: reason ?? null,
        });

        if (error) {
            // Los errores de la RPC vienen como "CODIGO: mensaje legible"
            throw new Error(error.message.replace(/^[A-Z_]+:\s*/, ""));
        }
    }

    async getReviews(userId: string): Promise<AccountReview[]> {
        const { data, error } = await supabase
            .from("account_reviews")
            .select("id, decision, previous_status, reason, created_at, reviewer:users!account_reviews_reviewed_by_fkey(first_name, last_name)")
            .eq("user_id", userId)
            .order("created_at", { ascending: false });

        if (error) throw new Error(`Error fetching reviews: ${error.message}`);

        return (data || []).map((r: any) => ({
            id: r.id,
            decision: r.decision,
            previousStatus: r.previous_status || undefined,
            reason: r.reason || undefined,
            reviewerName: r.reviewer ? `${r.reviewer.first_name} ${r.reviewer.last_name}` : undefined,
            createdAt: r.created_at,
        }));
    }

    /**
     * URL para abrir el contrato. El bucket "documents" es privado: las rutas
     * (y las URLs públicas viejas de ese bucket) se resuelven con una URL firmada.
     * Las URLs externas (ej. ZapSign) se devuelven tal cual.
     */
    async getContractUrl(contractRef: string): Promise<string> {
        let path: string | null = null;
        if (!/^https?:\/\//i.test(contractRef)) {
            path = contractRef;
        } else if (contractRef.includes(PUBLIC_DOCUMENTS_MARKER)) {
            path = decodeURIComponent(contractRef.split(PUBLIC_DOCUMENTS_MARKER)[1].split("?")[0]);
        }

        if (!path) return contractRef;

        const { data, error } = await supabase.storage.from(DOCUMENTS_BUCKET).createSignedUrl(path, 60 * 5);
        if (error || !data?.signedUrl) throw new Error(`No se pudo abrir el contrato: ${error?.message ?? "sin URL"}`);
        return data.signedUrl;
    }

    async getAccountLimits(userId: string): Promise<{
        accountId: string;
        monthlyLimit: number;
        dailyLimit: number | null;
        perTransactionLimit: number | null;
        monthlySpent: number;
        monthlyAvailable: number;
    } | null> {
        // Buscamos cuenta principal
        let { data: account, error: accError } = await supabase
            .from("accounts")
            .select("id")
            .eq("user_id", userId)
            .eq("is_primary", true)
            .maybeSingle();

        // Si no hay principal, tomamos la primera que encontremos
        if (!account) {
            const { data: accounts } = await supabase
                .from("accounts")
                .select("id")
                .eq("user_id", userId)
                .limit(1);

            if (!accounts || accounts.length === 0) return null;
            account = accounts[0];
        }

        const { data, error } = await supabase
            .from("account_limits")
            .select("*")
            .eq("account_id", account.id)
            .maybeSingle();

        if (error || !data) return null;

        return {
            accountId: account.id,
            monthlyLimit: parseFloat(data.monthly_limit || "0"),
            dailyLimit: data.daily_limit ? parseFloat(data.daily_limit) : null,
            perTransactionLimit: data.per_transaction_limit ? parseFloat(data.per_transaction_limit) : null,
            monthlySpent: parseFloat(data.monthly_spent || "0"),
            monthlyAvailable: parseFloat(data.monthly_available || "0"),
        };
    }

    async updateAccountLimits(accountId: string, limits: {
        monthlyLimit?: number;
        dailyLimit?: number | null;
        perTransactionLimit?: number | null;
    }): Promise<void> {
        const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
        if (limits.monthlyLimit !== undefined) updateData.monthly_limit = limits.monthlyLimit;
        if (limits.dailyLimit !== undefined) updateData.daily_limit = limits.dailyLimit;
        if (limits.perTransactionLimit !== undefined) updateData.per_transaction_limit = limits.perTransactionLimit;

        const { error } = await supabase
            .from("account_limits")
            .update(updateData)
            .eq("account_id", accountId);

        if (error) throw new Error(`Error updating account limits: ${error.message}`);
    }

    async getStats(): Promise<UserStats> {
        const count = async (apply?: (q: any) => any): Promise<number> => {
            let q: any = supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "user");
            if (apply) q = apply(q);
            const { count: c, error } = await q;
            if (error) throw new Error(`Error counting users: ${error.message}`);
            return c || 0;
        };

        const [total, active, suspended, pending, business] = await Promise.all([
            count(),
            count((q) => q.eq("verification_status", "verified")),
            count((q) => q.eq("verification_status", "suspended")),
            count((q) => q.eq("verification_status", "pending")),
            count((q) => q.eq("account_type", "business")),
        ]);

        return { total, active, suspended, pending, business };
    }
}
