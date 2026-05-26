import { NewTodoForm } from "./_components/NewTodoForm";

/**
 * ToDo新規作成ページ（Server Component）
 * ページレイアウトと静的な部分を担当
 */
export default function TodoNewPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">新しいToDoを作成</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          必要な情報を入力して新しいToDoを作成できます。
        </p>
      </div>

      <div className="rounded-lg bg-card p-6 shadow">
        <NewTodoForm />
      </div>
    </div>
  );
}
