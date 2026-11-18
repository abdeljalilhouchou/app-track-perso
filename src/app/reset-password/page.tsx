import { createClient } from "@/lib/supabase/server";
import { ResetPasswordScreen } from "@/components/reset-password-form";

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The email link signs the person in for this one change; without that session the link is spent.
  return <ResetPasswordScreen valid={!!user} />;
}
