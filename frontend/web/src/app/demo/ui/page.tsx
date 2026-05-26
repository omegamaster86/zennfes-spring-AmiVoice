import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ButtonSection } from "./_components/ButtonSection";
import { DataSection } from "./_components/DataSection";
import { FeedbackSection } from "./_components/FeedbackSection";
import { FormSection } from "./_components/FormSection";
import { InputSection } from "./_components/InputSection";
import { NavigationSection } from "./_components/NavigationSection";
import { SpecialInputSection } from "./_components/SpecialInputSection";

const SECTIONS = [
  { id: "buttons", label: "Button / Badge" },
  { id: "inputs", label: "Input Controls" },
  { id: "special-inputs", label: "Special Inputs" },
  { id: "form", label: "Form" },
  { id: "navigation", label: "Navigation" },
  { id: "data", label: "Data Display" },
  { id: "feedback", label: "Feedback" },
];

/**
 * shadcn/ui コンポーネントカタログページ
 * /demo/ui でアクセス可能
 * 配色はすべて globals.css の CSS カスタムプロパティ経由
 */
export default function UiCatalogPage() {
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 border-b border-border bg-background backdrop-blur-sm">
          <div className="h-1 w-full bg-primary" />
          <div className="mx-auto max-w-5xl px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-1 rounded-full bg-primary" />
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-foreground">
                    UI コンポーネントカタログ
                  </h1>
                  <p className="text-xs text-muted-foreground">shadcn/ui</p>
                </div>
              </div>
              <span className="rounded-full border border-primary bg-secondary px-3 py-1 text-xs font-semibold text-primary">
                デモ
              </span>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-5xl px-6 py-8">
          <div className="flex gap-8">
            <aside className="hidden md:block w-44 shrink-0">
              <nav className="sticky top-24 space-y-1">
                <p className="mb-3 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  セクション
                </p>
                {SECTIONS.map(({ id, label }) => (
                  <a
                    key={id}
                    href={`#${id}`}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    {label}
                  </a>
                ))}
              </nav>
            </aside>

            <div className="md:hidden -mx-6 px-6 pb-6 overflow-x-auto">
              <div className="flex gap-2 min-w-max">
                {SECTIONS.map(({ id, label }) => (
                  <a
                    key={id}
                    href={`#${id}`}
                    className="rounded-full border border-border px-3 py-1 text-sm font-medium text-foreground hover:border-primary hover:bg-accent transition-colors whitespace-nowrap"
                  >
                    {label}
                  </a>
                ))}
              </div>
            </div>

            <main className="flex-1 min-w-0 space-y-10">
              <SectionCard id="buttons" title="Button / Badge">
                {" "}
                <ButtonSection />{" "}
              </SectionCard>
              <SectionCard id="inputs" title="Input Controls">
                {" "}
                <InputSection />{" "}
              </SectionCard>
              <SectionCard id="special-inputs" title="Special Inputs">
                {" "}
                <SpecialInputSection />{" "}
              </SectionCard>
              <SectionCard id="form" title="Form">
                {" "}
                <FormSection />{" "}
              </SectionCard>
              <SectionCard id="navigation" title="Navigation">
                {" "}
                <NavigationSection />
              </SectionCard>
              <SectionCard id="data" title="Data Display">
                {" "}
                <DataSection />{" "}
              </SectionCard>
              <SectionCard id="feedback" title="Feedback & Overlays">
                <FeedbackSection />{" "}
              </SectionCard>
              <div className="pb-16" />
            </main>
          </div>
        </div>

        <Toaster richColors position="bottom-right" />
      </div>
    </TooltipProvider>
  );
}

function SectionCard({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="mb-6 flex items-center gap-3">
        <div className="h-5 w-0.5 rounded-full bg-primary" />
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <div className="flex-1 border-t border-border" />
      </div>
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        {children}
      </div>
    </section>
  );
}
