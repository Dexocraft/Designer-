# Security Specification — TapCard Studio (Email Submission Mode)

## 1. Data Invariants
1. **PII Isolation (Write-Only Dropbox)**: Because customers submit card orders using only an email address (without Google login), `get`, `list`, `update`, and `delete` on `/cards/{cardId}` are strictly denied (`if false;`) for all clients so customer emails and designs cannot be scraped, read, modified, or deleted by other visitors.
2. **Path & ID Integrity**: Every `{cardId}` path parameter MUST satisfy `isValidId(cardId)` (`^[a-zA-Z0-9_\-]+$`, length 1–128) and match `data.id`.
3. **Email Validation**: `data.email` MUST be a string of length 5–254 matching `^[^\s@]+@[^\s@]+\.[^\s@]+$`.
4. **Strict Schema Enforcement**: Documents MUST contain exact required keys with zero shadow/ghost fields (`hasAll` + `hasOnly`), bounded string lengths, validated hex color strings, and bounded element lists (`elements.size() <= 40`).
5. **Temporal Integrity**: `createdAt` and `updatedAt` MUST equal `request.time` on creation.
6. **Terminal State Enforcement**: Every created card MUST have `status == 'submitted'` and `accepted == true`, and subsequent updates/deletes are blocked.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Invalid Email Format**: Create `/cards/card_1` with `email: "not-an-email"` -> `PERMISSION_DENIED`.
2. **Oversized Email Exhaustion**: Create `/cards/card_1` with 300-char `email` -> `PERMISSION_DENIED`.
3. **Path ID Poisoning**: Create `/cards/../../etc/passwd` or 300-char ID -> `PERMISSION_DENIED`.
4. **Mismatched Path & Document ID**: Create `/cards/card_1` with `id: "card_2"` -> `PERMISSION_DENIED`.
5. **Shadow / Ghost Field Injection**: Create `/cards/card_1` with extra key `isAdmin: true` -> `PERMISSION_DENIED`.
6. **Client-Forged Timestamp**: Create `/cards/card_1` with `createdAt` not equal to `request.time` -> `PERMISSION_DENIED`.
7. **Oversized Name / String Exhaustion**: Create `/cards/card_1` with 500-char `name` -> `PERMISSION_DENIED`.
8. **Malformed Hex Color Injection**: Create `/cards/card_1` with `front.background.color: "javascript:alert(1)"` -> `PERMISSION_DENIED`.
9. **Unbounded Array Exhaustion**: Create `/cards/card_1` with 41 items in `front.elements` -> `PERMISSION_DENIED`.
10. **PII Scraping via Get or List**: Attempt `get` on `/cards/card_1` or `list` on `/cards` -> `PERMISSION_DENIED`.
11. **Terminal State Tampering**: Attempt `update` on `/cards/card_1` -> `PERMISSION_DENIED`.
12. **Unauthorized Deletion**: Attempt `delete` on `/cards/card_1` -> `PERMISSION_DENIED`.
