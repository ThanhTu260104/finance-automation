type SiteConfig = {
  name: string;
  shortName: string;
  description: string;
  locale: string;
  supportPhone: string;
};

export const siteConfig: SiteConfig = {
  name: process.env.NEXT_PUBLIC_SITE_NAME ?? "SAW - REQUESTS",
  shortName: process.env.NEXT_PUBLIC_SITE_SHORT_NAME ?? "Xin chào!",
  description:
    process.env.NEXT_PUBLIC_SITE_DESCRIPTION ??
    "Hệ thống đề xuất & phê duyệt tài chính",
  locale: process.env.NEXT_PUBLIC_SITE_LOCALE ?? "vi",
  supportPhone: process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? "0968549276",
};
