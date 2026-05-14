type Collection = { id: string; name: string; description?: string; updatedAt?: number; [k: string]: any };
type ExtraTag = { key: string; value: string };
type Item = {
  id: string;
  collectionId: string;
  title: string;
  key?: string;
  composer?: string;
  style?: string;
  notes?: string;
  leadSheetUrl?: string;
  knowledgeLevel?: string;
  youtubeId?: string | null;
  spotifyUri?: string | null;
  appleMusicUrl?: string | null;
  startSeconds?: number | null;
  extraTags?: ExtraTag[];
  updatedAt?: number;
  [k: string]: any;
};

const LS_KEY = "flexlist_offline_db";

function emptyDB() { return { collections: [] as Collection[], items: [] as Item[], next: { c: 1, i: 1 } }; }
function loadDB() { const raw = localStorage.getItem(LS_KEY); return raw ? JSON.parse(raw) : emptyDB(); }
function saveDB(db: any) { localStorage.setItem(LS_KEY, JSON.stringify(db)); }

function persist(db: any, _reason?: string) {
  saveDB(db);
}

let __writeChain: Promise<any> = Promise.resolve();
function withWriteLock<T>(fn: () => T | Promise<T>): Promise<T> {
  const run = async () => fn();
  const p = __writeChain.then(run, run);
  __writeChain = p.then(() => undefined, () => undefined);
  return p;
}

function seedSample(db: any) {
  const now = Date.now();

  const sampleCollectionId = String(db.next.c++);
  db.collections.push({
    id: sampleCollectionId,
    name: "Sample",
    description: "Sample list with jazz standards",
    updatedAt: now,
  });

  const add = (d: any) => {
    const id = String(db.next.i++);
    db.items.push({
      id,
      collectionId: sampleCollectionId,
      title: d.title,
      key: d.key ?? "",
      composer: d.composer ?? "",
      style: d.style ?? "",
      notes: d.notes ?? "",
      leadSheetUrl: d.leadSheetUrl ?? "",
      knowledgeLevel: d.knowledgeLevel ?? "does-not-know",
      youtubeId: d.youtubeId ?? null,
      spotifyUri: d.spotifyUri ?? null,
      appleMusicUrl: d.appleMusicUrl ?? null,
      startSeconds: d.startSeconds ?? null,
      extraTags: Array.isArray(d.extraTags) ? d.extraTags : [],
      updatedAt: now,
    });
  };

  add({
    title: "Misty",
    key: "Eb",
    composer: "Erroll Garner",
    style: "Ballad",
    notes: "Beautiful jazz standard…",
    knowledgeLevel: "knows",
    leadSheetUrl: "misty.jpg",
    youtubeId: "DkC9bCuahC8",
    startSeconds: 0,
    extraTags: [
      { key: "Tempo", value: "Slow" },
      { key: "Form", value: "AABA" },
    ],
  });

  add({
    title: "Autumn Leaves",
    key: "Bb",
    composer: "Joseph Kosma",
    style: "Jazz Standard",
    notes: "Classic ii–V–I practice tune.",
    knowledgeLevel: "kind-of-knows",
    leadSheetUrl: "autumn-leaves.jpg",
    appleMusicUrl: "https://music.apple.com/us/song/autumn-leaves/1440941546",
  });

  add({
    title: "All The Things You Are",
    key: "Ab",
    composer: "Jerome Kern",
    style: "Jazz Standard",
    notes: "Multiple key centers; advanced harmony.",
    knowledgeLevel: "does-not-know",
    leadSheetUrl: "all-the-things-you-are.png",
    spotifyUri: "spotify:track:4IVLhmrJ00V9HOJ2Dd6Kbf",
  });
}

(function initIfNeeded() {
  const existing = localStorage.getItem(LS_KEY);
  if (!existing) {
    const db = emptyDB();
    seedSample(db);
    saveDB(db);
    return;
  }
  try {
    const db = JSON.parse(existing);
    if (!db.collections || db.collections.length === 0) {
      seedSample(db);
      saveDB(db);
    }
  } catch {
    const db = emptyDB();
    seedSample(db);
    saveDB(db);
  }
})();

function getHeader(headers: any, key: string) {
  if (!headers) return "";
  if (headers instanceof Headers) return headers.get(key) || "";
  const h = (headers as any)[key] ?? (headers as any)[key.toLowerCase()];
  return typeof h === "string" ? h : "";
}

