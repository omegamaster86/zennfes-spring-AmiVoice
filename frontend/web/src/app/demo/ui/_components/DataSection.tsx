"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const INVOICES = [
  {
    id: "INV-001",
    status: "支払済",
    method: "クレジットカード",
    amount: "¥12,000",
  },
  { id: "INV-002", status: "保留中", method: "PayPay", amount: "¥5,500" },
  { id: "INV-003", status: "未払い", method: "銀行振込", amount: "¥23,000" },
  {
    id: "INV-004",
    status: "支払済",
    method: "クレジットカード",
    amount: "¥8,800",
  },
  { id: "INV-005", status: "保留中", method: "コンビニ払い", amount: "¥3,200" },
];

const STATUS_BADGE: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  支払済: "default",
  保留中: "secondary",
  未払い: "destructive",
};

const SCROLL_ITEMS = Array.from(
  { length: 20 },
  (_, i) => `アイテム ${i + 1} — スクロールエリアのサンプルテキストです`,
);

export function DataSection() {
  return (
    <div className="space-y-8">
      {/* Avatar */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">Avatar</p>
        <div className="flex flex-wrap items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src="https://github.com/shadcn.png" alt="shadcn" />
            <AvatarFallback>SC</AvatarFallback>
          </Avatar>
          <Avatar className="h-12 w-12">
            <AvatarImage src="https://github.com/vercel.png" alt="Vercel" />
            <AvatarFallback>VC</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>山田</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>AB</AvatarFallback>
          </Avatar>
        </div>
      </div>

      <Separator />

      {/* Progress */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">Progress</p>
        <div className="space-y-3 max-w-md">
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>アップロード中</span>
              <span>33%</span>
            </div>
            <Progress value={33} />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>処理完了</span>
              <span>75%</span>
            </div>
            <Progress value={75} />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>完了</span>
              <span>100%</span>
            </div>
            <Progress value={100} />
          </div>
        </div>
      </div>

      <Separator />

      {/* Skeleton */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">Skeleton</p>
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[200px]" />
            <Skeleton className="h-4 w-[150px]" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>

      <Separator />

      {/* Scroll Area */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">Scroll Area</p>
        <ScrollArea className="h-48 w-full max-w-sm rounded-md border">
          <div className="p-4 space-y-2">
            {SCROLL_ITEMS.map((item) => (
              <div key={item} className="text-sm py-1 border-b last:border-0">
                {item}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      <Separator />

      {/* Table */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">Table</p>
        <div className="rounded-md border">
          <Table>
            <TableCaption>最近の請求一覧</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>請求番号</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>支払方法</TableHead>
                <TableHead className="text-right">金額</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {INVOICES.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">{inv.id}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_BADGE[inv.status] ?? "outline"}>
                      {inv.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{inv.method}</TableCell>
                  <TableCell className="text-right">{inv.amount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
