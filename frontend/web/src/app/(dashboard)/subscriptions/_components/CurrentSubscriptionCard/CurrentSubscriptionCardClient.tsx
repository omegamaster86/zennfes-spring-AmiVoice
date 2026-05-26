"use client";

import { CalendarClock, ShieldCheck, ShieldOff } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/services/stripe/format";
import type {
  CurrentSubscription,
  SubscriptionStatus,
} from "@/types/stripe-schemas";
import {
  type CancelSubscriptionState,
  cancelSubscription,
} from "../../_actions/cancel-subscription";

const STATUS_LABEL: Record<
  SubscriptionStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  active: { label: "有効", variant: "default" },
  trialing: { label: "トライアル中", variant: "secondary" },
  past_due: { label: "支払い遅延", variant: "destructive" },
  unpaid: { label: "未払い", variant: "destructive" },
  incomplete: { label: "決済処理中", variant: "outline" },
  incomplete_expired: { label: "期限切れ", variant: "outline" },
  canceled: { label: "解約済み", variant: "outline" },
  paused: { label: "一時停止中", variant: "secondary" },
};

const BILLING_INTERVAL_LABEL = {
  month: "月額",
  year: "年額",
} as const;

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return iso;
  }
}

const initialState: CancelSubscriptionState = { success: false, message: "" };

/**
 * 現在の契約状態カード（Client Component）
 */
export function CurrentSubscriptionCardClient({
  subscription,
}: {
  subscription: CurrentSubscription | null;
}) {
  const [state, formAction, pending] = useActionState(
    cancelSubscription,
    initialState,
  );
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (state.message === "") return;
    if (state.success) {
      toast.success(state.message);
      setDialogOpen(false);
    } else {
      toast.error(state.message);
    }
  }, [state]);

  if (subscription === null) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center">
        <ShieldOff
          className="mx-auto h-10 w-10 text-muted-foreground"
          aria-hidden
        />
        <p className="mt-4 text-sm text-muted-foreground">
          現在ご契約中のサブスクリプションはありません。
          <br />
          下記からプランをお選びください。
        </p>
      </div>
    );
  }

  const status = STATUS_LABEL[subscription.status];
  const isCancelable =
    (subscription.status === "active" ||
      subscription.status === "trialing" ||
      subscription.status === "past_due") &&
    !subscription.cancelAtPeriodEnd;

  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-emerald-500" aria-hidden />
            <h3 className="text-xl font-semibold text-foreground">
              {subscription.planName ?? "ご利用中のプラン"}
            </h3>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>

          <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            {subscription.amount !== null && subscription.currency && (
              <div>
                <dt className="text-muted-foreground">料金</dt>
                <dd className="font-semibold text-foreground">
                  {formatCurrency(subscription.amount, subscription.currency)}
                  {subscription.billingInterval &&
                    ` / ${BILLING_INTERVAL_LABEL[subscription.billingInterval]}`}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-muted-foreground">次回更新日</dt>
              <dd className="flex items-center gap-1 text-foreground">
                <CalendarClock className="h-4 w-4" aria-hidden />
                {formatDate(subscription.currentPeriodEnd)}
              </dd>
            </div>
          </dl>

          {subscription.cancelAtPeriodEnd && (
            <p className="mt-4 rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
              {formatDate(subscription.currentPeriodEnd)}{" "}
              に解約予定です。それまではこのまま機能をご利用いただけます。
            </p>
          )}

          {subscription.status === "past_due" && (
            <p className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
              お支払いが確認できていません。お手数ですが支払い方法をご確認ください。
            </p>
          )}
        </div>

        {isCancelable && (
          <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm">
                解約する
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>解約してもよろしいですか？</AlertDialogTitle>
                <AlertDialogDescription>
                  期末（{formatDate(subscription.currentPeriodEnd)}
                  ）で解約されます。 それまでは引き続きご利用いただけます。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <form action={formAction}>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={pending}>
                    やめる
                  </AlertDialogCancel>
                  <AlertDialogAction asChild>
                    <Button type="submit" disabled={pending}>
                      {pending ? "処理中..." : "解約する"}
                    </Button>
                  </AlertDialogAction>
                </AlertDialogFooter>
              </form>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}
