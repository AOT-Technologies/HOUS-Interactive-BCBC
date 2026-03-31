# Deployment Guide

This document describes how to deploy the BC Building Code Interactive Web Application to OpenShift.

## Prerequisites

- Access to BC Government OpenShift Silver cluster
- Artifactory credentials for container registry
- OpenShift service account token with deployment permissions
- Helm 3.x installed (for local deployments)

## Architecture

The application is deployed as a static Next.js site served by Nginx:

```
┌─────────────────┐
│  GitHub Actions │
│   (CI/CD)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Artifactory    │
│  (Container     │
│   Registry)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  OpenShift      │
│  (Silver)       │
│  - Deployment   │
│  - Service      │
│  - Route        │
└─────────────────┘
```

## Build Process

The Docker build process:

1. **Build Stage** (Node.js 20 Alpine):
   - Install pnpm and dependencies
   - Copy source data (`data/source/`)
   - Generate search indexes and content chunks (`pnpm generate-assets`)
   - Build Next.js static export (`pnpm build`)
   - Output: `apps/web/out/` directory

2. **Production Stage** (Nginx 1.25 Alpine):
   - Copy custom nginx configuration
   - Copy static assets from build stage
   - Expose port 8080 (OpenShift non-root requirement)
   - Health check endpoint at `/health`

## GitHub Actions Workflow

### Triggers

- **Automatic**: Push to `dev` branch
- **Manual**: `workflow_dispatch` from any branch with optional image tag

#### Manual Deployment from Any Branch

The workflow supports manual deployment from **any branch**:

1. Navigate to **Actions** tab in GitHub
2. Select **Deploy to Dev** workflow
3. Click **Run workflow** button
4. **Select your branch** from the dropdown (e.g., `feature/new-search`, `bugfix/fix-123`)
5. Optionally enter a custom image tag (defaults to commit SHA)
6. Click **Run workflow**

This allows you to:
- Test feature branches in dev environment before merging
- Deploy hotfixes from any branch
- Re-deploy specific versions

### Jobs

1. **Build Job**:
   - Checkout code
   - Set image tag (commit SHA or manual input)
   - Build Docker image with Buildx
   - Push to Artifactory with tags: `{tag}` and `latest`
   - Use GitHub Actions cache for faster builds

2. **Deploy Job**:
   - Install OpenShift CLI
   - Login to OpenShift cluster
   - Deploy using Helm with environment-specific values

### Required Secrets

Configure these in GitHub repository settings:

| Secret | Description |
|--------|-------------|
| `ARTIFACTORY_USERNAME` | Artifactory username |
| `ARTIFACTORY_PASSWORD` | Artifactory password/token |
| `ARTIFACTORY_REPOSITORY_NAME` | Artifactory repository name |
| `OPENSHIFT_SERVICEACCOUNT_TOKEN` | OpenShift service account token |
| `OPENSHIFT_SERVER` | OpenShift API server URL |
| `IMAGE_PULL_SECRET_NAME` | OpenShift image pull secret name |

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `ARTIFACTORY_URL` | Artifactory registry URL | `artifacts.developer.gov.bc.ca` |
| `OPENSHIFT_NAMESPACE` | OpenShift namespace | `d6af69-dev` |

## Helm Chart

### Structure

```
charts/interactive-bcbc-app/
├── Chart.yaml              # Chart metadata
├── values.yaml             # Default values
├── values-dev.yaml         # Dev environment overrides
└── templates/
    ├── deployment.yaml     # Deployment manifest
    ├── service.yaml        # Service manifest
    ├── route.yaml          # OpenShift route
    └── _helpers.tpl        # Template helpers
```

### Configuration

**Default Values** (`values.yaml`):
- Base configuration for all environments
- Resource limits: 500m CPU, 512Mi memory
- Health check endpoints
- Service port: 8080

**Dev Environment** (`values-dev.yaml`):
- Namespace: `d6af69-dev`
- Route host: `interactive-bcbc-app-d6af69-dev.apps.silver.devops.gov.bc.ca`
- TLS edge termination
- Single replica (no autoscaling)

### Deployment Command

```bash
helm upgrade --install interactive-bcbc-app ./charts/interactive-bcbc-app \
  -f ./charts/interactive-bcbc-app/values-dev.yaml \
  --set image.repository=<artifactory-url>/<repo>/interactive-bcbc-app \
  --set image.tag=<tag> \
  --set imagePullSecrets[0].name=<secret-name> \
  --namespace d6af69-dev
```

## Local Development

### Build Docker Image Locally

```bash
# Build the image
docker build -t interactive-bcbc-app:local .

# Run locally
docker run -p 8080:8080 interactive-bcbc-app:local

# Or use docker-compose
docker-compose up
```

### Test Locally

```bash
# Access the application
open http://localhost:8080

# Check health endpoint
curl http://localhost:8080/health
```

## Nginx Configuration

The application uses a custom Nginx configuration (`nginx.conf`):

