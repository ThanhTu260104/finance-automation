const OFFICE_EMBED_BASE = "https://view.officeapps.live.com/op/embed.aspx";

/** Microsoft Office Online can fetch the file only over public HTTPS (not localhost). */
export function canUseOfficeOnlineViewer(fileUrl: string, fileName?: string): boolean {
  if (process.env.NEXT_PUBLIC_OFFICE_VIEWER === "false") return false;

  const name = (fileName ?? fileUrl).toLowerCase();
  if (!/\.(xlsx|xls|xlsm|xlsb)(\?|$)/i.test(name)) return false;

  try {
    const url = new URL(fileUrl);
    if (url.protocol !== "https:") return false;

    const host = url.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.startsWith("192.168.") ||
      host.startsWith("10.") ||
      host.endsWith(".local")
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export function officeOnlineEmbedUrl(fileUrl: string): string {
  const embed = new URL(OFFICE_EMBED_BASE);
  embed.searchParams.set("src", fileUrl);
  return embed.toString();
}

export function officeOnlineViewUrl(fileUrl: string): string {
  const view = new URL("https://view.officeapps.live.com/op/view.aspx");
  view.searchParams.set("src", fileUrl);
  return view.toString();
}
