/**
 * Checklist Rule Matcher (pure functions, no DB access)
 * ------------------------------------------------------
 * ONE universal rule for every template condition dropdown:
 *
 *   For each dimension (Property Scope, Product/Sub-Product, Income Profile, Customer Type):
 *     - Nothing selected in the template (or "ALL")  => no restriction, dimension passes.
 *     - Something selected                            => the person's selected value(s) must
 *                                                       EXACTLY match at least one of them.
 *   A checklist field is created only when ALL dimensions pass (AND).
 *
 * Matching is exact after canonicalisation (case / spacing / punctuation-spacing insensitive).
 * There is deliberately NO substring matching: "Resale" must not match "Seller BT - Resale",
 * and "...(CLP)" must not match "...(CLP in Maharashtra)".
 *
 * Known duplicate / renamed master values are bridged by an explicit alias table below.
 */

export type RuleDimension = 'propertyScope' | 'product' | 'incomeProfile' | 'customerType';

/** Lowercase, trim, collapse whitespace and normalise spacing around "/" and "-". */
export function canonical(value?: string | null): string {
  if (!value) return '';
  return value
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s*-\s*/g, ' - ')
    .replace(/\.$/, '')
    .trim();
}

/**
 * Explicit synonyms: variant -> preferred master name.
 * Add a line here whenever a master value is renamed or duplicated.
 */
const ALIAS_SOURCE: Record<RuleDimension, Record<string, string>> = {
  customerType: {
    'HUF': 'Hindu Undivided Family (HUF)',
    'Hindu Undivided Family': 'Hindu Undivided Family (HUF)',
    'LLP': 'Limited Liability Partnership (LLP)',
    'Limited Liability Partnership': 'Limited Liability Partnership (LLP)',
    'Pvt. Ltd': 'Private Limited Company',
    'Pvt Ltd': 'Private Limited Company',
    'Private Limited': 'Private Limited Company',
    'Public Ltd': 'Public Limited Company',
    'Public Limited': 'Public Limited Company',
    'Partnership': 'Partnership Firm',
    'Proprietor': 'Proprietorship',
    'Individual (Proprietor/ Director/ Partner)': 'Individual',
  },
  incomeProfile: {
    'Business / Non-Professional': 'Self Employed Non-Professional',
    'Self Employed Non Professional': 'Self Employed Non-Professional',
    'SENP': 'Self Employed Non-Professional',
    'SEP': 'Self Employed Professional',
  },
  propertyScope: {
    // Legacy enum-style values stored by the very first seed
    'RESALE': 'Resale',
    'DIRECT_ALLOTMENT': 'Direct Allotment - Flat',
    'TAKEOVER_SELLER_BT': 'Takeover / Seller BT',
  },
  product: {},
};

const ALIASES: Record<RuleDimension, Map<string, string>> = {
  customerType: new Map(),
  incomeProfile: new Map(),
  propertyScope: new Map(),
  product: new Map(),
};
(Object.keys(ALIAS_SOURCE) as RuleDimension[]).forEach((dim) => {
  Object.entries(ALIAS_SOURCE[dim]).forEach(([variant, preferred]) => {
    ALIASES[dim].set(canonical(variant), canonical(preferred));
  });
});

/** Canonical key for a value within a dimension (alias-resolved). */
export function ruleKey(dimension: RuleDimension, value?: string | null): string {
  const c = canonical(value);
  return ALIASES[dimension].get(c) || c;
}

const UNRESTRICTED = new Set(
  ['all', 'all products', 'all profiles', 'all customer types', 'all products/sub - products', 'any'].map(canonical)
);

/** Splits a stored comma-separated template value into alias-resolved keys. Empty => unrestricted. */
export function parseTemplateValues(dimension: RuleDimension, stored?: string | null): string[] {
  if (!stored) return [];
  const keys = stored
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => ruleKey(dimension, s));
  if (keys.some((k) => UNRESTRICTED.has(k))) return [];
  return Array.from(new Set(keys));
}

/** True when the dimension passes for the given person values. */
export function dimensionMatches(
  dimension: RuleDimension,
  storedTemplateValue: string | null | undefined,
  personValues: Array<string | null | undefined>
): boolean {
  const allowed = parseTemplateValues(dimension, storedTemplateValue);
  if (allowed.length === 0) return true; // no restriction
  const have = new Set(personValues.filter(Boolean).map((v) => ruleKey(dimension, v as string)));
  return allowed.some((a) => have.has(a));
}

/**
 * Product tokens a case "has". Template options are stored either as
 * "<Product>" (all sub-products) or "<Product> - <Sub-Product>".
 */
export function productTokens(product?: string | null, subProduct?: string | null): string[] {
  const tokens: string[] = [];
  if (product) tokens.push(product);
  if (product && subProduct) tokens.push(`${product} - ${subProduct}`);
  return tokens;
}

export interface RuleTemplateItem {
  propertyTypeScope?: string | null;
  subProduct?: string | null;
  incomeType?: string | null;
  customerType?: string | null;
}

export interface RulePersonContext {
  productTokens: string[];
  propertyScope: string | null | undefined;
  customerTypes: string[];
  incomeTypes: string[];
}

export interface RuleResult {
  ok: boolean;
  failedOn?: RuleDimension;
}

/** Evaluates all four dimensions with AND logic for one person (applicant or co-applicant). */
export function evaluateTemplateItem(item: RuleTemplateItem, ctx: RulePersonContext): RuleResult {
  if (!dimensionMatches('product', item.subProduct, ctx.productTokens)) return { ok: false, failedOn: 'product' };
  if (!dimensionMatches('propertyScope', item.propertyTypeScope, [ctx.propertyScope]))
    return { ok: false, failedOn: 'propertyScope' };
  if (!dimensionMatches('customerType', item.customerType, ctx.customerTypes))
    return { ok: false, failedOn: 'customerType' };
  if (!dimensionMatches('incomeProfile', item.incomeType, ctx.incomeTypes))
    return { ok: false, failedOn: 'incomeProfile' };
  return { ok: true };
}

/** True when the template restricts the field to specific income profiles. */
export function hasIncomeRestriction(item: RuleTemplateItem): boolean {
  return parseTemplateValues('incomeProfile', item.incomeType).length > 0;
}

/** Splits a stored customer-type string ("A, B") or array into a clean list. */
export function toList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((s) => s.trim()).filter(Boolean);
  return [];
}
