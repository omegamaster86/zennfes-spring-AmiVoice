import { Suspense } from "react";
import { SearchForm } from "./_components/SearchForm";
import { SearchResults } from "./_components/SearchResults";
import { SearchResultsSkeleton } from "./_components/SearchResults/SearchResultsSkeleton";

type SearchPageProps = {
  searchParams: Promise<{ q?: string }>;
};

/**
 * ToDo全文検索ページ
 * pgroonga を使って title / description から検索
 */
export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  const keyword = (q ?? "").trim();

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">ToDo検索</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          タイトル・説明文から全文検索で ToDo を探します。
        </p>
      </div>

      <div className="mb-6">
        <SearchForm />
      </div>

      <Suspense key={keyword} fallback={<SearchResultsSkeleton />}>
        <SearchResults keyword={keyword} />
      </Suspense>
    </div>
  );
}
