\# BC Building Code – JSON Content Validation Test Suite





\## Overview



This project contains an automated \*\*content validation test suite\*\* for the  \*\*BC Building Code JSON file\*\*.



The purpose of this suite is to verify the reference consistency of the generated JSON representation of the BC Building Code.



These tests serve as a \*\*quality gate\*\* to ensure that the JSON generation pipeline produces valid and consistent output.



---



\## What This Suite Validates



The test suite may validate:



\- Internal reference integrity  

\- External reference formatting  

\- Missing or broken IDs  

\- Duplicate identifiers  

\- Structural consistency  

\- Regression against a Golden reference  



The goal is to detect content-level issues early and automatically.



---



\## Tech Stack



\- \*\*.NET 10\*\*

\- \*\*xUnit\*\*



---



\## Configuration



\### Input JSON File - Environment Variable



The tests require access to the BC Building Code JSON file.



| Variable     | Description                                 |

|-------------|----------------------------------------------|

| `BCBC\_JSON\_PATH` | Path to the BC Building Code JSON file  |





\### Running the Tests



dotnet test --configuration Release



