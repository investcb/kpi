# Security Specification: Civil Servant KPI Task Manager

This specification outlines the data invariants, 12 adversarial test payloads (the "Dirty Dozen"), and the security rule checks implemented to protect Firebase Firestore collections.

## 1. Data Invariants

1. **User Ownership Isolation**: A user (`userId`) can only view, create, edit, or delete items within their own nested `/users/{userId}` structure. They can never read or write any details belonging to another user's paths.
2. **Metadata Integrity**: Crucial chronological fields (`createdAt`, `updatedAt`) must conform to server-generated timestamps (`request.time`).
3. **Type and Size Safeguards**: Title and description must not exceed severe limits (e.g., 200 characters for title, 1000 characters for description) to avoid malicious Denial of Wallet payload flooding.
4. **Valid KPI Scoring**: The user's self-graded KPI score must be positive and must not exceed the defined task weight (`selfGradedScore <= kpiScore` and both must be `>= 0`).

---

## 2. The "Dirty Dozen" Adversarial Payloads

Here are the 12 malicious payloads designed to violate the security invariants and check that they are properly blocked by the rules:

### A. Identity Spoofing Attacks
1. **Payload 1: Attempt to write user profile with mismatching UID**
   - *Target*: `create` on `/users/john_doe` while authenticated as `jane_smith`
   - *Expectation*: `PERMISSION_DENIED`

2. **Payload 2: Bypass task owner checks**
   - *Target*: `create` on `/users/john_doe/tasks/task_1` while authenticated as `jane_smith`
   - *Expectation*: `PERMISSION_DENIED`

### B. State Shortcutting & Value Poisoning
3. **Payload 3: Out of bound self KPI score (greater than limit)**
   - *Target*: `create` on `/users/john_doe/tasks/task_1` with `kpiScore: 10`, but setting `selfGradedScore: 500` (trying to inflate grades)
   - *Expectation*: `PERMISSION_DENIED`

4. **Payload 4: Negative self KPI score**
   - *Target*: `create` on `/users/john_doe/tasks/task_1` with `selfGradedScore: -5`
   - *Expectation*: `PERMISSION_DENIED`

### C. Resource Poisoning & Size Failures
5. **Payload 5: Gigantic Title (Resource Flooding)**
   - *Target*: `create` on `/users/john_doe/tasks/task_1` with a `title` containing over 5KB of text.
   - *Expectation*: `PERMISSION_DENIED` (string size limit check)

6. **Payload 6: Huge Document ID Injection**
   - *Target*: Write on `/users/john_doe/tasks/<1024-character-junk-string>`
   - *Expectation*: `PERMISSION_DENIED` (ID verification size limits)

### D. Chronology / Tampering
7. **Payload 7: Backdated createdAt timestamp**
   - *Target*: Changing `createdAt` to a hand-crafted past string `2000-01-01T00:00:00Z` instead of standard `request.time` on creation.
   - *Expectation*: `PERMISSION_DENIED`

8. **Payload 8: Backdated updatedAt timestamp**
   - *Target*: Changing `updatedAt` to a historical date during update.
   - *Expectation*: `PERMISSION_DENIED`

### E. Malicious Structural Alteration (Shadow Fields)
9. **Payload 9: Injection of Ghost Field (`isAdmin = true`) in User Profile**
   - *Target*: Modifying a profile with unauthorized fields.
   - *Expectation*: `PERMISSION_DENIED` (due to `affectedKeys().hasOnly()` or complete exact keys match checks)

10. **Payload 10: Injecting an unsupported Task status**
    - *Target*: Creating a task with `status: "approved_by_president"` (invalid enum)
    - *Expectation*: `PERMISSION_DENIED`

### F. Blanket Read / Leak Exploitations
11. **Payload 11: Bulk querying all user profiles (Anonymous search)**
    - *Target*: Standard query on `/users` without specifying an ID.
    - *Expectation*: `PERMISSION_DENIED` (Collection lists are restricted, must read single doc with UID)

12. **Payload 12: Read arbitrary user's task list**
    - *Target*: Reading the list of `/users/john_doe/tasks` while logged in as `jane_smith`.
    - *Expectation*: `PERMISSION_DENIED`
