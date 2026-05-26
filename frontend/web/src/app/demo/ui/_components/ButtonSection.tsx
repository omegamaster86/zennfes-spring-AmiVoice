"use client";

import { Mail, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function ButtonSection() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground mb-4">
          バリアント・サイズ別のボタン
        </p>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2 text-muted-foreground">
              Variants
            </p>
            <div className="flex flex-wrap gap-3">
              <Button variant="default">Default</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
              <Button variant="destructive">Destructive</Button>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2 text-muted-foreground">
              Sizes
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="lg">Large</Button>
              <Button size="default">Default</Button>
              <Button size="sm">Small</Button>
              <Button size="icon">
                <Plus />
              </Button>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2 text-muted-foreground">
              With Icon
            </p>
            <div className="flex flex-wrap gap-3">
              <Button>
                <Mail className="mr-2 h-4 w-4" />
                メール送信
              </Button>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                削除
              </Button>
              <Button variant="outline" disabled>
                無効状態
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-muted-foreground mb-3">
          Badge — ラベル・ステータス表示
        </p>
        <div className="flex flex-wrap gap-3">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Destructive</Badge>
        </div>
      </div>
    </div>
  );
}
