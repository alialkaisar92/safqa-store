'use strict';

const QUANTITY_KEYS = [
  'stock_quantity', 'stockQuantity', 'quantity', 'available_quantity',
  'availableQuantity', 'available_qty', 'inventory_quantity',
  'inventoryQuantity', 'stock'
];
const VARIANT_KEYS = ['variants', 'options', 'choices', 'items'];

function numericQuantity(value) {
  if (typeof value === 'boolean' || value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : null;
}

function explicitQuantity(object, path) {
  if (!object || typeof object !== 'object' || Array.isArray(object)) return [];
  const found = [];
  for (const key of QUANTITY_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(object, key)) continue;
    const quantity = numericQuantity(object[key]);
    if (quantity !== null) found.push({ quantity, path: path ? `${path}.${key}` : key });
  }
  return found;
}

function collectionItems(product, keys) {
  const values = [];
  for (const key of keys) {
    if (Array.isArray(product?.[key])) values.push({ key, items: product[key] });
  }
  return values;
}

function propertyStockDetails(product) {
  if (!Array.isArray(product?.properties)) return [];
  return product.properties.map((property, index) => ({
    key: String(property?.key ?? property?.name ?? `خاصية ${index + 1}`),
    quantity: numericQuantity(property?.value),
    available: property?.is_available === true,
    path: `properties[${index}].value`
  }));
}

function nestedAvailability(product) {
  const values = [];
  const visit = (value, depth, seen) => {
    if (!value || typeof value !== 'object' || depth > 4 || seen.has(value)) return;
    seen.add(value);
    if (typeof value.is_available === 'boolean') values.push(value.is_available);
    for (const { items } of collectionItems(value, VARIANT_KEYS)) {
      items.forEach(item => visit(item, depth + 1, seen));
    }
  };
  visit(product, 0, new Set());
  return values;
}

function getProductStock(product) {
  if (!product || typeof product !== 'object') return { quantity: null, path: null, details: [], source: null };

  // Safka exposes the numeric stock per product property in properties[].value.
  const hasProperties = Array.isArray(product.properties);
  const properties = propertyStockDetails(product);
  if (hasProperties) {
    const availableProperties = properties.filter(item => item.available && item.quantity !== null);
    return {
      quantity: availableProperties.length ? availableProperties.reduce((sum, item) => sum + item.quantity, 0) : null,
      path: availableProperties.map(item => item.path).join(',') || null,
      details: properties,
      source: 'properties.value'
    };
  }

  // Other suppliers/variants may expose explicit quantity fields in variants/options.
  const variantGroups = collectionItems(product, VARIANT_KEYS);
  const variantCandidates = [];
  for (const { key, items } of variantGroups) {
    items.forEach((item, index) => {
      const path = `${key}[${index}]`;
      const direct = explicitQuantity(item, path);
      const inventory = item && item.inventory && typeof item.inventory === 'object' ? explicitQuantity(item.inventory, `${path}.inventory`) : [];
      variantCandidates.push(...direct, ...inventory);
    });
  }
  if (variantCandidates.length) {
    return {
      quantity: variantCandidates.reduce((sum, item) => sum + item.quantity, 0),
      path: variantCandidates.map(item => item.path).join(','),
      details: [],
      source: 'variants'
    };
  }

  const direct = explicitQuantity(product, '');
  const inventory = product.inventory && typeof product.inventory === 'object' ? explicitQuantity(product.inventory, 'inventory') : [];
  const candidates = direct.concat(inventory);
  if (candidates.length) return { ...candidates[0], details: [], source: candidates[0].path };

  if (product.raw && typeof product.raw === 'object') return getProductStock(product.raw);
  return { quantity: null, path: null, details: [], source: null };
}

function getProductAvailability(product) {
  if (!product || product.is_active === false || product.active === false) return false;
  const properties = propertyStockDetails(product);
  if (Array.isArray(product.properties) && properties.length) return properties.some(item => item.available === true);
  if (typeof product.is_available === 'boolean') return product.is_available;
  if (typeof product.available === 'boolean') return product.available;
  if (Array.isArray(product.properties) && typeof product.is_active === 'boolean') return product.is_active;
  const flags = nestedAvailability(product);
  return flags.length ? flags.some(Boolean) : null;
}

function getProductStockState(product) {
  const stock = getProductStock(product);
  const available = getProductAvailability(product);
  const inStock = available === false ? false : stock.quantity === null ? available === true : stock.quantity > 0;
  return { quantity: stock.quantity, path: stock.path, available, inStock, details: stock.details, source: stock.source };
}

module.exports = { getProductStock, getProductAvailability, getProductStockState, numericQuantity, propertyStockDetails };
