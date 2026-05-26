"use client";

import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function FeedbackSection() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="space-y-8">
      {/* Alert */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">Alert</p>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>情報</AlertTitle>
          <AlertDescription>
            これは情報メッセージです。ユーザーに知らせたい内容を表示します。
          </AlertDescription>
        </Alert>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>エラー</AlertTitle>
          <AlertDescription>
            処理中にエラーが発生しました。もう一度お試しください。
          </AlertDescription>
        </Alert>
      </div>

      {/* Toast / Sonner */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">
          Toast (Sonner)
        </p>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => toast("通常のトースト通知")}>
            Default Toast
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              toast.success("操作が完了しました", {
                description: "データは正常に保存されました",
              })
            }
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Success
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              toast.error("エラーが発生しました", {
                description: "もう一度お試しください",
              })
            }
          >
            <AlertCircle className="mr-2 h-4 w-4" />
            Error
          </Button>
          <Button variant="outline" onClick={() => toast.loading("処理中…")}>
            Loading
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              toast.promise(
                new Promise((resolve) => setTimeout(resolve, 2000)),
                {
                  loading: "保存中…",
                  success: "保存完了！",
                  error: "保存に失敗しました",
                },
              )
            }
          >
            Promise Toast
          </Button>
        </div>
      </div>

      {/* Dialog */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">Dialog</p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">ダイアログを開く</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>プロフィール編集</DialogTitle>
              <DialogDescription>
                以下の情報を変更して保存してください。
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="dialog-name" className="text-right">
                  名前
                </Label>
                <Input
                  id="dialog-name"
                  defaultValue="山田 太郎"
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="dialog-email" className="text-right">
                  メール
                </Label>
                <Input
                  id="dialog-email"
                  defaultValue="yamada@example.com"
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                キャンセル
              </Button>
              <Button
                onClick={() => {
                  setDialogOpen(false);
                  toast.success("保存しました");
                }}
              >
                保存する
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Alert Dialog */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">
          Alert Dialog
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">削除する</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
              <AlertDialogDescription>
                この操作は取り消せません。データは完全に削除されます。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>キャンセル</AlertDialogCancel>
              <AlertDialogAction onClick={() => toast.success("削除しました")}>
                削除する
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Sheet */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">Sheet</p>
        <div className="flex flex-wrap gap-3">
          {(["right", "left", "top", "bottom"] as const).map((side) => (
            <Sheet key={side}>
              <SheetTrigger asChild>
                <Button variant="outline">{side}</Button>
              </SheetTrigger>
              <SheetContent side={side}>
                <SheetHeader>
                  <SheetTitle>Sheet — {side}</SheetTitle>
                  <SheetDescription>
                    画面の{side}側からスライドインするパネルです。
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label>名前</Label>
                    <Input placeholder="名前を入力" />
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => toast.success("保存しました")}
                  >
                    保存する
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          ))}
        </div>
      </div>

      {/* Tooltip & Popover */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">
          Tooltip & Popover
        </p>
        <div className="flex flex-wrap gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline">ホバーしてください</Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>ここがツールチップのテキストです</p>
            </TooltipContent>
          </Tooltip>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">ポップオーバーを開く</Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-3">
                <h4 className="font-medium text-sm">クイック設定</h4>
                <div className="space-y-2">
                  <Label htmlFor="popover-name">表示名</Label>
                  <Input id="popover-name" placeholder="表示名を変更" />
                </div>
                <Button size="sm" className="w-full">
                  更新する
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}
