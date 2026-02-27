import { User } from "../entities/User";
import { QueryOptions, PaginatedResult } from "../types/pagination";

export interface IUserRepository {
    getAll(options?: QueryOptions): Promise<PaginatedResult<User> | User[]>;
    getById(id: string): Promise<User | null>;
    create(user: User): Promise<User>;
    update(user: User): Promise<User>;
    delete(id: string): Promise<void>;
    updateStatus(id: string, status: "pending" | "verified" | "rejected" | "suspended"): Promise<void>;
    getStats(): Promise<{
        total: number;
        active: number;
        suspended: number;
    }>;
}
