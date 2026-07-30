import type { MediaUploadType } from "@/lib/server/r2";

export async function uploadMediaFile(file: File, type: MediaUploadType) {
  const presignResponse = await fetch("/api/media/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, fileName: file.name, contentType: file.type, size: file.size }),
  });
  const presignData = (await presignResponse.json().catch(() => null)) as { ok?: boolean; upload?: { uploadUrl: string; publicUrl: string; contentType: string }; error?: string } | null;
  if (!presignResponse.ok || !presignData?.ok || !presignData.upload) {
    throw new Error(presignData?.error || "Could not prepare upload.");
  }

  const uploadResponse = await fetch(presignData.upload.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": presignData.upload.contentType },
    body: file,
  });
  if (!uploadResponse.ok) throw new Error("Could not upload the file. Please try again.");
  return presignData.upload.publicUrl;
}
