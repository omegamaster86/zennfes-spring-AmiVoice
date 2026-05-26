import Link from "next/link";
import { Button } from "@/components/ui/button";
import { prepareSetupIntent } from "./_apis/setup-intent.server";
import { AddCardForm } from "./_components/AddCardForm";

/**
 * カード登録ページ
 *
 * Server Component で SetupIntent を準備し client_secret を Client へ渡す。
 * Client 側で Stripe Elements の Payment Element を表示してカード入力を行う。
 */
export default async function AddPaymentMethodPage() {
  const setupIntent = await prepareSetupIntent();

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">カードを追加</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          クレジットカード情報を入力して支払い方法を登録します。
        </p>
      </div>

      {setupIntent === null ? (
        <div
          className="rounded-md border border-destructive/40 bg-destructive/10 p-6 text-sm text-destructive"
          role="alert"
        >
          <p className="font-medium">カード登録の初期化に失敗しました。</p>
          <p className="mt-1">
            時間をおいて再度お試しください。問題が解決しない場合は管理者へお問い合わせください。
          </p>
          <div className="mt-4">
            <Button asChild variant="outline" size="sm">
              <Link href="/payment-methods">支払い方法一覧へ戻る</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <AddCardForm
            clientSecret={setupIntent.clientSecret}
            setupIntentId={setupIntent.setupIntentId}
          />
        </div>
      )}
    </div>
  );
}
