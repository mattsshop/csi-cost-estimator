# Firebase Security Specification - Construction Cost Estimator

## 1. Data Invariants
- **User Integrity**: A user can only manage their own profile. Authenticated UID must match the document ID in the `users` collection.
- **Estimate Ownership**: An estimate must always belong to a `userId`. A user can only create, read, update, or delete estimates where `userId` matches their `auth.uid`.
- **Estimate Structure**: Estimates must include `id`, `userId`, `projectInfo`, `divisions`, `createdAt`, and `updatedAt`.
- **Relationship Sync**: The `userId` in the document data must always be immutable after creation.
- **Path Guarding**: Document IDs must be valid strings and not oversized to prevent resource exhaustion attacks.

## 2. The "Dirty Dozen" Payloads (Attacker Strategy)

| Payload ID | Target Action | Payload / Scenario Description | Expected Result |
| :--- | :--- | :--- | :--- |
| DD-01 | Create Estimate | `userId` in JSON does not match `request.auth.uid`. | **PERMISSION_DENIED** |
| DD-02 | Create Estimate | Document ID is > 128 characters or contains invalid characters. | **PERMISSION_DENIED** |
| DD-03 | Update Estimate | Attempt to change the `userId` of an existing estimate. | **PERMISSION_DENIED** |
| DD-04 | Update Estimate | Attempt to change the `createdAt` timestamp of an existing estimate. | **PERMISSION_DENIED** |
| DD-05 | Update Estimate | Include a "Ghost Field" `isAdmin: true` in the update payload. | **PERMISSION_DENIED** |
| DD-06 | List Estimates | Query with `where('userId', '==', 'OTHER_USER_UID')`. | **PERMISSION_DENIED** |
| DD-07 | Get Estimate | Direct request for an estimate ID belonging to another user. | **PERMISSION_DENIED** |
| DD-08 | Create User | Attempt to create a document in `/users/` using an ID other than `auth.uid`. | **PERMISSION_DENIED** |
| DD-09 | Create Estimate | Payload missing required `divisions` field. | **PERMISSION_DENIED** |
| DD-10 | Update Estimate | `updatedAt` is not set to `request.time`. | **PERMISSION_DENIED** |
| DD-11 | Delete Estimate | Authenticated user is not the owner of the document. | **PERMISSION_DENIED** |
| DD-12 | Create Estimate | Payload contains extremely large strings (> 1MB) for project names. | **PERMISSION_DENIED** |

## 3. Implementation Plan
- Use `rules_version = '2'`.
- Default deny all at the top.
- Define global helpers for `isSignedIn`, `isValidId`, `incoming`, `existing`.
- Use `isValid[Entity]` helpers for both `create` and `update` logic.
- Enforce strict key checks using `keys().hasAll()` and `keys().size()` for creation.
- Enforce partial updates using `affectedKeys().hasOnly()` in update branches.
- Use `request.time` for timestamp validation.
