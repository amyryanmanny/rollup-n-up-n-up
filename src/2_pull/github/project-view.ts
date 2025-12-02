import { context } from "@actions/github";

import { makeRe } from "minimatch";

import { formatDateAsYYYYMMDD } from "@util/date";

import type { IssueWrapper } from "./issue";
import type { Field } from "./fields";

type ProjectViewParameters = {
  name?: string;
  projectNumber: number;
  number?: number;
  filterQuery: string;
};

type Filter = {
  key: string;
  values: string[];
  exclude: boolean;
};

export class ProjectView {
  private params: ProjectViewParameters;

  private filters = new Array<Filter>();
  private titleFilters: RegExp[] = []; // There is no way to exclude a title

  constructor(params: ProjectViewParameters) {
    this.params = params;

    // Parse the filter string
    // Split on spaces unless they're inside quotes
    const matches = params.filterQuery.match(/(?:[^\s"]+|"[^"]*")+/g);
    if (!matches) {
      return;
    }

    // A filter can appear multiple times in the same query
    // This is distinct from one filter with CSV
    // e.g. "label:bug,enhancement" is an OR
    //      "label:bug" "label:enhancement" is an AND

    matches.forEach((f) => {
      const pieces = f.split(":").map((s) => s.trim());

      let key = pieces[0];
      if (!key) return;

      const valuesCsv = pieces[1];

      if (!valuesCsv || key === "title") {
        // No colon means it's a title filter
        const regex = makeRe(key);
        if (!regex) {
          throw new Error(`Invalid title filter: ${key}`);
        }
        this.titleFilters.push(regex);
        return;
      }

      let exclude = false;
      if (key.startsWith("-")) {
        exclude = true;
        key = key.slice(1); // Remove leading dash
      }

      const values = valuesCsv
        .split(",")
        .map((v) => {
          // Remove double quotes - single quotes are invalid in GitHub UI
          if (v.startsWith('"') && v.endsWith('"')) {
            v = v.slice(1, -1);
          }
          return v.trim();
        })
        .map((v) => {
          // Resolve metavariables - like @me, @today, etc.
          if (v === "@me") {
            return context.actor;
          }

          if (v.includes("@today")) {
            const today = new Date();
            const pieces = v.split("@today").map((s) => s.trim());

            const comparator = pieces[0]; // Could be >=, <=, =
            if (comparator === "") {
              throw new Error(
                `Missing @today comparator in Project View filter: ${v}`,
              );
            } else if (
              comparator !== ">=" &&
              comparator !== "<=" &&
              comparator !== "="
            ) {
              throw new Error(
                `Invalid @today comparator in Project View filter: ${v}`,
              );
            }

            let rest = pieces[1]; // Could be +7d, -1m, etc.

            let days = 0;
            let subtract = false;

            if (rest) {
              // Determine sign and remove it
              if (!rest.startsWith("-")) {
                subtract = true;
              } else if (rest.startsWith("+")) {
                subtract = false;
              } else {
                throw new Error(
                  `Invalid @today operator (use "+" or "-") in Project View filter: ${v}`,
                );
              }
              rest = rest.slice(1);

              // Calculate number of days (e.g., -7d, -1m, +1y)
              const numberOf = parseInt(rest.slice(0, -1));
              if (isNaN(numberOf)) {
                throw new Error(
                  `Invalid @today operand in Project View filter: ${v}`,
                );
              }
              if (rest.endsWith("d")) {
                days = numberOf;
              }
              if (rest.endsWith("w")) {
                days = numberOf * 7; // Convert weeks to days
              }
              if (rest.endsWith("m")) {
                days = numberOf * 30; // Approximate month as 30 days
              }
              if (rest.endsWith("y")) {
                days = numberOf * 365; // Approximate year as 365 days
              } else {
                throw new Error(
                  `Invalid @today time unit (use "d", "w", "m", or "y") in Project View filter: ${v}`,
                );
              }
            }

            const date = new Date();
            if (subtract) {
              date.setDate(today.getDate() - days);
            } else {
              date.setDate(today.getDate() + days);
            }

            return comparator + formatDateAsYYYYMMDD(date);
          }

          return v; // Return as-is for any other values
        }) as string[];

      this.filters.push({ key, values, exclude });
    });
  }

  // Properties
  get name(): string | undefined {
    return this.params.name;
  }

  get projectNumber(): number {
    return this.params.projectNumber;
  }

  get number(): number | undefined {
    return this.params.number;
  }

  get filterQuery(): string {
    return this.params.filterQuery;
  }

  // Filter Introspection
  get customFieldNames(): string[] {
    // A union of ProjectFields and IssueFields
    // Not necessary to distinguish between the two within Project Views, since they're handled the same way,
    //   and will be removed when Project Views are queryable with GraphQL anyway
    const defaultFields = ProjectView.defaultFields;
    return this.filters
      .map((f) => f.key)
      .filter((key) => {
        return !defaultFields.includes(key);
      });
  }

  get usesCustomFields(): boolean {
    return this.customFieldNames.length > 0;
  }

  get unsupportedFields(): string[] {
    const unsupported = ProjectView.unsupportedDefaultFields;
    return this.filters
      .map((f) => f.key)
      .filter((key) => unsupported.includes(key));
  }

  get usesUnsupportedFields(): boolean {
    return this.unsupportedFields.length > 0;
  }

  // Apply the View's filters to an Issue
  filterIssue(issue: IssueWrapper): boolean {
    // Default Fields
    if (!this.checkOpen(issue)) {
      return false;
    }
    if (!this.checkTitle(issue)) {
      return false;
    }
    if (!this.checkType(issue)) {
      return false;
    }
    if (!this.checkRepo(issue)) {
      return false;
    }
    if (!this.checkAssignees(issue)) {
      return false;
    }
    if (!this.checkLabels(issue)) {
      return false;
    }
    if (!this.checkUpdated(issue)) {
      return false;
    }

    if (!this.checkCustomFields(issue)) {
      return false;
    }

    return true;
  }

  // Filtering
  checkFilters(filterName: string, inputValues: string[]): boolean {
    const filters = this.filters.filter((f) => f.key === filterName);

    for (const filter of filters) {
      const { values: filterValues, exclude } = filter;

      if (filterValues.length === 0) {
        // Nothing to check
        continue;
      }

      // If any value matches (OR), it's a match
      const filterMatches = filterValues.some((value) =>
        inputValues.includes(value),
      );

      if (exclude && filterMatches) {
        // If any value matches, exclude the issue
        return false;
      }
      if (!exclude && !filterMatches) {
        // If no value matches, exclude the issue
        return false;
      }
    }

    return true;
  }

  checkDateFilters(filterName: string, date: Date | null): boolean {
    // Check if the date is within the range specified in the filter
    const filters = this.filters.filter((f) => f.key === filterName);

    if (!filters || filters.length === 0) {
      return true; // No filter means all dates are valid
    } else if (date === null) {
      return false; // Null dates are not valid
    }

    // For Date filters, the format is:
    //   date:>=2025-06-16 or date:<=2025-06-22
    const dateString = formatDateAsYYYYMMDD(date);

    for (const f of filters) {
      const condition = f.values[0]; // TODO: Support OR date conditions
      if (!condition) {
        continue;
      }
      if (condition.startsWith(">=")) {
        const targetDate = condition.slice(2).trim();
        if (dateString < targetDate) {
          return false;
        }
      } else if (condition.startsWith("<=")) {
        const targetDate = condition.slice(2).trim();
        if (dateString > targetDate) {
          return false;
        }
      } else if (condition.startsWith("=")) {
        const targetDate = condition.slice(1).trim();
        if (dateString !== targetDate) {
          return false;
        }
      }
    }

    return true;
  }

  checkField(fieldName: string, field: Field | undefined): boolean {
    let values: Array<string> = [];
    switch (field?.kind) {
      case "Text":
      case "SingleSelect":
      case "Number":
        if (field.value) {
          values = [String(field.value)];
        }
        break;
      case "MultiSelect":
        values = field.values ?? [];
        break;
      case "Date":
        return this.checkDateFilters(fieldName, field.date);
      case undefined:
      case null:
      default:
        values = [];
        break;
    }

    return this.checkFilters(fieldName, values);
  }

  checkOpen(issue: IssueWrapper): boolean {
    return this.checkFilters("is", [issue.isOpen ? "open" : "closed"]);
  }

  checkTitle(issue: IssueWrapper): boolean {
    const title = issue.title;
    for (const filter of this.titleFilters) {
      if (!filter.test(title)) {
        return false;
      }
    }
    return true;
  }

  checkType(issue: IssueWrapper): boolean {
    return this.checkFilters("type", [issue.type]);
  }

  checkRepo(issue: IssueWrapper): boolean {
    return this.checkFilters("repo", [issue.repoNameWithOwner]);
  }

  checkAssignees(issue: IssueWrapper): boolean {
    return this.checkFilters("assignee", issue.assignees);
  }

  checkLabels(issue: IssueWrapper): boolean {
    return this.checkFilters("label", issue.labels);
  }

  checkUpdated(issue: IssueWrapper): boolean {
    return this.checkDateFilters("updated", issue.updatedAt);
  }

  checkCustomFields(issue: IssueWrapper): boolean {
    for (const fieldName of this.customFieldNames) {
      // These names can technically collide, since they get sluggified
      // But I think it's safe to short circuit
      const field =
        issue._projectFields?.get(fieldName) ||
        issue._issueFields?.get(fieldName);
      if (!this.checkField(fieldName, field)) {
        return false;
      }
    }

    return true;
  }

  // Static
  static slugifyFieldName(field: string): string {
    // RoB Area FY25Q4 -> rob-area-fy25q4
    // Since slugs are not accessible with GraphQL
    return field.toLowerCase().replace(/\s+/g, "-");
  }

  static get defaultFields(): string[] {
    return [
      // Supported fields
      "is",
      "title",
      "type",
      "repository",
      "assignee",
      "label",
      "updated",
      ...this.unsupportedDefaultFields,
    ];
  }

  static get unsupportedDefaultFields(): string[] {
    return [
      "linked-pull-requests",
      "milestone",
      "reviewers",
      "parent-issue", // TODO: This one is easy
      "sub-issues-progress",
      // Boolean modifiers which take a field name
      "no",
      "has",
    ];
  }
}
