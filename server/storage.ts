import { type Collection, type InsertCollection, type Item, type InsertItem, type CollectionWithCount, type Tag } from "@shared/schema";
import { collections, items, tags, itemTags } from "@shared/schema";
import { db } from "./db";
import { eq, sql, and, isNotNull } from "drizzle-orm";
import { buildTagsFromItem } from "./utils/tags";
import { norm } from "../client/src/utils/norm";
import { resolveLeadSheet } from "../client/src/utils/leadSheets";

export interface IStorage {
  getCollections(): Promise<CollectionWithCount[]>;
  getCollection(id: string): Promise<Collection | undefined>;
  createCollection(collection: InsertCollection): Promise<Collection>;
  updateCollection(id: string, collection: Partial<InsertCollection>): Promise<Collection | undefined>;
  deleteCollection(id: string): Promise<boolean>;

  getItems(collectionId: string): Promise<Item[]>;
  getItem(id: string): Promise<Item | undefined>;
  createItem(item: InsertItem): Promise<Item>;
  updateItem(id: string, item: Partial<InsertItem>): Promise<Item | undefined>;
  deleteItem(id: string): Promise<boolean>;

  filterItems(collectionId: string, filters: Record<string, string>, searchQuery?: string): Promise<Item[]>;
  getAvailableTags(collectionId: string): Promise<Record<string, { value: string, count: number }[]>>;
  getTagCounts(collectionId: string): Promise<Record<string, Record<string, number>>>;

  getTagKeys(): Promise<string[]>;
  getTagValues(key: string): Promise<string[]>;
  getFieldValues(field: 'key' | 'composer' | 'style'): Promise<string[]>;
  upsertTag(key: string, value: string): Promise<Tag>;

  importItems(targetCollectionId: string, itemIds: string[]): Promise<{ count: number }>;
}

export class DatabaseStorage implements IStorage {
  constructor() {
    this.seedData();
  }

  private async seedData() {
    try {
      await db.delete(itemTags);
      await db.delete(tags);
      await db.delete(items);
      await db.delete(collections);
    } catch {}

    const [collection] = await db.insert(collections).values({
      name: "Sample",
      description: "Sample list with jazz standards",
    }).returning();

    const sampleItems = [
      {
        title: "Misty",
        key: "Eb",
        composer: "Erroll Garner",
        style: "Ballad",
        notes: "Beautiful jazz standard, great for practicing chord voicings. Known for its rich harmony and flowing melody.",
        knowledgeLevel: "knows" as const,
        leadSheetFileName: "misty.jpg",
        leadSheetUrl: await resolveLeadSheet("misty.jpg") || null,
        youtubeId: "DkC9bCuahC8",
        startSeconds: 0,
        extraTags: [
          { key: "Tempo", value: "Slow" },
          { key: "Difficulty", value: "Intermediate" },
          { key: "Era", value: "1940s" },
          { key: "Form", value: "AABA" },
          { key: "Time Signature", value: "4/4" }
        ]
      },
      {
        title: "Autumn Leaves",
        key: "Bb",
        composer: "Joseph Kosma",
        style: "Jazz Standard",
        notes: "Perfect for beginners learning jazz progressions. Features the classic ii-V-I progression throughout.",
        knowledgeLevel: "kind-of-knows" as const,
        leadSheetFileName: "autumn-leaves.jpg",
        leadSheetUrl: await resolveLeadSheet("autumn-leaves.jpg") || null,
        youtubeId: "r-Z8KuwI7Gc",
        startSeconds: 0,
        extraTags: [
          { key: "Difficulty", value: "Beginner" },
          { key: "Era", value: "1940s" },
          { key: "Form", value: "AABA" },
          { key: "Tempo", value: "Medium" },
          { key: "Time Signature", value: "4/4" }
        ]
      },
      {
        title: "All The Things You Are",
        key: "Ab",
        composer: "Jerome Kern",
        style: "Jazz Standard",
        notes: "Sophisticated harmonic movement through multiple key centers. A masterpiece of songwriting with challenging chord changes.",
        knowledgeLevel: "does-not-know" as const,
        leadSheetFileName: "all-the-things-you-are.png",
        leadSheetUrl: await resolveLeadSheet("all-the-things-you-are.png") || null,
        spotifyUri: "spotify:track:4IVLhmrJ00V9HOJ2Dd6Kbf",
        extraTags: [
          { key: "Difficulty", value: "Advanced" },
          { key: "Era", value: "1930s" },
          { key: "Form", value: "AABA" },
          { key: "Tempo", value: "Medium" },
          { key: "Time Signature", value: "4/4" },
          { key: "Key Centers", value: "Multiple" }
        ]
      }
    ];

    for (const itemData of sampleItems) {
      const { extraTags, ...itemFields } = itemData as any;

      const [item] = await db.insert(items).values(itemFields).returning();
      const allTags = buildTagsFromItem({ ...itemFields, extraTags });
      if (allTags.length > 0) {
        const tagIds = await this.upsertTagsBatch(allTags);
        const tagRelationships = tagIds.map(tagId => ({ itemId: item.id, tagId }));
        await db.insert(itemTags).values(tagRelationships).onConflictDoNothing();
      }
    }
  }

