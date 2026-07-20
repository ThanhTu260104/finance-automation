import { pageSubtitle, pageTitle } from "@/lib/styles";

type PageHeaderProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className={pageTitle}>{title}</h1>
        {description && (
          <p className={`${pageSubtitle} mt-1`}>{description}</p>
        )}
      </div>
      {action}
    </header>
  );
}
