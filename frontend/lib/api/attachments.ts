import api, { getApiOrigin } from "@/lib/api/client";

export type AttachmentKind = "CONTRACT" | "INVOICE" | "CONTENT";

export type ProposalAttachment = {
  id: string;
  proposalId: string;
  kind: AttachmentKind;
  originalName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
  urlPath: string;
  createdAt: string;
};

export function attachmentFullUrl(urlPath: string, version?: string): string {
  const url = new URL(urlPath, getApiOrigin());
  if (version) url.searchParams.set("v", version);
  return url.toString();
}

export async function getProposalAttachments(
  proposalId: string,
): Promise<ProposalAttachment[]> {
  const { data } = await api.get<ProposalAttachment[]>(
    `/proposals/${proposalId}/attachments`,
  );
  return data;
}

export async function uploadProposalAttachment(
  proposalId: string,
  kind: AttachmentKind,
  file: File,
): Promise<ProposalAttachment> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post<ProposalAttachment>(
    `/proposals/${proposalId}/attachments?kind=${kind}`,
    form,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data;
}

export async function deleteProposalAttachment(
  proposalId: string,
  attachmentId: string,
): Promise<void> {
  await api.delete(`/proposals/${proposalId}/attachments/${attachmentId}`);
}

export async function uploadProposalFiles(
  proposalId: string,
  files: Partial<Record<AttachmentKind, File[]>>,
): Promise<void> {
  const tasks: Promise<unknown>[] = [];
  for (const kind of ["CONTRACT", "INVOICE", "CONTENT"] as AttachmentKind[]) {
    for (const file of files[kind] ?? []) {
      tasks.push(uploadProposalAttachment(proposalId, kind, file));
    }
  }
  await Promise.all(tasks);
}