async function parseBody(init?: RequestInit) {
  if (!init?.body) return {};
  const ct = getHeader(init.headers, "Content-Type");
  if (typeof init.body === "string" || String(ct).includes("application/json")) {
    try { return JSON.parse(init.body as string); } catch { return {}; }
  }
  if (init.body instanceof FormData) {
    const o: any = {};
    for (const [k, v] of init.body.entries()) o[k] = v;
    return o;
  }
  return {};
}

function json(body: any, status = 200) { return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }); }
function ok204() { return new Response(null, { status: 204 }); }
function notFound() { return new Response("Not found", { status: 404 }); }

const origFetch = window.fetch.bind(window);

function normalizeKnowledge(value: string): string {
  const v = String(value || "").toLowerCase().trim();
  if (v === "green" || v === "knows") return "knows";
  if (v === "orange" || v === "kind-of-knows") return "kind-of-knows";
  if (v === "red" || v === "does-not-know") return "does-not-know";
  return v;
}

function norm(s: string) {
  return String(s || "").toLowerCase().trim();
}

function cleanTitle(input: string): string {
  let t = String(input || "").trim();
  t = t.replace(/^\s*\[.*?\]\s*/, "");
  t = t.replace(/^\s*\d+\s*[\.\)\-:–—]?\s+/, "");
  return t;
}

