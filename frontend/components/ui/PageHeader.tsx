import { pageSubtitle, pageTitle } from "@/lib/styles";

type PageHeaderProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <header className="mb-5 flex min-w-0 flex-col items-stretch gap-3 sm:mb-6 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <h1 className={`${pageTitle} break-words text-xl sm:text-2xl`}>{title}</h1>
        {description && (
          <p className={`${pageSubtitle} mt-1 break-words`}>{description}</p>
        )}
      </div>
      {action}
    </header>
  );
}
