# Tag Manager — Design Spec

**Date:** 2026-03-24
**Status:** Approved

## Overview

Add a dedicated **Tags tab** to the app's tab bar where users can view all tags and, for each tag, rename it, change its color (from presets or a custom hex value), or delete it.

The API already supports all three operations (`PATCH /tags/:id`, `DELETE /tags/:id`). The `ColorPicker` component and `tagStore` exist but need small extensions.

---

## Components

### New: `src/features/tags/TagsTab.tsx`

The new "Tags" tab content. Reads all tags from `tagStore` and renders a list. Each row shows:
- A color swatch (the tag's current color)
- The tag name
- An **Edit** button — opens `TagEditModal` for that tag
- A **Delete** button — opens `TagEditModal` in delete-confirm mode (or triggers inline confirm)

### New: `src/features/tags/TagEditModal.tsx`

A modal opened when the user clicks Edit on a tag row. Contains:
- A text input pre-filled with the tag's current name (required, Save disabled if empty)
- The `ColorPicker` component (presets + hex input) pre-set to the tag's current color
- A **Save** button — calls `tagStore.updateTag(id, { name, color })`, closes modal on success
- A **Cancel** button — closes modal without saving
- A **Delete** button — reveals an inline "Confirm delete / Cancel" pair; on confirm calls `api.deleteTag` then `tagStore.removeTag`, closes modal

On API error, a toast is shown and the modal stays open for retry.

### Changed: `src/components/ColorPicker.tsx`

Add a hex text input below the preset swatches. Behavior:
- Input accepts values with or without a leading `#`
- Selection updates live when a valid 6-digit hex is typed
- If the typed hex matches a preset color, that swatch shows as selected
- Invalid/incomplete hex input is ignored (no selection change)

### Changed: `src/store/tagStore.ts`

Add `updateTag(id: string, patch: { name?: string; color?: string }): Promise<Tag>` action:
1. Calls `api.updateTag(id, patch)`
2. On success, calls `upsertTag(result)` to update the store
3. Returns the updated tag

### Changed: `src/components/TabBar.tsx`

- Add `'tags'` to the `Tab` union type
- Add `{ id: 'tags', label: 'Tags' }` to the `TABS` array

### Changed: `src/App.tsx`

- Handle `active === 'tags'` to render `<TagsTab />`
- Pass required props (tags from store, store actions)

---

## Data Flow

1. Tags are already fetched into `tagStore` on app load — `TagsTab` reads them reactively, no new fetch needed.
2. **Edit save:** `TagEditModal` → `tagStore.updateTag(id, patch)` → `api.updateTag` → `upsertTag(response)` → all `TagBadge` instances across the app update reactively.
3. **Delete:** confirm in modal → `api.deleteTag(id)` → `tagStore.removeTag(id)` (existing action) → modal closes.
4. **Hex input:** valid 6-digit hex (with or without `#`) updates the selected color live; preset swatches stay in sync.

---

## Error Handling

- API errors on save or delete: show a toast via the existing `Toast`/`ToastProvider` infrastructure; leave the modal open so the user can retry.
- Name validation: Save button is disabled when the name field is empty or whitespace-only.
- Hex validation: only valid 6-digit hex values update the color selection; partial/invalid input is ignored silently.

---

## Testing

| File | What to cover |
|---|---|
| `src/features/tags/TagsTab.test.tsx` | Renders tag list; Edit click opens modal; Save calls `updateTag`; Delete confirm calls `removeTag` |
| `src/features/tags/TagEditModal.test.tsx` | Name field pre-fill; disabled Save on empty name; preset color selection; hex input valid/invalid cases; delete confirmation flow; API error shows toast |
| `src/components/ColorPicker.test.tsx` | Existing tests pass; new: hex input sets selection; hex matching a preset highlights that swatch |

---

## Out of Scope

- Reordering tags
- Tag usage counts / bulk operations
- Custom colors beyond hex input (HSL picker, eyedropper, etc.)
