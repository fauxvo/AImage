import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const imageSets = sqliteTable("image_sets", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  prompt: text("prompt").notNull().default(""),
  refinedPrompt: text("refined_prompt"),
  size: text("size").notNull().default("1024x1024"),
  quality: text("quality").notNull().default("auto"),
  style: text("style"),
  numImages: integer("num_images").notNull().default(1),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const generatedImages = sqliteTable(
  "generated_images",
  {
    id: text("id").primaryKey(),
    imageSetId: text("image_set_id")
      .notNull()
      .references(() => imageSets.id, { onDelete: "cascade" }),
    filePath: text("file_path").notNull(),
    fileName: text("file_name").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("generated_images_image_set_id_idx").on(table.imageSetId)]
);

export const referenceImages = sqliteTable(
  "reference_images",
  {
    id: text("id").primaryKey(),
    imageSetId: text("image_set_id")
      .notNull()
      .references(() => imageSets.id, { onDelete: "cascade" }),
    filePath: text("file_path").notNull(),
    fileName: text("file_name").notNull(),
    originalName: text("original_name").notNull(),
    fileSize: integer("file_size").notNull(),
    mimeType: text("mime_type").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("reference_images_image_set_id_idx").on(table.imageSetId)]
);
