/**
 * Security Rules Verification Suite (Dirty Dozen Payloads — Email Submission Mode)
 */
import { readFileSync } from 'node:fs';

export const DIRTY_DOZEN_CASES = [
  {
    id: 1,
    name: 'Invalid email format on /cards/{cardId}',
    expected: 'PERMISSION_DENIED',
    path: 'cards/card_test_1',
    operation: 'create',
    patch: { email: 'not-an-email' },
  },
  {
    id: 2,
    name: 'Oversized email (>254 chars) on /cards/{cardId}',
    expected: 'PERMISSION_DENIED',
    path: 'cards/card_test_2',
    operation: 'create',
    patch: { email: `${'a'.repeat(250)}@example.com` },
  },
  {
    id: 3,
    name: 'Path variable ID poisoning (>128 chars)',
    expected: 'PERMISSION_DENIED',
    path: `cards/${'a'.repeat(150)}`,
    operation: 'create',
  },
  {
    id: 4,
    name: 'Mismatched document id vs path cardId',
    expected: 'PERMISSION_DENIED',
    path: 'cards/card_test_4',
    operation: 'create',
    patch: { id: 'card_other' },
  },
  {
    id: 5,
    name: 'Shadow / ghost field injection (isAdmin: true)',
    expected: 'PERMISSION_DENIED',
    path: 'cards/card_test_5',
    operation: 'create',
    patch: { isAdmin: true },
  },
  {
    id: 6,
    name: 'Forged createdAt timestamp (not request.time)',
    expected: 'PERMISSION_DENIED',
    path: 'cards/card_test_6',
    operation: 'create',
    patch: { createdAt: new Date(0) },
  },
  {
    id: 7,
    name: 'Oversized name field (>120 chars)',
    expected: 'PERMISSION_DENIED',
    path: 'cards/card_test_7',
    operation: 'create',
    patch: { name: 'X'.repeat(200) },
  },
  {
    id: 8,
    name: 'Invalid hex background color injection',
    expected: 'PERMISSION_DENIED',
    path: 'cards/card_test_8',
    operation: 'create',
    patch: { 'front.background.color': 'not-a-hex' },
  },
  {
    id: 9,
    name: 'Unbounded elements list (>40 items)',
    expected: 'PERMISSION_DENIED',
    path: 'cards/card_test_9',
    operation: 'create',
    patch: { elementCount: 41 },
  },
  {
    id: 10,
    name: 'PII scrape attempt via get/list on /cards',
    expected: 'PERMISSION_DENIED',
    path: 'cards/card_test_1',
    operation: 'list',
  },
  {
    id: 11,
    name: 'Update attempt on submitted card',
    expected: 'PERMISSION_DENIED',
    path: 'cards/card_test_1',
    operation: 'update',
    patch: { name: 'Tampered Name' },
  },
  {
    id: 12,
    name: 'Delete attempt on submitted card',
    expected: 'PERMISSION_DENIED',
    path: 'cards/card_test_1',
    operation: 'delete',
  },
];

export function loadRulesText(): string {
  return readFileSync('firestore.rules', 'utf8');
}
