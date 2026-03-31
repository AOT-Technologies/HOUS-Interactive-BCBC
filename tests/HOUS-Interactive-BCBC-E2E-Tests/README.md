# Interactive BC Building Code – E2E Test Suite

## Overview
This project contains an **End-to-End (E2E) automated test suite** for the **Interactive BC Building Code** web interface.

It validates key user flows and interactive UI behavior to help prevent regressions and ensure the application works as expected from an end-user perspective.

## Tech Stack
- **.NET 10**
- **NUnit**
- **Microsoft Playwright for .NET**

## Configuration

### Environment Variables
The test suite requires the following environment variable:

| Variable  | Description                                |
|-----------|--------------------------------------------|
| `BASE_URL`| Base URL of the TEST Interactive BCBC site |

## Installing Playwright Browsers

Playwright requires browser binaries to be installed. Browser installation only needs to be done once.
From the test project folder (or after building once), run:

dotnet tool restore
dotnet playwright install

On Linux CI environments:
dotnet playwright install --with-deps

## Running Tests

dotnet test tests/HOUS-Interactive-BCBC-E2E-Tests/HOUS-Interactive-BCBC-2E2-Tests.csproj