function getValuesForFilter(it: Item, keyRaw: string): string[] {
  const k = norm(keyRaw);
  if (k === "title") return [norm(it.title)];
  if (k === "key") return [norm(it.key || "")];
  if (k === "composer") return [norm(it.composer || "")];
  if (k === "style") return [norm(it.style || "")];
  if (k === "knowledgelevel" || k === "knowledge level" || k === "color") {
    return [norm(normalizeKnowledge(it.knowledgeLevel || ""))];
  }
  const tags = Array.isArray(it.extraTags) ? it.extraTags : [];
  return tags
    .filter(t => norm(t.key) === k && t.value && String(t.value).trim())
    .map(t => norm(t.value));
}
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  if (!input || (typeof input === "string" && input.trim() === "")) {
    return new Response(JSON.stringify({ error: "Bad request: empty URL" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const url = typeof input === "string" ? input : input.toString();
  const method = (init?.method || "GET").toUpperCase();

  if (!url.startsWith("/api/")) return origFetch(input, init);

  if (url === "/api/upload" || url.startsWith("/api/files") || url.includes("/upload")) {
  if (method === "POST") {
    const body = await parseBody(init);
    const original = (body?.filename || "uploaded").toString();
    const ext = (original.match(/\.[a-zA-Z0-9]+$/)?.[0] || ".png").toLowerCase();
    const base = original.replace(/\.[^/.]+$/, "");
    const slug = base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const unique = `${slug || "file"}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    const filePath = `/assets/lead-sheets/${unique}`;
    return json({ url: filePath, objectPath: filePath }, 201);
  }
  return json({ ok: true });
}

  if (url === "/api/collections") {
  if (method === "GET") {
    const db = loadDB();
    const withCount = db.collections.map((c: Collection) => ({
      ...c,
      count: db.items.filter((it: Item) => it.collectionId === c.id).length,
    }));
    return json(withCount);
  }
  if (method === "POST") {
    const body = await parseBody(init);
    return withWriteLock(() => {
      const db = loadDB();
      const id = String(db.next.c++);
      const now = Date.now();
      const col: Collection = { id, name: (body.name || "Untitled").toString(), description: (body.description || "").toString(), updatedAt: now };
      db.collections.push(col);
      persist(db, "create collection");
      return json(col, 201);
    });
  }
}

{
  const m = url.match(/^\/api\/collections\/([^\/\?]+)$/);
  if (m) {
    const cid = m[1];

    if (method === "GET") {
      const db = loadDB();
      const col = db.collections.find((c: Collection) => c.id === cid);
      return col ? json(col) : notFound();
    }

    if (method === "PATCH" || method === "PUT") {
      const body = await parseBody(init);
      return withWriteLock(() => {
        const db = loadDB();
        const col = db.collections.find((c: Collection) => c.id === cid);
        if (!col) return notFound();
        Object.assign(col, body);
        col.updatedAt = Date.now();
        persist(db, "update collection");
        return json(col);
      });
    }

    if (method === "DELETE") {
      return withWriteLock(() => {
        const db = loadDB();
        const idx = db.collections.findIndex((c: Collection) => c.id === cid);
        if (idx === -1) return notFound();
        db.collections.splice(idx, 1);
        db.items = db.items.filter((i: Item) => i.collectionId !== cid);
        persist(db, "delete collection");
        return ok204();
      });
    }
  }
}

{
  const m = url.match(/^\/api\/collections\/([^\/\?]+)\/items(?:\?(.*))?$/);
  if (m) {
    const cid = m[1];

    if (method === "GET") {
      const db = loadDB();
      const params = new URL(url, "https://local").searchParams;
      const search = (params.get("search") || "").toLowerCase();
      const filtersRaw = params.get("filters");

      let list: Item[] = db.items.filter((i: Item) => i.collectionId === cid);

      if (filtersRaw) {
        try {
          const f: Record<string, string | string[]> = JSON.parse(filtersRaw);
          list = list.filter((it) => {
            return Object.entries(f).every(([k, v]) => {
              const want = (Array.isArray(v) ? v : [v]).map(x => norm(normalizeKnowledge(String(x))));
              const have = getValuesForFilter(it, k);
              if (want.length === 0) return true;
              return have.some(h => want.includes(h));
            });
          });
        } catch {}
      }

      if (search) {
        list = list.filter((it) =>
          (it.title || "").toLowerCase().includes(search) ||
          (it.key || "").toLowerCase().includes(search) ||
          (it.composer || "").toLowerCase().includes(search) ||
          (it.style || "").toLowerCase().includes(search)
        );
      }

      return json(list);
    }

    if (method === "POST") {
      const body = await parseBody(init);
      return withWriteLock(() => {
        const db = loadDB();
        const id = String(db.next.i++);
        const now = Date.now();
        const item: Item = {
          id,
          collectionId: cid,
          title: (body.title || "Untitled").toString(),
          key: body.key ?? body.keySig ?? "",
          composer: body.composer ?? "",
          style: body.style ?? "",
          notes: body.notes ?? "",
          leadSheetUrl: body.leadSheetUrl ?? "",
          knowledgeLevel: normalizeKnowledge(body.knowledgeLevel ?? "does-not-know"),
          youtubeId: body.youtubeId ?? null,
          spotifyUri: body.spotifyUri ?? null,
          appleMusicUrl: body.appleMusicUrl ?? null,
          startSeconds: body.startSeconds ?? null,
          extraTags: Array.isArray(body.extraTags) ? body.extraTags.filter((t: any) => t && t.key && t.value).map((t: any) => ({ key: String(t.key), value: String(t.value) })) : [],
          updatedAt: now,
        };
        db.items.push(item);
        const col = db.collections.find((c: Collection) => c.id === cid);
        if (col) col.updatedAt = now;
        persist(db, "create item in collection");
        return json(item, 201);
      });
    }
  }
}
if (url === "/api/items" && method === "POST") {
  const body = await parseBody(init);
  const cid = body.collectionId?.toString?.() || "";
  if (!cid) return new Response(JSON.stringify({ error: "collectionId required" }), { status: 400, headers: { "Content-Type": "application/json" } });
  return withWriteLock(() => {
    const db = loadDB();
    const id = String(db.next.i++);
    const now = Date.now();
    const item: Item = {
      id,
      collectionId: cid,
      title: (body.title || "Untitled").toString(),
      key: body.key ?? "",
      composer: body.composer ?? "",
      style: body.style ?? "",
      notes: body.notes ?? "",
      leadSheetUrl: body.leadSheetUrl ?? "",
      knowledgeLevel: normalizeKnowledge(body.knowledgeLevel ?? "does-not-know"),
      youtubeId: body.youtubeId ?? null,
      spotifyUri: body.spotifyUri ?? null,
      appleMusicUrl: body.appleMusicUrl ?? null,
      startSeconds: body.startSeconds ?? null,
      extraTags: Array.isArray(body.extraTags) ? body.extraTags.filter((t: any) => t && t.key && t.value).map((t: any) => ({ key: String(t.key), value: String(t.value) })) : [],
      updatedAt: now,
    };
    db.items.push(item);
    const col = db.collections.find((c: Collection) => c.id === cid);
    if (col) col.updatedAt = now;
    persist(db, "create item (generic)");
    return json(item, 201);
  });
}

{
  const m = url.match(/^\/api\/items\/([^\/\?]+)$/);
  if (m) {
    const iid = m[1];

    if (method === "PATCH" || method === "PUT") {
      const body = await parseBody(init);
      return withWriteLock(() => {
        const db = loadDB();
        const it = db.items.find((x: Item) => x.id === iid);
        if (!it) return notFound();
        if ((body as any).knowledgeLevel !== undefined) {
          (body as any).knowledgeLevel = normalizeKnowledge((body as any).knowledgeLevel);
        }
        Object.assign(it, body);
        if (Array.isArray((body as any).extraTags)) {
          it.extraTags = (body as any).extraTags.filter((t: any) => t && t.key && t.value).map((t: any) => ({ key: String(t.key), value: String(t.value) }));
        }
        it.updatedAt = Date.now();
        persist(db, "update item");
        return json(it);
      });
    }

    if (method === "DELETE") {
      return withWriteLock(() => {
        const db = loadDB();
        const idx = db.items.findIndex((x: Item) => x.id === iid);
        if (idx === -1) return notFound();
        db.items.splice(idx, 1);
        persist(db, "delete item");
        return ok204();
      });
    }
  }
}

{
  const m = url.match(/^\/api\/collections\/([^\/\?]+)\/import$/);
  if (m && method === "POST") {
    const cid = m[1];
    const body = await parseBody(init);
    return withWriteLock(() => {
      const db = loadDB();
      const ids: string[] = Array.isArray(body.itemIds) ? body.itemIds.map(String) : [];
      const now = Date.now();
      let count = 0;
      const existing = new Set(db.items.filter((i: Item) => i.collectionId === cid).map((i: Item) => (i.title || "").toLowerCase()));
      for (const iid of ids) {
        const src = db.items.find((x: Item) => x.id === iid);
        if (!src) continue;
        if (existing.has((src.title || "").toLowerCase())) continue;
        const newItem: Item = {
          ...src,
          id: String(db.next.i++),
          collectionId: cid,
          updatedAt: now,
        };
        db.items.push(newItem);
        existing.add((newItem.title || "").toLowerCase());
        count++;
      }
      const col = db.collections.find((c: Collection) => c.id === cid);
      if (col) col.updatedAt = now;
      persist(db, "import items");
      return json({ count }, 201);
    });
  }
}

if (url === "/api/bulk/items" && method === "POST") {
  const body = await parseBody(init);
  const cid = (body.collectionId || "").toString();
  const titles = Array.isArray(body.titles) ? body.titles.map((t: any) => String(t)) : [];
  return withWriteLock(() => {
    const db = loadDB();
    if (!cid) return json({ error: "collectionId required" }, 400);
    const now = Date.now();
    const existing = new Set(db.items.filter((i: Item) => i.collectionId === cid).map((i: Item) => (i.title || "").toLowerCase()));
    let created = 0;
    let skipped = 0;
    const added: Item[] = [];
    const limit = Math.min(1000, titles.length);
    for (let i = 0; i < limit; i++) {
      let t = cleanTitle(titles[i]);
      if (!t) { skipped++; continue; }
      const key = t.toLowerCase();
      if (existing.has(key)) { skipped++; continue; }
      const it: Item = {
        id: String(db.next.i++),
        collectionId: cid,
        title: t,
        key: "",
        composer: "",
        style: "",
        notes: "",
        leadSheetUrl: "",
        knowledgeLevel: "does-not-know",
        youtubeId: null,
        spotifyUri: null,
        appleMusicUrl: null,
        startSeconds: null,
        extraTags: [],
        updatedAt: now,
      };
      db.items.push(it);
      added.push(it);
      existing.add(key);
      created++;
    }
    const col = db.collections.find((c: Collection) => c.id === cid);
    if (col) col.updatedAt = now;
    persist(db, "bulk items");
    return json({ created, skipped, items: added }, 201);
  });
}

  const m = url.match(/^\/api\/collections\/([^\/\?]+)\/tags$/);
if (m && method === "GET") {
  const cid = m[1];
  const db = loadDB();
  const items = db.items.filter((i: Item) => i.collectionId === cid);
  const tags: Record<string, Record<string, number>> = {};

  function add(key: string, val?: string) {
    if (!val) return;
    const k = key.trim();
    const v = val.trim();
    if (!k || !v) return;
    if (!tags[k]) tags[k] = {};
    tags[k][v] = (tags[k][v] || 0) + 1;
  }

  for (const it of items) {
    add("Key", it.key);
    add("Composer", it.composer);
    add("Style", it.style);
    add("Knowledge Level", normalizeKnowledge(it.knowledgeLevel || ""));
    if (Array.isArray(it.extraTags)) {
      for (const t of it.extraTags) add(t.key, t.value);
    }
  }

  const result: Record<string, { value: string; count: number }[]> = {};
  for (const k of Object.keys(tags)) {
    const arr = Object.entries(tags[k])
      .filter(([v, count]) => v && count > 0)
      .map(([v, count]) => ({ value: v, count }))
      .sort((a, b) => a.value.localeCompare(b.value));
    if (arr.length > 0) result[k] = arr;
  }

  return json(result);
}

  const mField = url.match(/^\/api\/field-values\/([^\/\?]+)$/);
if (mField && method === "GET") {
  const field = decodeURIComponent(mField[1]).toLowerCase();
  const params = new URL(url, "https://local").searchParams;
  const cid = params.get("collectionId") || "";
  const db = loadDB();
  const items = cid ? db.items.filter((i: Item) => i.collectionId === cid) : db.items.slice();

  const counts: Record<string, number> = {};

  if (field === "key" || field === "composer" || field === "style" || field === "title") {
    for (const it of items) {
      const v = (it as any)[field];
      if (v && String(v).trim()) {
        const val = String(v).trim();
        counts[val] = (counts[val] || 0) + 1;
      }
    }
    const sortedKeys = Object.keys(counts).sort((a, b) => a.localeCompare(b));
    const result = sortedKeys.map(k => ({ value: k, count: counts[k] }));
    return json(result);

  } else if (field === "knowledgelevel" || field === "knowledge level" || field === "color") {
    const valuesSet = new Set<string>();
    for (const it of items) {
      const v = normalizeKnowledge(it.knowledgeLevel || "");
      if (v) valuesSet.add(v);
    }
    const result = Array.from(valuesSet).sort().map(v => ({ value: v }));
    return json(result);

  } else {
    for (const it of items) {
      const tags = Array.isArray(it.extraTags) ? it.extraTags : [];
      for (const t of tags) {
        if (norm(t.key) === field && t.value && t.value.trim()) {
          const val = t.value.trim();
          counts[val] = (counts[val] || 0) + 1;
        }
      }
    }
    const sortedKeys = Object.keys(counts).sort((a, b) => a.localeCompare(b));
    const result = sortedKeys.map(k => ({ value: k, count: counts[k] }));
    return json(result);
  }
}

if (url === "/api/tags/keys" && method === "GET") {
  const db = loadDB();

  const excluded = new Set([
    "title",
    "key",
    "composer",
    "style",
    "knowledge level",
    "knowledgelevel",
    "color",
  ]);

  const keys = new Set<string>();

  for (const item of db.items) {
    const tags = Array.isArray(item.extraTags) ? item.extraTags : [];

    for (const tag of tags) {
      const key = String(tag.key || "").trim();
      if (!key) continue;

      if (!excluded.has(key.toLowerCase())) {
        keys.add(key);
      }
    }
  }

  return json(Array.from(keys).sort((a, b) => a.localeCompare(b)));
}

const mTagValues = url.match(/^\/api\/tags\/values\/([^\/\?]+)$/);
if (mTagValues && method === "GET") {
  const tagKey = decodeURIComponent(mTagValues[1]);
  const db = loadDB();
  const values = new Set<string>();

  for (const item of db.items) {
    const tags = Array.isArray(item.extraTags) ? item.extraTags : [];

    for (const tag of tags) {
      if (
        String(tag.key || "").trim().toLowerCase() === tagKey.trim().toLowerCase() &&
        String(tag.value || "").trim()
      ) {
        values.add(String(tag.value).trim());
      }
    }
  }

  return json(Array.from(values).sort((a, b) => a.localeCompare(b)));
}

if (method === "GET") return json([]);
if (method === "POST") return json({ ok: true }, 201);
return ok204();
};
