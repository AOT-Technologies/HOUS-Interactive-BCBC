# How to Add a New BC Building Code Version

**Quick guide for adding a new version (e.g., 2027) after the multi-version infrastructure is in place.**

---

## Prerequisites

- Multi-version infrastructure completed (Phases 1-8)
- New BC Building Code JSON file available (e.g., `bcbc-2027.json`)
- Access to source code repository

---

## Steps

### 1. Add Source File

Copy the new BC Building Code JSON to the source directory:

```bash
cp ~/Downloads/bcbc-2027.json data/source/
```

**Verify file:**
```bash
# Check file exists and is valid JSON
cat data/source/bcbc-2027.json | jq . > /dev/null && echo "Valid JSON" || echo "Invalid JSON"

# Check file size
ls -lh data/source/bcbc-2027.json
```

---

### 2. Update versions.json

Edit `data/source/versions.json` to add the new version:

**Before:**
```json
{
  "versions": [
    {
      "id": "2024",
      "year": 2024,
      "title": "BC Building Code 2024",
      "sourceFile": "bcbc-2024.json",
      "isDefault": true,
      "publishedDate": "2024-01-01",
      "status": "current"
    }
  ]
}
```

**After:**
```json
{
  "versions": [
    {
      "id": "2024",
      "year": 2024,
      "title": "BC Building Code 2024",
      "sourceFile": "bcbc-2024.json",
      "isDefault": true,
      "publishedDate": "2024-01-01",
      "status": "current"
    },
    {
      "id": "2027",
      "year": 2027,
      "title": "BC Building Code 2027",
      "sourceFile": "bcbc-2027.json",
      "isDefault": false,
      "publishedDate": "2027-01-01",
      "status": "draft"
    }
  ]
}
```

**Field Descriptions:**
- `id`: Unique identifier (typically the year)
- `year`: Year of the code version
- `title`: Display title for UI
- `sourceFile`: Filename in `data/source/`
- `isDefault`: Whether this is the default version (only one should be true)
- `publishedDate`: Official publication date
- `status`: `"current"`, `"draft"`, or `"archived"`

---

### 3. Generate Assets

Run the asset generation pipeline:

```bash
# Generate assets for all versions
pnpm generate-assets
```

**What happens:**
- Reads `data/source/versions.json`
- Processes each version's source file
- Generates version-specific assets in `/apps/web/public/data/{versionId}/`
- Creates unified `versions.json` index

**Expected output:**
```
apps/web/public/data/
├── versions.json (lists both 2024 and 2027)
├── 2024/
│   ├── navigation-tree.json
│   ├── amendment-dates.json
│   ├── search/documents.json
│   └── content/...
└── 2027/ (NEW)
    ├── navigation-tree.json
    ├── amendment-dates.json
    ├── search/documents.json
    └── content/...
```

**Verify generation:**
```bash
# Check that 2027 directory was created
ls -lh apps/web/public/data/2027/

# Check versions.json includes both versions
cat apps/web/public/data/versions.json | jq '.versions[].id'
```

---

### 4. Test Locally

Start the development server and test:

```bash
pnpm dev
```

**Test Checklist:**

- [ ] **Version Selector**
  - Open sidebar
  - Verify dropdown shows both "BC Building Code 2024" and "BC Building Code 2027"
  - Dropdown should be enabled (not disabled)

- [ ] **Switch to 2027**
  - Select "BC Building Code 2027" from dropdown
  - Verify URL updates: `?version=2027`
  - Verify version badge shows "2027"
  - Verify navigation tree loads for 2027
  - Verify content loads for 2027

- [ ] **Search in 2027**
  - Perform a search
  - Verify results are from 2027 version
  - Verify search filters work

- [ ] **Amendment Dates for 2027**
  - Check amendment date dropdown
  - Verify dates are specific to 2027
  - Select a date and verify content updates

- [ ] **Switch Back to 2024**
  - Select "BC Building Code 2024" from dropdown
  - Verify everything switches back correctly
  - Verify no data corruption or errors

- [ ] **URL Handling**
  - Bookmark a 2027 URL: `/code/division-b/part-3?version=2027`
  - Close and reopen bookmark
  - Verify 2027 loads correctly
  - Test browser back/forward buttons

- [ ] **Performance**
  - Measure version switch time (should be < 2 seconds)
  - Check for console errors
  - Check for memory leaks

