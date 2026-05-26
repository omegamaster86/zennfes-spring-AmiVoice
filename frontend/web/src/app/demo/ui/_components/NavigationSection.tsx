"use client";

import {
  ChevronDown,
  Database,
  FileText,
  LogOut,
  Search,
  Settings,
  Terminal,
  User,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function NavigationSection() {
  const [commandOpen, setCommandOpen] = useState(false);

  return (
    <div className="space-y-8">
      {/* Tabs */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">Tabs</p>
        <Tabs defaultValue="overview" className="w-full max-w-lg">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">概要</TabsTrigger>
            <TabsTrigger value="analytics">分析</TabsTrigger>
            <TabsTrigger value="settings">設定</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="border rounded-lg p-4 mt-2">
            <h3 className="font-medium mb-1">概要タブ</h3>
            <p className="text-sm text-muted-foreground">
              プロジェクトの全体的な状況を確認できます。
            </p>
          </TabsContent>
          <TabsContent value="analytics" className="border rounded-lg p-4 mt-2">
            <h3 className="font-medium mb-1">分析タブ</h3>
            <p className="text-sm text-muted-foreground">
              アクセス数・売上などのデータを分析します。
            </p>
          </TabsContent>
          <TabsContent value="settings" className="border rounded-lg p-4 mt-2">
            <h3 className="font-medium mb-1">設定タブ</h3>
            <p className="text-sm text-muted-foreground">
              各種設定を変更できます。
            </p>
          </TabsContent>
        </Tabs>
      </div>

      {/* Accordion */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">Accordion</p>
        <Accordion type="single" collapsible className="w-full max-w-lg">
          {[
            {
              value: "item-1",
              trigger: "shadcn/ui とは？",
              content:
                "Radix UI + Tailwind CSS で構築されたヘッドレス UI コンポーネントライブラリです。スタイルをプロジェクトに合わせて自由にカスタマイズできます。",
            },
            {
              value: "item-2",
              trigger: "インストール方法は？",
              content:
                "npx shadcn@latest add コマンドで必要なコンポーネントだけを追加できます。不要なコンポーネントはインストールする必要はありません。",
            },
            {
              value: "item-3",
              trigger: "カスタマイズ方法は？",
              content:
                "コンポーネントのソースコードが直接プロジェクトに追加されるため、CSS 変数や Tailwind クラスを変更することで自由にカスタマイズできます。",
            },
          ].map(({ value, trigger, content }) => (
            <AccordionItem key={value} value={value}>
              <AccordionTrigger>{trigger}</AccordionTrigger>
              <AccordionContent>{content}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* Dropdown Menu */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">
          Dropdown Menu
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              メニューを開く <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>マイアカウント</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => toast("プロフィールを開きました")}>
              <User className="mr-2 h-4 w-4" />
              プロフィール
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => toast("設定を開きました")}>
              <Settings className="mr-2 h-4 w-4" />
              設定
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>表示設定</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuCheckboxItem checked>
                  ツールバーを表示
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem>
                  ミニマップを表示
                </DropdownMenuCheckboxItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => toast.error("ログアウトしました")}
            >
              <LogOut className="mr-2 h-4 w-4" />
              ログアウト
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Command */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">Command</p>
        <div className="space-y-3">
          <Button variant="outline" onClick={() => setCommandOpen(true)}>
            <Search className="mr-2 h-4 w-4" />
            コマンドパレットを開く
            <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              ⌘K
            </kbd>
          </Button>

          <div className="border rounded-lg max-w-lg">
            <Command>
              <CommandInput placeholder="コマンドを検索…" />
              <CommandList>
                <CommandEmpty>該当なし</CommandEmpty>
                <CommandGroup heading="ドキュメント">
                  <CommandItem
                    onSelect={() => toast("ドキュメントを開きました")}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    ドキュメント
                    <CommandShortcut>⌘D</CommandShortcut>
                  </CommandItem>
                  <CommandItem
                    onSelect={() => toast("APIリファレンスを開きました")}
                  >
                    <Database className="mr-2 h-4 w-4" />
                    APIリファレンス
                  </CommandItem>
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup heading="開発ツール">
                  <CommandItem onSelect={() => toast("ターミナルを開きました")}>
                    <Terminal className="mr-2 h-4 w-4" />
                    ターミナル
                    <CommandShortcut>⌘T</CommandShortcut>
                  </CommandItem>
                  <CommandItem onSelect={() => toast("設定を開きました")}>
                    <Settings className="mr-2 h-4 w-4" />
                    設定
                    <CommandShortcut>⌘,</CommandShortcut>
                  </CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
          </div>
        </div>

        <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
          <CommandInput placeholder="コマンドを検索…" />
          <CommandList>
            <CommandEmpty>該当するコマンドがありません</CommandEmpty>
            <CommandGroup heading="クイックアクション">
              <CommandItem
                onSelect={() => {
                  toast("新規作成しました");
                  setCommandOpen(false);
                }}
              >
                <FileText className="mr-2 h-4 w-4" />
                新規作成
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  toast("設定を開きました");
                  setCommandOpen(false);
                }}
              >
                <Settings className="mr-2 h-4 w-4" />
                設定を開く
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  toast.error("ログアウトしました");
                  setCommandOpen(false);
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                ログアウト
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </CommandDialog>
      </div>
    </div>
  );
}
