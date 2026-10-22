export type TransactionStatus = "completed" | "processing" | "pending" | "failed" | "reversed" | "cancelled";

export interface Transaction {
    id: string;
    transactionTypeId: string;
    fromAccountId: string | null;
    toAccountId: string | null;
    amount: string;
    currency: string;
    concept: string | null;
    paymentMethod: string | null;
    paymentReference: string | null;
    status: TransactionStatus;
    commissionAmount: string;
    netAmount: string | null;
    referenceNumber: string | null;
    metadata: Record<string, any> | null;
    createdAt: string;
    completedAt: string | null;

    // Campos calculados para UI (no vienen de DB directamente)
    fromUserName?: string;
    toUserName?: string;
    isIncoming?: boolean;
    /** Movimiento de comisión (cliente -> Magnate, o reparto Magnate -> distribuidor) */
    isCommission?: boolean;
}
