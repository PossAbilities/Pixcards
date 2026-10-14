import { Logo } from "@/components/Logo";
import { Icon } from "@/components/Icon";

/** Full-page status message (404, errors) in the house style. */
export function StatusScreen({
  icon,
  title,
  children,
  actions,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
  actions: React.ReactNode;
}) {
  return (
    <main id="main" className="grid min-h-dvh place-items-center bg-background px-4 py-10">
      <div className="flex max-w-md flex-col items-center text-center">
        <Logo />
        <div className="mt-10 grid h-20 w-20 place-items-center rounded-2xl bg-primary-soft text-primary">
          <Icon name={icon} className="text-[40px]" />
        </div>
        <h1 className="mt-6 font-display text-3xl font-extrabold text-ink">{title}</h1>
        <div className="mt-3 text-muted">{children}</div>
        <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">{actions}</div>
      </div>
    </main>
  );
}
