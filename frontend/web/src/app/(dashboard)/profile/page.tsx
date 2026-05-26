import { createClient } from "@/services/supabase/server";
import { ProfileForm } from "./_components/ProfileForm";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  let currentEmail = "";
  if (session) {
    const { data: claimsData } = await supabase.auth.getClaims(
      session.access_token,
    );
    currentEmail = (claimsData?.claims?.email as string | undefined) ?? "";
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">アカウント設定</h1>
          <p className="mt-1 text-sm text-gray-500">
            現在のメールアドレス: {currentEmail}
          </p>
        </div>
        <ProfileForm currentEmail={currentEmail} />
      </div>
    </div>
  );
}
