import { User } from "../../core/entities/User";
import { IUserRepository } from "../../core/repositories/IUserRepository";
import { supabase } from "./client";
import { QueryOptions, PaginatedResult } from "../../core/types/pagination";

interface DbUser {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    dni: string;
    role: string;
    verification_status: string;
    photo_url: string | null;
    created_at: string;
    updated_at: string;
}

export class SupabaseUserRepository implements IUserRepository {
    private mapToEntity(dbUser: DbUser): User {
        return {
            id: dbUser.id,
            firstName: dbUser.first_name,
            lastName: dbUser.last_name,
            email: dbUser.email,
            phone: dbUser.phone,
            dni: dbUser.dni,
            role: dbUser.role as "user" | "admin",
            verificationStatus: dbUser.verification_status as "pending" | "verified" | "rejected" | "suspended",
            photoUrl: dbUser.photo_url || undefined,
            createdAt: dbUser.created_at,
            updatedAt: dbUser.updated_at,
        };
    }

    async getAll(options?: QueryOptions): Promise<PaginatedResult<User> | User[]> {
        let query = supabase
            .from("users")
            .select("*", { count: "exact" });

        if (options?.search) {
            const search = options.search;
            // Búsqueda por nombre, email, dni, id, teléfono
            // Nota: id.eq para uuid
            const searchFilter = `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,dni.ilike.%${search}%,phone.ilike.%${search}%`;

            // Check if search might be a UUID for the id field
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(search);
            if (isUuid) {
                query = query.or(`${searchFilter},id.eq.${search}`);
            } else {
                query = query.or(searchFilter);
            }
        }

        if (options?.status && options.status !== "all") {
            if (options.status === "active") {
                query = query.neq("verification_status", "suspended");
            } else {
                query = query.eq("verification_status", options.status);
            }
        }

        // Siempre filtramos por role user para esta pantalla por defecto? 
        // El repositorio original filtraba en memoria. Mejor filtrar en query si es posible, 
        // pero IUserRepository.getAll() no especifica role.
        // Mantenemos el comportamiento pero optimizamos.
        query = query.eq("role", "user");

        query = query.order("created_at", { ascending: false });

        if (options?.page !== undefined && options?.pageSize !== undefined) {
            const from = options.page * options.pageSize;
            const to = from + options.pageSize - 1;
            query = query.range(from, to);

            const { data, error, count } = await query;
            if (error) throw new Error(`Error fetching users: ${error.message}`);

            return {
                data: (data || []).map(this.mapToEntity),
                total: count || 0,
                page: options.page,
                pageSize: options.pageSize,
                totalPages: Math.ceil((count || 0) / options.pageSize),
            };
        }

        const { data, error } = await query;
        if (error) throw new Error(`Error fetching users: ${error.message}`);
        return (data || []).map(this.mapToEntity);
    }

    async getById(id: string): Promise<User | null> {
        const { data, error } = await supabase
            .from("users")
            .select("*")
            .eq("id", id)
            .single();

        if (error) {
            if (error.code === "PGRST116") return null; // Not found
            throw new Error(`Error fetching user: ${error.message}`);
        }
        return this.mapToEntity(data);
    }

    async create(user: User): Promise<User> {
        throw new Error("User creation is handled by Supabase Auth");
    }

    async update(user: User): Promise<User> {
        const { data, error } = await supabase
            .from("users")
            .update({
                first_name: user.firstName,
                last_name: user.lastName,
                phone: user.phone,
                photo_url: user.photoUrl,
                updated_at: new Date().toISOString(),
            })
            .eq("id", user.id)
            .select()
            .single();

        if (error) throw new Error(`Error updating user: ${error.message}`);
        return this.mapToEntity(data);
    }

    async delete(id: string): Promise<void> {
        throw new Error("User deletion should be handled through Supabase Auth");
    }

    async updateStatus(id: string, status: "pending" | "verified" | "rejected" | "suspended"): Promise<void> {
        const { error } = await supabase
            .from("users")
            .update({ verification_status: status, updated_at: new Date().toISOString() })
            .eq("id", id);

        if (error) throw new Error(`Error updating user status: ${error.message}`);
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

    async getStats(): Promise<{ total: number; active: number; suspended: number }> {
        const { count: total } = await supabase
            .from("users")
            .select("*", { count: "exact", head: true })
            .eq("role", "user");

        const { count: active } = await supabase
            .from("users")
            .select("*", { count: "exact", head: true })
            .eq("role", "user")
            .neq("verification_status", "suspended");

        const { count: suspended } = await supabase
            .from("users")
            .select("*", { count: "exact", head: true })
            .eq("role", "user")
            .eq("verification_status", "suspended");

        return {
            total: total || 0,
            active: active || 0,
            suspended: suspended || 0,
        };
    }
}
