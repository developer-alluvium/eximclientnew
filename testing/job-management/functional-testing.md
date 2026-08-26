# Functional Testing - Job Management

## Overview & Scope
- **Module:** Job Management
- **Testing Type:** Functional Testing
- **Objective:** Track and document Functional Testing test cases and reported bugs for the Job Management module.

---

## Test Cases

| Case ID | Test Scenario | Preconditions | Steps | Expected Result | Status |
| --- | --- | --- | --- | --- | --- |
| TC-001 | Verify core functionality of Job Management | Precondition details | 1. Step 1<br>2. Step 2 | Expected behavior | Pending |

---

## Reported Bugs

| Bug ID | Description | Severity | Status | Reported Date |
| --- | --- | --- | --- | --- |
| BUG-001 | ICD Code & Status filters fail to filter jobs, displaying all client jobs | High | Open | 2026-08-26 |
| BUG-002 | Exporter filter is not working on Client Jobs view | High | Open | 2026-08-26 |

---

## Bug Details

### BUG-001: ICD Code & Status Filters Fail to Filter Jobs and Return All Client Jobs
- **Module:** Job Management
- **Severity:** High
- **Priority:** High
- **Status:** Open
- **Description:** When applying filters such as ICD Code (e.g., ICD SACHANA, ICD KHODIYAR) or Status filter on the Jobs dashboard/client view, the filter parameters fail to restrict the job list, causing all jobs of the selected client to be displayed.
- **Steps to Reproduce:**
  1. Navigate to the **Jobs** tab / Client Jobs View.
  2. Select an ICD Code from the filter dropdown (e.g., `ICD SACHANA` or `ICD KHODIYAR`).
  3. Select a Status filter (e.g., `Pending` / `Completed` / specific status option).
  4. Observe the displayed job results in the table.
- **Expected Result:** The jobs table should display only jobs matching the selected ICD Code and Status filter for the client.
- **Actual Result:** The filter is ignored or overridden, returning all jobs belonging to the client regardless of the selected filters.
- **Additional Notes:** Screenshot captured on 2026-08-26 showing ICD filter set to `ICD SACHANA` while returning jobs from other ICD ports (e.g., ICD SANAND). Backend search API query parameters or frontend filter state mapping should be checked.

### BUG-002: Exporter Filter Not Working / Failing to Filter Jobs
- **Module:** Job Management
- **Severity:** High
- **Priority:** High
- **Status:** Open
- **Description:** Selecting an exporter from the Exporter filter dropdown (e.g. `All Exporters`) on the Client Jobs view does not filter the job list by the selected exporter.
- **Steps to Reproduce:**
  1. Open the Client Jobs View (e.g., *Rajputana Stainless Limited*).
  2. Click on the Exporters filter dropdown (showing `All Exporters`).
  3. Select a specific Exporter (e.g., *TSR Resource GmbH & Co. KG* or *Nirvana Unique General Trading LLC*).
  4. Observe the job rows rendered in the table.
- **Expected Result:** The table should display only jobs belonging to the selected Exporter.
- **Actual Result:** The Exporter filter selection fails to filter the dataset, displaying jobs for all exporters.
- **Additional Notes:** Screenshot captured on 2026-08-26 showing `All Exporters` dropdown filter control. Frontend state change listener or backend query binding for exporter filtering should be inspected.


