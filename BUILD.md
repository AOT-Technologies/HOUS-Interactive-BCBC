# HOUS-INTERACTIVE-BCBC BUILD INSTRUCTIONS

### Introduction

There is a great deal of documentation on the software architecture, packages, deployment, reference guides and more under the [docs](docs) folder in this repo. This BUILD.md document describes the most common tasks likely to be performed as part of routine maintenance. More detailed needs (such as fixing a complex bug or adding a new feature) would benefit from the more detailed documentation mentioned

### Common maintenance tasks

#### New features / bugfixes in the viewer

Once it has been established that the change required is part of the software package used for rendering the BCBC JSON and NOT the BCBC JSON source and associated assets which are on the [BCBC JSON repository](https://github.com/bcgov/BC-Building-Code) , the documents under [docs\architecture](docs\architecture) , [docs\guides](docs\guides) and [docs\reference](ocs\reference)  are useful to understand the code and where changes could  be made

For building and deployment of these changes see [Branching and deployent Strategy](#branching-and-deployment-strategy)  below

#### New amendments or bugfixes in the BCBC JSON or assets

If there are changes to any files on the [BCBC JSON repository](https://github.com/bcgov/BC-Building-Code) they need to be managed in the repository and copied / merged across into this repository. This is described in the [BCBC JSON repository BUILD document](https://github.com/bcgov/BC-Building-Code/blob/develop/BUILD.md)

Again it is necessary to build and deploy as described in [Branching and deployent Strategy](#branching-and-deployment-strategy) . 

#### New BCBC Version

This is the case where an entirely new version of BCBC JSON is created and deployed in parallel with the existing one. This process is documented in detail in [docs\guides\HOW-TO-ADD-NEW-VERSION.md](docs\guides\HOW-TO-ADD-NEW-VERSION.md)

Subsequently it is necessary to build and deploy as described in see [Branching and deployent Strategy](#branching-and-deployment-strategy) 

### Branching and deployment strategy

There are nominally 2 code branches, ```develop``` and ```main ``` . All development work is performed in a branch taken off ```develop``` , typically using the issue number or some combination thereof.  It is expected that local development is undertaken and tested before the branch is merged to the ```develop``` branch as a pull request. Instructions, commands and dependencies needed to build locally on your local system can be found  [here](https://github.com/bcgov/HOUS-Interactive-BCBC/blob/develop/docs/guides/COMMANDS.md)


On raising a PR to ```develop```, an initial build is done of the system as a sanity check - this is through an automatic github action "PR Build Validation".   On committing the PR to the ```develop``` branch, an automatic build-and-deployment to the dev Openshift instance is performed by github action "Deploy to Dev".

The URL's for the dev, test and prod instances are :

DEV[ https://dev.buildingcode.gov.bc.ca](https://dev.buildingcode.gov.bc.ca)
TEST[ https://test.buildingcode.gov.bc.ca  ](https://test.buildingcode.gov.bc.ca)
PROD[ https://buildingcode.gov.bc.ca](https://buildingcode.gov.bc.ca)

After some testing in the Dev environment, the ```develop``` branch can also be deployed to the test Openshift instance if desired. In most cases this is probably not needed, but it is a possiblity. It is also a possibility to create a ```test``` branch, and merge the code from dev to this branch before deploying to test. These could be easily added to the process if it was found to be needed - currently it is not. 

The final step is the merge to the ```main``` branch. Best practice is to always have the latest version on the production service reflected on the ```main``` branch. Build and deployment are both manual through github actions. 

For more information on the automated and manual deployment capabilities of this repo, see [docs\deployment\DEPLOYMENT.md](docs\deployment\DEPLOYMENT.md) and [docs\deployment\MANUAL-DEPLOYMENT-GUIDE.md](docs\deployment\MANUAL-DEPLOYMENT-GUIDE.md)

#### Automated test suites

As part of the deployment it is highly recommended to run the automated test suites.  These are found in the folder [tests](tests) on this repo, and can be run by manually running github action E2E Tests. 

