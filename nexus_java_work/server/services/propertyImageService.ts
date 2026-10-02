import { execute, queryAll, queryOne } from '../db/database.js';
import { BATCH_1_IMAGES, PropertyCatalogImage } from './propertyImageCatalog.js';
import { BATCH_2_IMAGES } from './propertyImageCatalog2.js';
import { BATCH_3_IMAGES } from './propertyImageCatalog3.js';
import { BATCH_4_IMAGES } from './propertyImageCatalog4.js';

export const ALL_CATALOG_IMAGES: PropertyCatalogImage[] = [
  ...BATCH_1_IMAGES,
  ...BATCH_2_IMAGES,
  ...BATCH_3_IMAGES,
  ...BATCH_4_IMAGES,
];

export function getCatalogImagesForProperty(propertyId: string): PropertyCatalogImage[] {
  return ALL_CATALOG_IMAGES.filter(img => img.propertyId === propertyId);
}

/**
 * Seeds or upgrades all 24 properties in the database with their full
 * realistic, authentic 10-12 image catalog sets.
 */
export async function seedAllRealisticPropertyImages(forceRefresh: boolean = false): Promise<{ seededCount: number; propertyCount: number }> {
  const properties = await queryAll<{ id: string }>('SELECT id FROM properties');
  let totalSeeded = 0;
  const now = Date.now();

  for (const prop of properties) {
    const catalogImages = getCatalogImagesForProperty(prop.id);
    if (catalogImages.length === 0) continue;

    // Check existing image count in DB
    const currentRows = await queryAll<{ id: string; url: string }>(
      'SELECT id, url FROM property_images WHERE property_id = ?',
      [prop.id]
    );

    const needsRefresh = forceRefresh || currentRows.length < 10 || currentRows.some(r => !r.url.includes(`nexus_prop=${prop.id}`));

    if (needsRefresh) {
      // Clear out outdated image set
      await execute('DELETE FROM property_images WHERE property_id = ?', [prop.id]);

      // Insert full 10-12 photo collection with unique property-specific URL tokens
      for (const img of catalogImages) {
        const uniqueUrl = img.url.includes('?')
          ? `${img.url}&nexus_prop=${prop.id}&view=${img.category.toLowerCase()}&shot=${img.id}`
          : `${img.url}?nexus_prop=${prop.id}&view=${img.category.toLowerCase()}&shot=${img.id}`;

        await execute(
          `INSERT INTO property_images (id, property_id, url, is_primary, display_order, caption, category, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [img.id, prop.id, uniqueUrl, img.isPrimary, img.displayOrder, img.caption, img.category, now]
        );
        totalSeeded++;
      }
    }
  }

  return { seededCount: totalSeeded, propertyCount: properties.length };
}