  async getCollections(): Promise<CollectionWithCount[]> {
    const result = await db
      .select({
        id: collections.id,
        name: collections.name,
        description: collections.description,
        itemCount: sql<number>`count(${items.id})::int`,
      })
      .from(collections)
      .leftJoin(items, eq(collections.id, items.collectionId))
      .groupBy(collections.id);

    return result;
  }

  async getCollection(id: string): Promise<Collection | undefined> {
    const [collection] = await db.select().from(collections).where(eq(collections.id, id));
    return collection || undefined;
  }

  async createCollection(insertCollection: InsertCollection): Promise<Collection> {
    const [collection] = await db
      .insert(collections)
      .values(insertCollection)
      .returning();
    return collection;
  }

  async updateCollection(id: string, updateData: Partial<InsertCollection>): Promise<Collection | undefined> {
    const [updated] = await db
      .update(collections)
      .set(updateData)
      .where(eq(collections.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteCollection(id: string): Promise<boolean> {
    await db.delete(itemTags).where(
      sql`item_id IN (SELECT id FROM items WHERE collection_id = ${id})`
    );
    await db.delete(items).where(eq(items.collectionId, id));
    const result = await db.delete(collections).where(eq(collections.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  private itemsCache = new Map<string, { data: Item[], timestamp: number }>();
  private cacheExpiryMs = 30000;

  async getItems(collectionId: string): Promise<Item[]> {
    const cacheKey = `items_${collectionId}`;
    const cached = this.itemsCache.get(cacheKey);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < this.cacheExpiryMs) {
      return cached.data;
    }

    const result = await db.select().from(items).where(eq(items.collectionId, collectionId));
    this.itemsCache.set(cacheKey, { data: result, timestamp: now });
    return result;
  }

  private clearItemsCache(collectionId?: string): void {
    if (collectionId) {
      this.itemsCache.delete(`items_${collectionId}`);
    } else {
      this.itemsCache.clear();
    }
  }

  async getItem(id: string): Promise<Item | undefined> {
    const [item] = await db.select().from(items).where(eq(items.id, id));
    return item || undefined;
  }

  async createItem(itemData: InsertItem): Promise<Item> {
    const { extraTags, ...itemFields } = itemData as any;

    const [item] = await db.insert(items).values(itemFields).returning();
    const allTags = buildTagsFromItem({ ...itemFields, extraTags });

    if (allTags.length > 0) {
      const tagIds = await this.upsertTagsBatch(allTags);
      const tagRelationships = tagIds.map(tagId => ({ itemId: item.id, tagId }));
      await db.insert(itemTags).values(tagRelationships).onConflictDoNothing();
    }

    this.clearFieldValuesCache();
    this.clearItemsCache(item.collectionId);
    return item;
  }

  async updateItem(id: string, updateData: Partial<InsertItem>): Promise<Item | undefined> {
    const { extraTags, ...itemFields } = updateData as any;

    const [updated] = await db
      .update(items)
      .set({ ...itemFields, updatedAt: new Date() })
      .where(eq(items.id, id))
      .returning();

    if (updated) {
      await db.delete(itemTags).where(eq(itemTags.itemId, id));

      const itemForTags = { ...updated, ...itemFields, extraTags };
      const allTags = buildTagsFromItem(itemForTags);

      if (allTags.length > 0) {
        const tagIds = await this.upsertTagsBatch(allTags);
        const tagRelationships = tagIds.map(tagId => ({ itemId: id, tagId }));
        await db.insert(itemTags).values(tagRelationships).onConflictDoNothing();
      }

      this.clearFieldValuesCache();
      this.clearItemsCache(updated.collectionId);
    }

    return updated || undefined;
  }

  async deleteItem(id: string): Promise<boolean> {
    const item = await this.getItem(id);
    await db.delete(itemTags).where(eq(itemTags.itemId, id));
    const result = await db.delete(items).where(eq(items.id, id));
    const success = (result.rowCount ?? 0) > 0;

    if (success && item) {
      this.clearFieldValuesCache();
      this.clearItemsCache(item.collectionId);
    }

    return success;
  }

  async filterItems(collectionId: string, filters: Record<string, string | string[]>, searchQuery?: string): Promise<Item[]> {
    const baseConditions = [eq(items.collectionId, collectionId)];

    if (searchQuery && searchQuery.trim()) {
      const searchTerm = `%${searchQuery.toLowerCase()}%`;
      baseConditions.push(
        sql`(
          LOWER(${items.title}) LIKE ${searchTerm} OR
          LOWER(${items.key}) LIKE ${searchTerm} OR
          LOWER(${items.composer}) LIKE ${searchTerm} OR
          LOWER(${items.style}) LIKE ${searchTerm} OR
          LOWER(${items.notes}) LIKE ${searchTerm}
        )`
      );
    }

    const { "Color": knowledgeLevels, "Knowledge Level": legacyKnowledgeLevels, ...tagFilters } = filters;
    const actualKnowledgeLevels = knowledgeLevels || legacyKnowledgeLevels;

    if (actualKnowledgeLevels) {
      const levelValues = Array.isArray(actualKnowledgeLevels) ? actualKnowledgeLevels : [actualKnowledgeLevels];
      baseConditions.push(
        sql`${items.knowledgeLevel} IN (${sql.join(levelValues.map(level => sql`${level}`), sql`, `)})`
      );
    }

    if (Object.keys(tagFilters).length > 0) {
      const filterPairs: string[] = [];
      for (const [key, value] of Object.entries(tagFilters)) {
        const normalizedKey = norm(key);
        const filterValues = Array.isArray(value) ? value : [value];
        filterValues.forEach(val => {
          const normalizedValue = norm(val);
          if (normalizedValue) filterPairs.push(`${normalizedKey}:${normalizedValue}`);
        });
      }

      if (filterPairs.length > 0) {
        return await db
          .select({
            id: items.id,
            collectionId: items.collectionId,
            title: items.title,
            key: items.key,
            composer: items.composer,
            style: items.style,
            notes: items.notes,
            leadSheetUrl: items.leadSheetUrl,
            youtubeId: items.youtubeId,
            spotifyUri: items.spotifyUri,
            startSeconds: items.startSeconds,
            knowledgeLevel: items.knowledgeLevel,
            createdAt: items.createdAt,
            updatedAt: items.updatedAt,
          })
          .from(items)
          .innerJoin(itemTags, eq(itemTags.itemId, items.id))
          .innerJoin(tags, eq(tags.id, itemTags.tagId))
          .where(
            and(
              ...baseConditions,
              sql`LOWER(TRIM(${tags.key}) || ':' || TRIM(${tags.value})) IN (${sql.join(filterPairs.map(pair => sql`${pair}`), sql`, `)})`
            )
          )
          .groupBy(items.id)
          .having(sql`COUNT(DISTINCT LOWER(TRIM(${tags.key}) || ':' || TRIM(${tags.value}))) = ${filterPairs.length}`);
      }
    }

    return await db.select().from(items).where(and(...baseConditions));
  }

  async getAvailableTags(collectionId: string): Promise<Record<string, { value: string, count: number }[]>> {
    const rows = await db
      .select({
        key: tags.key,
        value: tags.value,
        count: sql<number>`COUNT(${items.id})::int`,
      })
      .from(tags)
      .innerJoin(itemTags, eq(itemTags.tagId, tags.id))
      .innerJoin(items, eq(items.id, itemTags.itemId))
      .where(eq(items.collectionId, collectionId))
      .groupBy(tags.key, tags.value);

    const tagMap: Record<string, { value: string, count: number }[]> = {};
    rows.forEach(({ key, value, count }) => {
      if (!tagMap[key]) tagMap[key] = [];
      tagMap[key].push({ value, count });
    });

    Object.keys(tagMap).forEach(key => {
      tagMap[key].sort((a, b) => a.value.localeCompare(b.value));
    });

    return tagMap;
  }

  async getTagCounts(collectionId: string): Promise<Record<string, Record<string, number>>> {
    const rows = await db
      .select({
        key: tags.key,
        value: tags.value,
        count: sql<number>`COUNT(${items.id})::int`,
      })
      .from(tags)
      .innerJoin(itemTags, eq(itemTags.tagId, tags.id))
      .innerJoin(items, eq(items.id, itemTags.itemId))
      .where(eq(items.collectionId, collectionId))
      .groupBy(tags.key, tags.value);

    const counts: Record<string, Record<string, number>> = {};
    rows.forEach(({ key, value, count }) => {
      if (!counts[key]) counts[key] = {};
      counts[key][value] = count;
    });

    return counts;
  }

  async getTagKeys(): Promise<string[]> {
    const result = await db.select({ key: tags.key }).from(tags).groupBy(tags.key);
    return result.map(r => r.key).sort();
  }

  async getTagValues(key: string): Promise<string[]> {
    const result = await db.select({ value: tags.value }).from(tags).where(eq(tags.key, key));
    return result.map(r => r.value).sort();
  }

  private fieldValuesCache = new Map<string, { data: string[], timestamp: number }>();

  async getFieldValues(field: 'key' | 'composer' | 'style'): Promise<string[]> {
    const cacheKey = `field_values_${field}`;
    const cached = this.fieldValuesCache.get(cacheKey);
    const now = Date.now();
    if (cached && (now - cached.timestamp) < this.cacheExpiryMs) return cached.data;

    const column = field === 'key' ? items.key : field === 'composer' ? items.composer : items.style;
    const result = await db.selectDistinct({ value: column }).from(items).where(isNotNull(column));

    const data = result
      .map(r => r.value)
      .filter((v): v is string => v !== null && v.trim() !== '')
      .sort();

    this.fieldValuesCache.set(cacheKey, { data, timestamp: now });
    return data;
  }

  private clearFieldValuesCache(): void {
    this.fieldValuesCache.clear();
  }

  async upsertTag(key: string, value: string): Promise<Tag> {
    const [existingTag] = await db.select().from(tags).where(and(eq(tags.key, key), eq(tags.value, value)));
    if (existingTag) return existingTag;
    const [newTag] = await db.insert(tags).values({ key, value }).returning();
    return newTag;
  }

  async upsertTagsBatch(tagPairs: { key: string; value: string }[]): Promise<string[]> {
    if (!tagPairs.length) return [];
    const existingTags = await db.select().from(tags)
      .where(sql`(${tags.key}, ${tags.value}) IN (${sql.join(tagPairs.map(p => sql`(${p.key}, ${p.value})`), sql`, `)})`);
    const existingMap = new Map<string, string>();
    existingTags.forEach(tag => existingMap.set(`${tag.key}:${tag.value}`, tag.id));
    const newTags = tagPairs.filter(p => !existingMap.has(`${p.key}:${p.value}`));
    const createdTags: Tag[] = newTags.length > 0 ? await db.insert(tags).values(newTags).returning() : [];
    return tagPairs.map(p => existingMap.get(`${p.key}:${p.value}`) || createdTags.find(t => t.key === p.key && t.value === p.value)!.id);
  }

  async importItems(targetCollectionId: string, itemIds: string[]): Promise<{ count: number }> {
    let importedCount = 0;
    for (const itemId of itemIds) {
      const sourceItem = await this.getItem(itemId);
      if (!sourceItem) continue;

      const { id, ...itemData } = sourceItem;
      const newItem = await this.createItem({ ...itemData, collectionId: targetCollectionId });

      const sourceTags = await db.select({ key: tags.key, value: tags.value })
        .from(itemTags)
        .innerJoin(tags, eq(tags.id, itemTags.tagId))
        .where(eq(itemTags.itemId, itemId));

      for (const tag of sourceTags) {
        const tagRecord = await this.upsertTag(tag.key, tag.value);
        await db.insert(itemTags).values({ itemId: newItem.id, tagId: tagRecord.id }).onConflictDoNothing();
      }
      importedCount++;
    }
    return { count: importedCount };
  }
}

export const storage = new DatabaseStorage();
