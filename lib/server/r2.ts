import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { DEFAULT_R2_PUBLIC_HOST } from "@/lib/media";

export type MediaUploadType = "profile-photo" | "verification" | "reel" | "reel-thumbnail" | "message";

type MediaFamily = "image" | "video";

type MediaUploadRule = {
  folder: string;
  families: MediaFamily[];
  maxBytes: number;
};

const UPLOAD_RULES: Record<MediaUploadType, MediaUploadRule> = {
  "profile-photo": { folder: "profile-photos", families: ["image"], maxBytes: 8 * 1024 * 1024 },
  verification: { folder: "verification", families: ["image"], maxBytes: 8 * 1024 * 1024 },
  reel: { folder: "reels", families: ["image", "video"], maxBytes: 80 * 1024 * 1024 },
  "reel-thumbnail": { folder: "reel-thumbnails", families: ["image"], maxBytes: 8 * 1024 * 1024 },
  message: { folder: "messages", families: ["image"], maxBytes: 8 * 1024 * 1024 },
};

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

let client: S3Client | null = null;

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function r2Client() {
  if (client) return client;
  const accountId = requiredEnv("R2_ACCOUNT_ID");
  client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requiredEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requiredEnv("R2_SECRET_ACCESS_KEY"),
    },
  });
  return client;
}

export function mediaPublicHost() {
  return (process.env.R2_PUBLIC_HOST?.trim() || DEFAULT_R2_PUBLIC_HOST).replace(/\/+$/, "");
}

function extensionFor(contentType: string) {
  return EXTENSIONS[contentType.toLowerCase()] || null;
}

function familyFor(contentType: string): MediaFamily | null {
  if (contentType.startsWith("image/")) return "image";
  if (contentType.startsWith("video/")) return "video";
  return null;
}

export function isAllowedPublicMediaUrl(url: string, families: MediaFamily[] = ["image", "video"]) {
  try {
    const parsed = new URL(url);
    const publicHost = new URL(mediaPublicHost());
    if (parsed.protocol !== "https:" || parsed.host !== publicHost.host) return false;
    if (!parsed.pathname.startsWith("/users/")) return false;
    const pathname = parsed.pathname.toLowerCase();
    const isImage = /\.(jpg|jpeg|png|webp|gif)$/.test(pathname);
    const isVideo = /\.(mp4|webm|mov)$/.test(pathname);
    return (isImage && families.includes("image")) || (isVideo && families.includes("video"));
  } catch {
    return false;
  }
}

export async function createPresignedMediaUpload(input: {
  userId: string;
  type: MediaUploadType;
  fileName?: string;
  contentType: string;
  size: number;
}) {
  const rule = UPLOAD_RULES[input.type];
  if (!rule) throw new Error("Unsupported upload type.");
  const contentType = input.contentType.trim().toLowerCase();
  const family = familyFor(contentType);
  if (!family || !rule.families.includes(family)) throw new Error("This file type is not allowed here.");
  if (!Number.isFinite(input.size) || input.size <= 0 || input.size > rule.maxBytes) {
    throw new Error(`File is too large. Maximum size is ${Math.round(rule.maxBytes / 1024 / 1024)} MB.`);
  }
  const extension = extensionFor(contentType);
  if (!extension) throw new Error("Use JPG, PNG, WEBP, GIF, MP4, WEBM, or MOV files.");

  const key = `users/${input.userId}/${rule.folder}/${crypto.randomUUID()}.${extension}`;
  const command = new PutObjectCommand({
    Bucket: requiredEnv("R2_BUCKET"),
    Key: key,
    ContentType: contentType,
  });
  const uploadUrl = await getSignedUrl(r2Client(), command, { expiresIn: 300 });
  return {
    key,
    uploadUrl,
    publicUrl: `${mediaPublicHost()}/${key}`,
    contentType,
    maxBytes: rule.maxBytes,
    expiresIn: 300,
  };
}
