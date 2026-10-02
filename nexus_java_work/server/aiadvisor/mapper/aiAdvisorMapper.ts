/**
 * AI Advisor Mapper
 * Formats database entities into clean, UI-ready DTOs.
 */

import { Property } from '../../types/index.js';
import { AIPropertyResult } from '../dto/aiAdvisorDto.js';
import { formatLKR } from '../../services/sriLankaUtils.js';

export function formatShortPrice(price: number): string {
  if (!price || isNaN(price)) return 'LKR 0';
  if (price >= 10000000) {
    const m = (price / 1000000).toFixed(1).replace(/\.0$/, '');
    return `LKR ${m}M`;
  }
  if (price >= 100000) {
    const lk = (price / 100000).toFixed(1).replace(/\.0$/, '');
    return `LKR ${lk} Lakhs`;
  }
  return `LKR ${price.toLocaleString()}`;
}

export function toAIPropertyResult(prop: Property, relevanceReason?: string): AIPropertyResult {
  return {
    id: prop.id,
    title: prop.title,
    price: prop.price,
    formattedPrice: formatLKR(prop.price),
    shortPrice: formatShortPrice(prop.price),
    location: prop.location,
    propertyType: prop.propertyType,
    bedrooms: prop.bedrooms,
    bathrooms: prop.bathrooms,
    area: prop.area,
    primaryImage: prop.primaryImage,
    status: prop.status,
    relevanceReason,
  };
}

export function toAIPropertyResults(props: Property[]): AIPropertyResult[] {
  return props.map(p => toAIPropertyResult(p));
}
