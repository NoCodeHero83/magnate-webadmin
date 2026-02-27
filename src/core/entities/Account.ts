export interface Account {
    id: string;
    userId: string;
    accountTypeId: string;
    cbu: string;
    cvu: string;
    alias: string;
    balance: string;
    status: "active" | "blocked" | "suspended" | "closed";
    isPrimary: boolean;
    createdAt: string;
    updatedAt: string;
}