---

### 5. Commit Changes

Commit the new version to Git:

```bash
# Add source file (if not using Git LFS)
git add data/source/bcbc-2027.json

# Or if using Git LFS for large files
git lfs track "data/source/bcbc-2027.json"
git add .gitattributes
git add data/source/bcbc-2027.json

# Add updated versions.json
git add data/source/versions.json

# Commit
git commit -m "Add BC Building Code 2027

- Added bcbc-2027.json source file
- Updated versions.json to include 2027
- Status: draft
"

# Push
git push origin main
```

**Note:** Generated assets in `apps/web/public/data/` are NOT committed (in .gitignore)

---

### 6. Deploy

Deploy to staging first, then production:

```bash
# Build for production
pnpm build

# Deploy to staging
# (deployment command depends on your infrastructure)

# Test on staging
# - Verify both versions work
# - Verify version switching works
# - Verify search works per version

# Deploy to production
# (deployment command depends on your infrastructure)
```

---

### 7. Announce

Communicate the new version to users:

- Update website announcement banner
- Send email to subscribers
- Post on social media
- Update documentation

**Example announcement:**
> "BC Building Code 2027 (Draft) is now available! Switch between versions using the dropdown in the sidebar. Note: 2027 is a draft version and subject to change."

---

## Changing Default Version

To make 2027 the default version (when it becomes official):

**Edit `data/source/versions.json`:**

```json
{
  "versions": [
    {
      "id": "2024",
      "year": 2024,
      "title": "BC Building Code 2024",
      "sourceFile": "bcbc-2024.json",
      "isDefault": false,  // Changed from true
      "publishedDate": "2024-01-01",
      "status": "archived"  // Changed from current
    },
    {
      "id": "2027",
      "year": 2027,
      "title": "BC Building Code 2027",
      "sourceFile": "bcbc-2027.json",
      "isDefault": true,  // Changed from false
      "publishedDate": "2027-01-01",
      "status": "current"  // Changed from draft
    }
  ]
}
```

**Regenerate assets:**
```bash
pnpm generate-assets
```

**Result:**
- URLs without version parameter now default to 2027
- Version selector shows 2027 first
- 2024 remains available but marked as archived

---

## Removing Old Versions

To remove an old version (e.g., 2021):

1. **Remove from versions.json:**
   ```json
   // Remove the 2021 entry
   ```

2. **Regenerate assets:**
   ```bash
   pnpm generate-assets
   ```

3. **Clean up:**
   ```bash
   # Remove generated assets
   rm -rf apps/web/public/data/2021/
   
   # Optionally remove source file
   rm data/source/bcbc-2021.json
   ```

4. **Deploy:**
   - Version will no longer appear in dropdown
   - Existing bookmarks to 2021 will show 404 or redirect to default

---

## Troubleshooting

### Version doesn't appear in dropdown

**Check:**
- [ ] Source file exists: `ls data/source/bcbc-2027.json`
- [ ] versions.json is valid JSON: `cat data/source/versions.json | jq .`
- [ ] Asset generation succeeded: `ls apps/web/public/data/2027/`
- [ ] versions.json was generated: `cat apps/web/public/data/versions.json | jq .`
- [ ] Browser cache cleared

### Version switch doesn't work

**Check:**
- [ ] Console for errors (F12 → Console)
- [ ] Network tab for failed requests (F12 → Network)
- [ ] Version store is loading versions: Check Redux DevTools
- [ ] Data paths are correct: `/data/2027/navigation-tree.json` should exist

### Search doesn't work for new version

**Check:**
- [ ] Search index generated: `ls apps/web/public/data/2027/search/documents.json`
- [ ] Search index is valid JSON
- [ ] Search client is loading correct index
- [ ] Console for search errors

### Performance issues

**Check:**
- [ ] Asset file sizes: `du -sh apps/web/public/data/2027/`
- [ ] Network tab for slow requests
- [ ] Memory usage in browser DevTools
- [ ] Consider enabling gzip compression on server

---

## Summary

**Adding a new version is simple:**

1. Add source JSON file
2. Update versions.json
3. Run `pnpm generate-assets`
4. Test locally
5. Commit and deploy

**No code changes required!** The infrastructure handles everything automatically.

---

**Last Updated:** 2026-02-03  
**Version:** 1.0
