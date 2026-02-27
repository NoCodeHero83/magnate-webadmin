export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dni: string;
  role: "user" | "admin";
  verificationStatus: "pending" | "verified" | "rejected" | "suspended";
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
}
