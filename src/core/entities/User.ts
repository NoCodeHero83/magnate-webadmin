export type VerificationStatus = "pending" | "verified" | "rejected" | "suspended";
export type AccountType = "personal" | "business";

export interface BusinessProfile {
  cuit: string;
  legalName: string;
  tradeName?: string;
  entityType: string;
  entityTypeName?: string;
  incorporationDate: string;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dni: string;
  cuitCuil?: string;
  role: "user" | "admin";
  verificationStatus: VerificationStatus;
  accountType: AccountType;
  businessProfile?: BusinessProfile;
  statusReason?: string;
  reviewedAt?: string;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AccountReview {
  id: string;
  decision: "approved" | "rejected";
  previousStatus?: string;
  reason?: string;
  reviewerName?: string;
  createdAt: string;
}

/** Nombre a mostrar: razón social / fantasía para empresas, nombre y apellido para personas */
export function getUserDisplayName(user: Pick<User, "accountType" | "businessProfile" | "firstName" | "lastName">): string {
  if (user.accountType === "business" && user.businessProfile) {
    return user.businessProfile.tradeName || user.businessProfile.legalName;
  }
  return `${user.firstName} ${user.lastName}`.trim();
}
