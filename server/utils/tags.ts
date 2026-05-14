import { norm } from "../../client/src/utils/norm";

export interface ExtraTag {
  key: string;
  value: string;
}

export interface ItemWithExtraTags {
  title?: string;
  key?: string;
  composer?: string;
  style?: string;
  extraTags?: ExtraTag[];
}

export function buildTagsFromItem({ title, key, composer, style, extraTags = [] }: ItemWithExtraTags) {
  const base = [];
  if (title?.trim()) base.push({ key: "Title", value: title.trim() });
  if (key?.trim()) base.push({ key: "Key", value: key.trim() });
  if (composer?.trim()) base.push({ key: "Composer", value: composer.trim() });
  if (style?.trim()) base.push({ key: "Style", value: style.trim() });
  
  return [...base, ...extraTags.filter(t => t.key?.trim() && t.value?.trim())];
}