import { supabase } from "../supabase/client";
import { IUserRepository } from "../../core/repositories/IUserRepository";
import { User } from "../../core/entities/User";

export class SupabaseUserRepository implements IUserRepository {
    async getAll(): Promise<User[]> {
        const { data, error } = await supabase.from("users").select("*");
        if (error) throw new Error(error.message);
        return data as User[];
    }

    async getById(id: string): Promise<User | null> {
        const { data, error } = await supabase.from("users").select("*").eq("id", id).single();
        if (error) return null;
        return data as User;
    }

    async create(user: User): Promise<User> {
        const { data, error } = await supabase.from("users").insert(user).select().single();
        if (error) throw new Error(error.message);
        return data as User;
    }

    async update(user: User): Promise<User> {
        const { data, error } = await supabase.from("users").update(user).eq("id", user.id).select().single();
        if (error) throw new Error(error.message);
        return data as User;
    }

    async delete(id: string): Promise<void> {
        const { error } = await supabase.from("users").delete().eq("id", id);
        if (error) throw new Error(error.message);
    }
}