- **Port**: 8080 (OpenShift non-root requirement)
- **SPA Routing**: All routes serve `index.html`
- **Static Asset Caching**: 1 year for JS/CSS/images
- **HTML No-Cache**: Prevent stale HTML
- **Gzip Compression**: Enabled for text assets
- **Security Headers**: X-Frame-Options, X-Content-Type-Options, X-XSS-Protection
- **Health Check**: `/health` endpoint returns 200 OK

## Monitoring

### Health Checks

- **Liveness Probe**: `/health` endpoint, 30s interval
- **Readiness Probe**: `/health` endpoint, 10s interval

### Logs

```bash
# View pod logs
oc logs -f deployment/interactive-bcbc-app -n d6af69-dev

# View nginx access logs
oc exec deployment/interactive-bcbc-app -n d6af69-dev -- tail -f /tmp/access.log

# View nginx error logs
oc exec deployment/interactive-bcbc-app -n d6af69-dev -- tail -f /tmp/error.log
```

### Resource Usage

```bash
# Check pod resource usage
oc top pod -n d6af69-dev -l app.kubernetes.io/name=interactive-bcbc-app

# Describe deployment
oc describe deployment interactive-bcbc-app -n d6af69-dev
```

## Troubleshooting

### Build Failures

**Issue**: Docker build fails during asset generation
```bash
# Check if source data exists
ls -lh data/source/bcbc-*.json

# Test asset generation locally
pnpm generate-assets
```

**Issue**: Out of memory during build
```bash
# Increase Docker memory limit
# Docker Desktop: Settings > Resources > Memory > 8GB+
```

### Deployment Failures

**Issue**: Image pull errors
```bash
# Verify image exists in Artifactory
# Check imagePullSecrets are configured correctly
oc get secrets -n d6af69-dev
```

**Issue**: Pod crashes or restarts
```bash
# Check pod logs
oc logs -f deployment/interactive-bcbc-app -n d6af69-dev

# Check pod events
oc describe pod -l app.kubernetes.io/name=interactive-bcbc-app -n d6af69-dev
```

**Issue**: Health checks failing
```bash
# Test health endpoint from within pod
oc exec deployment/interactive-bcbc-app -n d6af69-dev -- wget -O- http://localhost:8080/health

# Check nginx error logs
oc exec deployment/interactive-bcbc-app -n d6af69-dev -- cat /tmp/error.log
```

### Route Issues

**Issue**: Route not accessible
```bash
# Check route configuration
oc get route interactive-bcbc-app -n d6af69-dev -o yaml

# Verify route host
oc get route interactive-bcbc-app -n d6af69-dev -o jsonpath='{.spec.host}'
```

## Manual Deployment

For manual deployments without GitHub Actions:

```bash
# 1. Build and push image
docker build -t <artifactory-url>/<repo>/interactive-bcbc-app:manual .
docker push <artifactory-url>/<repo>/interactive-bcbc-app:manual

# 2. Login to OpenShift
oc login --token=<token> --server=<server>
oc project d6af69-dev

# 3. Deploy with Helm
helm upgrade --install interactive-bcbc-app ./charts/interactive-bcbc-app \
  -f ./charts/interactive-bcbc-app/values-dev.yaml \
  --set image.repository=<artifactory-url>/<repo>/interactive-bcbc-app \
  --set image.tag=manual \
  --set imagePullSecrets[0].name=<secret-name>
```

## Rollback

```bash
# List Helm releases
helm list -n d6af69-dev

# View release history
helm history interactive-bcbc-app -n d6af69-dev

# Rollback to previous version
helm rollback interactive-bcbc-app -n d6af69-dev

# Rollback to specific revision
helm rollback interactive-bcbc-app <revision> -n d6af69-dev
```

## Current Environment

This project is currently configured for **dev environment only**:
- Namespace: `d6af69-dev`
- Route: `interactive-bcbc-app-d6af69-dev.apps.silver.devops.gov.bc.ca`
- Single replica (no autoscaling)
- Resource limits: 500m CPU, 512Mi memory

## Security Considerations

- **Non-root Container**: Nginx runs as non-root user (OpenShift requirement)
- **Read-only Filesystem**: Consider adding read-only root filesystem
- **Security Context**: Drops all capabilities, prevents privilege escalation
- **TLS Termination**: Edge termination at OpenShift route level
- **Image Scanning**: Scan images for vulnerabilities before deployment
- **Secrets Management**: Use OpenShift secrets for sensitive data

## Performance Optimization

- **Docker Build Cache**: GitHub Actions cache speeds up builds
- **Multi-stage Build**: Reduces final image size (~50MB)
- **Gzip Compression**: Reduces bandwidth usage
- **Static Asset Caching**: 1-year cache for immutable assets
- **CDN**: Consider CloudFront or similar for production

## Next Steps

1. Set up GitHub secrets and variables
2. Configure OpenShift namespace and service account
3. Create image pull secret in OpenShift
4. Run initial deployment via GitHub Actions
5. Verify application is accessible via route
6. Set up monitoring and alerting
