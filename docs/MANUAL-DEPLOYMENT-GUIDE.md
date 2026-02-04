# Manual Deployment Guide

This guide shows how to manually trigger deployments from any branch using GitHub Actions.

## When to Use Manual Deployments

- **Testing feature branches** before merging to dev
- **Deploying hotfixes** from emergency branches
- **Re-deploying specific versions** for testing
- **Testing changes** without merging to dev branch

## Step-by-Step Instructions

### 1. Navigate to GitHub Actions

Go to your repository on GitHub and click the **Actions** tab.

### 2. Select the Workflow

From the left sidebar, click on **Deploy to Dev** workflow.

### 3. Trigger the Workflow

1. Click the **Run workflow** button (top right, blue button)
2. A dropdown menu will appear with options:

   ```
   Run workflow
   ┌─────────────────────────────────────┐
   │ Use workflow from                   │
   │ Branch: [Select branch ▼]           │
   │                                     │
   │ Image tag to deploy                 │
   │ [latest                          ]  │
   │                                     │
   │ [Run workflow]                      │
   └─────────────────────────────────────┘
   ```

3. **Select your branch** from the dropdown:
   - `dev` (default)
   - `feature/your-feature-name`
   - `bugfix/issue-123`
   - `hotfix/critical-fix`
   - Any custom branch

4. **Enter image tag** (optional):
   - Leave as `latest` to use commit SHA
   - Or enter a custom tag like `v1.2.3`, `PR-123`, etc.

5. Click **Run workflow** button

### 4. Monitor the Deployment

1. The workflow will appear in the workflow runs list
2. Click on the run to see detailed logs
3. Monitor both jobs:
   - **build**: Builds and pushes Docker image
   - **deploy**: Deploys to OpenShift

### 5. Verify Deployment

Once the workflow completes successfully:

```bash
# Check deployment status
oc get pods -n d6af69-dev -l app.kubernetes.io/name=interactive-bcbc-app

# View logs
oc logs -f deployment/interactive-bcbc-app -n d6af69-dev

# Test the application
curl https://interactive-bcbc-app-d6af69-dev.apps.silver.devops.gov.bc.ca/health
```

## Example Scenarios

### Scenario 1: Test Feature Branch

You're working on `feature/new-search` and want to test it in dev:

1. Push your changes to the feature branch
2. Go to Actions → Deploy to Dev → Run workflow
3. Select branch: `feature/new-search`
4. Image tag: `feature-new-search` (or leave as `latest`)
5. Click Run workflow

### Scenario 2: Deploy Hotfix

Critical bug found, need to deploy from `hotfix/urgent-fix`:

1. Create and push hotfix branch
2. Go to Actions → Deploy to Dev → Run workflow
3. Select branch: `hotfix/urgent-fix`
4. Image tag: `hotfix-urgent` (or leave as `latest`)
5. Click Run workflow

### Scenario 3: Re-deploy Specific Version

Need to re-deploy a previous version:

1. Go to Actions → Deploy to Dev → Run workflow
2. Select branch: `dev` (or the branch with the version)
3. Image tag: `abc1234` (the commit SHA you want)
4. Click Run workflow

## Automatic Deployments

For automatic deployments, simply push to the `dev` branch:

```bash
# Merge your feature to dev
git checkout dev
git merge feature/your-feature
git push origin dev
```

The workflow will automatically trigger and deploy.

## Troubleshooting

### Workflow Not Appearing

- Ensure the workflow file exists: `.github/workflows/dev-deploy.yaml`
- Check that you have push access to the repository

### Branch Not in Dropdown

- Ensure the branch exists in the remote repository
- Push your local branch: `git push origin your-branch-name`
- Refresh the GitHub page

### Deployment Fails

1. Check the workflow logs for errors
2. Verify all secrets and variables are configured
3. Check OpenShift pod status: `oc get pods -n d6af69-dev`
4. Review pod logs: `oc logs -f deployment/interactive-bcbc-app -n d6af69-dev`

## Best Practices

1. **Use descriptive image tags** for manual deployments (e.g., `feature-search-v2`, `hotfix-nav`)
2. **Test locally first** with Docker before deploying
3. **Monitor the deployment** until it completes successfully
4. **Verify the application** works after deployment
5. **Clean up test deployments** if you deployed from temporary branches

## Related Documentation

- [DEPLOYMENT-QUICKSTART.md](./DEPLOYMENT-QUICKSTART.md) - Quick reference commands
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Complete deployment guide
- [DEPLOYMENT-SETUP-SUMMARY.md](./DEPLOYMENT-SETUP-SUMMARY.md) - Setup summary
