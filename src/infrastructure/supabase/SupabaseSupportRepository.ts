import { supabase } from "./client";
import { SupportSettings } from "../../core/entities/SupportSettings";

export class SupabaseSupportRepository {
    async getSettings(): Promise<SupportSettings | null> {
        const { data, error } = await supabase
            .from("support")
            .select("*")
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error("Error fetching support settings:", error);
            return null;
        }

        if (!data) return null;

        return {
            id: data.id.toString(),
            name: data.name,
            email: data.email,
            phone: data.phone,
        };
    }

    async updateSettings(settings: Omit<SupportSettings, "id">): Promise<boolean> {
        // First get the ID of the record we want to update (the first one)
        const { data: firstRecord } = await supabase.from("support").select("id").limit(1).single();

        if (!firstRecord) return false;

        const { error } = await supabase
            .from("support")
            .update({
                name: settings.name,
                email: settings.email,
                phone: settings.phone,
            })
            .eq("id", firstRecord.id);

        if (error) {
            console.error("Error updating support settings:", error);
            return false;
        }

        return true;
    }
}
