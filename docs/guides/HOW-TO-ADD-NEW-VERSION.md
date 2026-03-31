# How to Add a New BC Building Code Version

**Guide for adding a new version of BC building code (e.g. 2027)**

---

## Prerequisites

- New BC Building Code JSON file available (e.g., `bcbc-2027.json`) and validated as per the [validation pipeline document](https://github.com/bcgov/BC-Building-Code/blob/develop/docs/VALIDATION_PIPELINE.md) on the BCBC JSON Generation repo 
- Access to the [BCBC Interactive repo](https://github.com/bcgov/HOUS-Interactive-BCBC) 
- Local Git clone + ability to create pull requests and get them merged to the main branch)
- Bash shell  (gitbash or other)
- Node.js installed. npm (or pnpm) and tsx available. 
-  [These instructions](https://github.com/bcgov/HOUS-Interactive-BCBC/blob/develop/docs/guides/COMMANDS.md) may prove useful in setting up your node.js environment

---

## Steps

### 1. Add new version of BCBC json to to local git repo 

Copy the local copy of the new BC Building Code JSON to the source directory:
(assume local copy folder is \$local and the github project root is $gitproj)

```bash
cp $local/bcbc-2027.json $gitproj/data/source/
```


---

### 2. Update versions.json

Edit `$gitproj/data/source/versions.json` to add the new version:

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
      "isDefault": false,
      "publishedDate": "2024-01-01",
      "status": "archived"
    },
    {
      "id": "2027",
      "year": 2027,
      "title": "BC Building Code 2027",
      "sourceFile": "bcbc-2027.json",
      "isDefault": true,
      "publishedDate": "2027-01-01",
      "status": "current"
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

Note that the 2027 file has the `status` of "current" and `isDefault` of "true", while the 2024 file has the `status` of "archived" and the `isDefault` of "false" . These should be set according to the release strategy.  

These  settings manifest themselves in the following way:
- URL's in the BCBC viewer can have a version parameter. The  version with `isDefault` set to true is the version displayed if NO version parameter is present in the URL (this is the default) 
- The`status` field value is not currently exposed in the UI
---

### 3. Generate Assets

Run the asset generation pipeline:

```bash
# Generate assets for all versions
 npm run generate-assets 
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
cat apps/web/public/data/versions.json 
```
should contain both versions as follows
```json
{
  "generatedAt": "2026-03-26T23:00:36.586Z",
  "defaultVersion": "2024",
  "versions": [
    {
      "id": "2024",
      "year": 2024,
      "title": "BC Building Code 2024",
      "isDefault": false,
      "status": "archive",
      "revisionCount": 6,
      "latestRevision": "2025-06-16",
      "dataPath": "/data/2024"
    },
    {
      "id": "2027",
      "year": 2027,
      "title": "BC Building Code 2027",
      "isDefault": true,
      "status": "current",
      "revisionCount": 6,
      "latestRevision": "2027-06-16",
      "dataPath": "/data/2027"
    }  ]
}
```

---

### 4. Test Locally

Start the development server and test:

Use instructions [here](https://github.com/bcgov/HOUS-Interactive-BCBC/blob/develop/docs/guides/COMMANDS.md) to run on your local machine

**Test Checklist:**
- [ ] **Default version** 
  - Navigate to default URL (http://localhost:3000)
  - Verify that the sidebar shows "BC Building Code 2027"
  - Perform a search
  - Verify that the results are from the 2027 version
- [ ] **Version Selector**
  - Open sidebar
  - Verify dropdown shows both "BC Building Code 2024" and "BC Building Code 2027"
  - Dropdown should be enabled (not disabled)

- [ ] **Switch to 2024**
  - Select "BC Building Code 2024" from dropdown
  - Verify URL updates: `?version=2024`
  - Verify version badge shows "2024"
  - Verify navigation tree loads for 2024
  - Verify content loads for 2024
  
- [ ] **Search in 2024**
  - Perform a search
  - Verify results are from 2024 version
  - Verify search filters work

- [ ] **Switch back to 2027**
  - Select "BC Building Code 2027" from dropdown
  - Verify everything switches back correctly
  - Verify no data corruption or errors

- [ ] **Search in 2027**
  - Perform a search
  - Verify results are from 2027 version
  - Verify search filters work

- [ ] **Amendment Dates for 2027**
  - Check amendment date dropdown
  - Verify dates are specific to 2027
  - Select a date and verify content updates

- [ ] **URL Handling**
  - Bookmark a 2027 URL: `/code/division-b/part-3?version=2027`
  - Close and reopen bookmark
  - Verify 2027 loads correctly
  - Test browser back/forward buttons
  - Try the same with 2024 version

- [ ] **Performance**
  - Measure version switch time (should be < 2 seconds)
  - Check for console errors
  - Check for memory leaks

---

### 5. Commit Changes

Commit the new version of the BCBC json file to Git using your git UI / command line , and push to the online repo dev branch (this should be default). Create a pull-request to merge the json file to the main branch.  
**Note** :  Only the bcbc json file (nom. "bcbc-2027.json") and the "versions.json" file should be committed and pushed. The generated assets in  `apps/web/public/data/` are NOT committed (in .gitignore)




### 6. Deploy

Deployment to the dev environment is described in [Deployment](https://github.com/bcgov/HOUS-Interactive-BCBC/blob/develop/docs/deployment/DEPLOYMENT.md).  On successful deployment, run through tests as per 4. again (obviously replacing the "localhost:3000" with the dev URL)

On successful testing, deploy to production environment as per the [Deployment](https://github.com/bcgov/HOUS-Interactive-BCBC/blob/develop/docs/deployment/DEPLOYMENT.md) instructions.


### 7. Announce

Communicate the new version to users:


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

**Last Updated:** 2026-26-03  
**Version:** 1.0
