"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const formSchema = z.object({
  username: z
    .string()
    .min(2, { message: "ユーザー名は2文字以上で入力してください" })
    .max(50),
  email: z
    .string()
    .email({ message: "正しいメールアドレスを入力してください" }),
  bio: z
    .string()
    .max(200, { message: "自己紹介は200文字以内で入力してください" })
    .optional(),
  notifications: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

export function FormSection() {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      email: "",
      bio: "",
      notifications: false,
    },
  });

  function onSubmit(values: FormValues) {
    toast.success("フォーム送信成功", {
      description: `ユーザー名: ${values.username}`,
    });
    form.reset();
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        react-hook-form + zod によるバリデーション付きフォーム
      </p>

      <div className="max-w-md border rounded-lg p-6 bg-card">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ユーザー名</FormLabel>
                  <FormControl>
                    <Input placeholder="例: yamada_taro" {...field} />
                  </FormControl>
                  <FormDescription>
                    公開プロフィールに表示される名前です
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>メールアドレス</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="example@email.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>自己紹介</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="あなた自身について教えてください"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>最大200文字</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notifications"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <FormLabel>メール通知</FormLabel>
                    <FormDescription>
                      重要なお知らせをメールで受け取る
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full">
              送信する
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
