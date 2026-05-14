// client/src/utils/leadSheets.ts
import { Filesystem, Directory } from "@capacitor/filesystem";

const bundledFiles = import.meta.glob("/src/assets/lead-sheets/*", {
  eager: true,
  as: "url",
}) as Record<string, string>;

const bundledByName = new Map<string, string>();

Object.entries(bundledFiles).forEach(([absPath, builtUrl]) => {
  const name = absPath.split("/").pop()!;
  bundledByName.set(name, builtUrl);
});

function sanitizeFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]/g, "-")
    .replace(/-+/g, "-");
}

export async function saveLeadSheetFile(file: File): Promise<string> {
  const reader = new FileReader();

  const base64Data: string = await new Promise((resolve, reject) => {
    reader.onload = () => {
      const result = String(reader.result || "");
      const base64 = result.split(",")[1];

      if (!base64) {
        reject(new Error("Invalid image data"));
        return;
      }

      resolve(base64);
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const safeName = sanitizeFileName(file.name);

  const uniqueName = `${Date.now()}-${safeName}`;

  await Filesystem.writeFile({
    path: `lead-sheets/${uniqueName}`,
    data: base64Data,
    directory: Directory.Data,
    recursive: true,
  });

  return uniqueName;
}

function getMimeType(name: string) {
  const lower = name.toLowerCase();

  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";

  return "image/png";
}

export async function loadLeadSheet(name: string): Promise<string | undefined> {
  try {
    const result = await Filesystem.readFile({
      path: `lead-sheets/${name}`,
      directory: Directory.Data,
    });

    const mimeType = getMimeType(name);

    return `data:${mimeType};base64,${result.data}`;
  } catch (err) {
    console.warn(`Filesystem miss for ${name}, falling back to bundled.`, err);
    return bundledByName.get(name);
  }
}

export async function resolveLeadSheet(nameOrPath?: string) {
  if (!nameOrPath) return undefined;

  if (
    nameOrPath.startsWith("data:") ||
    nameOrPath.startsWith("http://") ||
    nameOrPath.startsWith("https://") ||
    nameOrPath.startsWith("blob:") ||
    nameOrPath.startsWith("/assets/")
  ) {
    return nameOrPath;
  }

  const name = nameOrPath.split("/").pop()!;
  return await loadLeadSheet(name);
}