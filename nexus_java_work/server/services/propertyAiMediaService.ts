import { GoogleGenAI } from '@google/genai';
import { queryAll, queryOne, execute, executeTransaction } from '../db/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { getCatalogImagesForProperty } from './propertyImageService.js';

let aiInstance: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI {
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: { 'User-Agent': 'aistudio-build' },
      },
    });
  }
  return aiInstance;
}

export interface PhotoSpecification {
  category: string;
  roomName: string;
  visualPrompt: string;
  architecturalStyle: string;
  lighting: string;
  cameraSpecs: string;
  materials: string[];
}

/**
 * Builds a structured, property-specific architectural photography blueprint
 * based on the property's actual database details.
 */
export async function buildPhotoBlueprintForProperty(propertyId: string): Promise<{
  propertyTitle: string;
  propertyType: string;
  location: string;
  specifications: PhotoSpecification[];
}> {
  const property = await queryOne<{
    id: string;
    title: string;
    description: string;
    property_type: string;
    location: string;
    price: number;
    bedrooms: number;
    bathrooms: number;
    area: number;
    amenities: string;
  }>('SELECT * FROM properties WHERE id = ?', [propertyId]);

  if (!property) throw new AppError('Property not found', 404);

  const amenities: string[] = JSON.parse(property.amenities || '[]');

  // Check if we can enhance via Gemini AI prompt synthesis
  const prompt = `You are a Principal Real Estate Photographer and Architectural Visualizer in Sri Lanka.
Build a comprehensive 10-room architectural photography shoot blueprint for this property:
Title: "${property.title}"
Type: ${property.property_type}
Location: ${property.location}
Specs: ${property.bedrooms} Bedrooms, ${property.bathrooms} Bathrooms, ${property.area} sq ft
Amenities: ${amenities.join(', ')}
Description: "${property.description}"

Return a JSON array of exactly 10 photo specifications matching the property's actual layout and Sri Lankan context.
Format:
[
  {
    "category": "<HERO_EXTERIOR | LIVING_ROOM | KITCHEN | MASTER_BEDROOM | SECOND_BEDROOM | BATHROOM | DINING_AREA | OUTDOOR_GARDEN | PARKING_GARAGE | FEATURE_IMAGE>",
    "roomName": "<Name of view/room>",
    "visualPrompt": "<Detailed descriptive prompt for photorealistic architectural photography>",
    "architecturalStyle": "<e.g. Tropical Modern / Dutch Colonial / Contemporary Urban / Tea Planter>",
    "lighting": "<e.g. Natural midday sun with warm tropical bounce>",
    "cameraSpecs": "<e.g. 24mm tilt-shift lens, f/8, tripod, eye-level>",
    "materials": ["<material 1>", "<material 2>"]
  }
]
Return ONLY JSON without markdown.`;

  try {
    const ai = getAiClient();
    const res = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });
    const text = (res.text || '').replace(/```json/g, '').replace(/```/g, '').trim();
    const specs = JSON.parse(text);
    return {
      propertyTitle: property.title,
      propertyType: property.property_type,
      location: property.location,
      specifications: specs,
    };
  } catch (err) {
    // Fallback deterministic blueprint
    const fallbackSpecs: PhotoSpecification[] = [
      {
        category: 'HERO_EXTERIOR',
        roomName: 'Main Front Exterior',
        visualPrompt: `Architectural daytime photograph of ${property.title} in ${property.location}, authentic Sri Lankan real estate photography, clean composition.`,
        architecturalStyle: property.property_type === 'VILLA' ? 'Tropical Modern Villa' : 'Contemporary Sri Lankan Architecture',
        lighting: 'Natural bright morning daylight, clear skies',
        cameraSpecs: '24mm wide angle, f/8, straight horizon',
        materials: ['Polished concrete', 'Teak timber', 'Glass'],
      },
      {
        category: 'LIVING_ROOM',
        roomName: 'Main Living Room',
        visualPrompt: `Open-plan living room of ${property.title}, realistic furniture, natural light through large windows.`,
        architecturalStyle: 'Modern Tropical Living',
        lighting: 'Soft diffused natural light',
        cameraSpecs: '28mm perspective, f/7.1',
        materials: ['Hardwood flooring', 'Fabric sofa', 'Teak coffee table'],
      },
      {
        category: 'KITCHEN',
        roomName: 'Designer Kitchen Pantry',
        visualPrompt: `Modern fitted kitchen with granite countertops, sleek cabinets, and breakfast counter.`,
        architecturalStyle: 'Contemporary Kitchen',
        lighting: 'Warm under-cabinet lighting and window daylight',
        cameraSpecs: '35mm, f/8',
        materials: ['Granite', 'Solid teak', 'Stainless steel'],
      },
      {
        category: 'MASTER_BEDROOM',
        roomName: 'Master Bedroom Suite',
        visualPrompt: `Spacious master bedroom with king bed, timber flooring, and private balcony view.`,
        architecturalStyle: 'Modern Sri Lankan Master Suite',
        lighting: 'Gentle natural morning light',
        cameraSpecs: '24mm, f/6.3',
        materials: ['Teak wood', 'Linen', 'Ceramic tiles'],
      },
      {
        category: 'BATHROOM',
        roomName: 'Master Ensuite Bathroom',
        visualPrompt: `Clean modern bathroom with walk-in rain shower, stone vanity, and glass enclosure.`,
        architecturalStyle: 'Spa-inspired Luxury Bathroom',
        lighting: 'Bright neutral vanity lighting',
        cameraSpecs: '24mm, f/8',
        materials: ['Porcelain tile', 'Tempered glass', 'Chrome fixtures'],
      },
    ];

    return {
      propertyTitle: property.title,
      propertyType: property.property_type,
      location: property.location,
      specifications: fallbackSpecs,
    };
  }
}

/**
 * Regenerates or ensures full 10-12 image catalog for a property.
 */
export async function regeneratePropertyImages(propertyId: string): Promise<{ success: boolean; imageCount: number }> {
  const catalog = getCatalogImagesForProperty(propertyId);
  const now = Date.now();

  if (catalog.length === 0) {
    throw new AppError('No catalog images configured for this property', 400);
  }

  await executeTransaction(async () => {
    await execute('DELETE FROM property_images WHERE property_id = ?', [propertyId]);
    for (const img of catalog) {
      await execute(
        `INSERT INTO property_images (id, property_id, url, is_primary, display_order, caption, category, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [img.id, propertyId, img.url, img.isPrimary, img.displayOrder, img.caption, img.category, now]
      );
    }
  });

  return { success: true, imageCount: catalog.length };
}
