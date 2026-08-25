'use strict';

const QUANTITY_KEYS = [
  'stock_quantity', 'stockQuantity', 'quantity', 'available_quantity',
  'availableQuantity', 'available_qty', 'inventory_quantity',
  'inventoryQuantity', 'stock'
];
const VARIANT_KEYS = ['variants', 'options', 'choices', 'items', 'properties'];
const NESTED_KEYS = ['inventory', 'raw', 'data'];

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

function nestedAvailability(product) {
  const values = [];
  const visit = (value, depth, seen) => {
    if (!value || typeof value !== 'object' || depth > 4 || seen.has(value)) return;
    seen.add(value);
    if (typeof value.is_available === 'boolean') values.push(value.is_available);
    for (const { items } of collectionItems(value, [...VARIANT_KEYS, 'properties'])) {
      items.forEach(item => visit(item, depth + 1, seen));
    }
  };
  visit(product, 0, new Set());
  return values;
}

function getProductStock(product) {
  if (!product || typeof product !== 'object') return { quantity: null, path: null };

  // If explicit variants/options exist, sum their explicit quantities once.
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
      path: variantCandidates.map(item => item.path).join(',')
    };
  }

  const direct = explicitQuantity(product, '');
  const inventory = product.inventory && typeof product.inventory === 'object' ? explicitQuantity(product.inventory, 'inventory') : [];
  const candidates = direct.concat(inventory);
  if (candidates.length) return candidates[0];

  // A normalized object can carry the original supplier object under `raw`.
  if (product.raw && typeof product.raw === 'object') return getProductStock(product.raw);
  return { quantity: null, path: null };
}

function getProductAvailability(product) {
  if (!product || product.is_active === false || product.active === false) return false;
  if (typeof product.is_available === 'boolean') return product.is_available;
  if (typeof product.available === 'boolean') return product.available;
  const flags = nestedAvailability(product);
  return flags.length ? flags.some(Boolean) : null;
}

function getProductStockState(product) {
  const stock = getProductStock(product);
  const available = getProductAvailability(product);
  const inStock = available === false ? false : stock.quantity === null ? available === true : stock.quantity > 0;
  return { quantity: stock.quantity, path: stock.path, available, inStock };
}

module.exports = { getProductStock, getProductAvailability, getProductStockState, numericQuantity };
