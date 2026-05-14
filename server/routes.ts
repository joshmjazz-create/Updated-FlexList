import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCollectionSchema, insertItemSchema } from "@shared/schema";
import { z } from "zod";
import {
  ObjectStorageService,
  ObjectNotFoundError,
} from "./objectStorage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Collections routes
  app.get("/api/collections", async (req, res) => {
    try {
      const collections = await storage.getCollections();
      res.json(collections);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch collections" });
    }
  });

  app.get("/api/collections/:id", async (req, res) => {
    try {
      const collection = await storage.getCollection(req.params.id);
      if (!collection) {
        return res.status(404).json({ message: "Collection not found" });
      }
      res.json(collection);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch collection" });
    }
  });

  app.post("/api/collections", async (req, res) => {
    try {
      const validatedData = insertCollectionSchema.parse(req.body);
      const collection = await storage.createCollection(validatedData);
      res.status(201).json(collection);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid collection data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create collection" });
    }
  });

  app.put("/api/collections/:id", async (req, res) => {
    try {
      const validatedData = insertCollectionSchema.partial().parse(req.body);
      const collection = await storage.updateCollection(req.params.id, validatedData);
      if (!collection) {
        return res.status(404).json({ message: "Collection not found" });
      }
      res.json(collection);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid collection data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update collection" });
    }
  });

  app.delete("/api/collections/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteCollection(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Collection not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete collection" });
    }
  });

  // Items routes
  app.get("/api/collections/:collectionId/items", async (req, res) => {
    try {
      const { filters, search } = req.query;
      let items;
      
      if (filters || search) {
        const filterObj = filters ? JSON.parse(filters as string) : {};
        items = await storage.filterItems(req.params.collectionId, filterObj, search as string);
      } else {
        items = await storage.getItems(req.params.collectionId);
      }
      
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch items" });
    }
  });

  app.get("/api/items/:id", async (req, res) => {
    try {
      const item = await storage.getItem(req.params.id);
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      res.json(item);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch item" });
    }
  });

  app.post("/api/items", async (req, res) => {
    try {
      const validatedData = insertItemSchema.parse(req.body);
      const item = await storage.createItem(validatedData);
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid item data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create item" });
    }
  });

  app.put("/api/items/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertItemSchema.partial().parse(req.body);
      const item = await storage.updateItem(id, validatedData);
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      res.json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid item data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update item" });
    }
  });

  app.delete("/api/items/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteItem(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Item not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete item" });
    }
  });

  // Available tags route
  app.get("/api/collections/:collectionId/tags", async (req, res) => {
    try {
      const tags = await storage.getAvailableTags(req.params.collectionId);
      res.json(tags);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tags" });
    }
  });

  // Tag cataloging endpoints
  app.get("/api/tags/keys", async (req, res) => {
    try {
      const keys = await storage.getTagKeys();
      res.json(keys);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tag keys" });
    }
  });

  app.get("/api/tags/values/:key", async (req, res) => {
    try {
      const values = await storage.getTagValues(req.params.key);
      res.json(values);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tag values" });
    }
  });

  // Field values autocomplete endpoints
  app.get("/api/field-values/:field", async (req, res) => {
    try {
      const { field } = req.params;
      if (!['key', 'composer', 'style'].includes(field)) {
        return res.status(400).json({ message: "Invalid field" });
      }
      const values = await storage.getFieldValues(field as 'key' | 'composer' | 'style');
      res.json(values);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch field values" });
    }
  });

  // Import items from another collection
  app.post("/api/collections/:id/import", async (req, res) => {
    try {
      const { id: targetCollectionId } = req.params;
      const { itemIds } = req.body;
      
      if (!Array.isArray(itemIds) || itemIds.length === 0) {
        return res.status(400).json({ message: "itemIds must be a non-empty array" });
      }
      
      const result = await storage.importItems(targetCollectionId, itemIds);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to import items" });
    }
  });

  // Static assets for lead sheets
  app.get("/src/assets/lead-sheets/:filename", (req, res) => {
    const { filename } = req.params;
    const filePath = `client/src/assets/lead-sheets/${filename}`;
    res.sendFile(filePath, { root: process.cwd() });
  });

  // Object storage endpoints for file uploads
  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.post("/api/objects/upload", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  app.put("/api/lead-sheets", async (req, res) => {
    if (!req.body.leadSheetURL) {
      return res.status(400).json({ error: "leadSheetURL is required" });
    }

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = objectStorageService.normalizeObjectEntityPath(
        req.body.leadSheetURL,
      );

      res.status(200).json({
        objectPath: objectPath,
      });
    } catch (error) {
      console.error("Error setting lead sheet:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
