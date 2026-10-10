import { db } from '../db';
import { BagSize } from '../types';

export interface QuoteItemInput {
  wasteTypeId: string;
  bagSize: BagSize;
  numberOfBags: number;
}

export interface EnrichedQuoteItem {
  wasteTypeId: string;
  wasteTypeName: string;
  bagSize: BagSize;
  numberOfBags: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
  co2Factor: number;
  approxKgPerBag: number;
  estimatedKg: number;
  estimatedCo2SavedKg: number;
}

export interface PricingQuoteResult {
  totalMinor: number;
  totalEstimatedKg: number;
  totalEstimatedCo2Kg: number;
  items: EnrichedQuoteItem[];
}

export function getBagKgEstimate(size: BagSize): number {
  switch (size) {
    case 'SMALL':
      return 3.0; // approx 5-8 liter bag
    case 'MEDIUM':
      return 8.0; // approx 15-20 liter bag
    case 'LARGE':
      return 18.0; // approx 35-50 liter bag
    default:
      return 5.0;
  }
}

export function calculatePricingQuote(items: QuoteItemInput[]): PricingQuoteResult {
  if (!items || items.length === 0) {
    return {
      totalMinor: 0,
      totalEstimatedKg: 0,
      totalEstimatedCo2Kg: 0,
      items: [],
    };
  }

  let totalMinor = 0;
  let totalEstimatedKg = 0;
  let totalEstimatedCo2Kg = 0;
  const enrichedItems: EnrichedQuoteItem[] = [];

  const now = new Date().toISOString();

  for (const item of items) {
    if (!item.numberOfBags || item.numberOfBags < 1) continue;

    const wasteType = db.wasteTypes.find((wt) => wt.id === item.wasteTypeId && wt.active);
    if (!wasteType) {
      throw new Error(`Invalid or inactive waste type: ${item.wasteTypeId}`);
    }

    const rule = db.pricingRules.find(
      (pr) =>
        pr.wasteTypeId === item.wasteTypeId &&
        pr.bagSize === item.bagSize &&
        pr.active &&
        pr.effectiveFrom <= now &&
        (!pr.effectiveTo || pr.effectiveTo > now)
    );

    if (!rule) {
      throw new Error(`No active pricing rule found for ${wasteType.name} (${item.bagSize})`);
    }

    const unitPriceMinor = rule.priceMinor;
    const lineTotalMinor = unitPriceMinor * item.numberOfBags;
    const approxKgPerBag = getBagKgEstimate(item.bagSize);
    const estimatedKg = parseFloat((approxKgPerBag * item.numberOfBags).toFixed(1));
    const estimatedCo2SavedKg = parseFloat((estimatedKg * wasteType.co2Factor).toFixed(2));

    totalMinor += lineTotalMinor;
    totalEstimatedKg += estimatedKg;
    totalEstimatedCo2Kg += estimatedCo2SavedKg;

    enrichedItems.push({
      wasteTypeId: wasteType.id,
      wasteTypeName: wasteType.name,
      bagSize: item.bagSize,
      numberOfBags: item.numberOfBags,
      unitPriceMinor,
      lineTotalMinor,
      co2Factor: wasteType.co2Factor,
      approxKgPerBag,
      estimatedKg,
      estimatedCo2SavedKg,
    });
  }

  return {
    totalMinor,
    totalEstimatedKg: parseFloat(totalEstimatedKg.toFixed(1)),
    totalEstimatedCo2Kg: parseFloat(totalEstimatedCo2Kg.toFixed(2)),
    items: enrichedItems,
  };
}
