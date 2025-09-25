import { context } from "@actions/github";

import { makeRe } from "minimatch";

import type { IssueWrapper } from "./issue";
import type { ProjectField } from "./project-fields";

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

  // There is no way to exclude a title
  private titleFilters: RegExp[] = [];

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
          // Resolve metavariables - like dates, @me, other special values
          if (v === "@me") {
            return context.actor;
          }

          if (v.startsWith("@today")) {
            // There might be other date syntaxes I'm missing
            const today = new Date();
            const rest = v.split("@today-")[1]?.trim();

            let days = 0;
            if (rest) {
              // Calculate number of days (e.g., @today-7d, @today-1m, @today-1y)
              if (rest.endsWith("d")) {
                days = parseInt(rest.slice(0, -1));
              }
              if (rest.endsWith("w")) {
                const weeks = parseInt(rest.slice(0, -1));
                days = weeks * 7; // Convert weeks to days
              }
              if (rest.endsWith("m")) {
                const months = parseInt(rest.slice(0, -1));
                days = months * 30; // Approximate month as 30 days
              }
              if (rest.endsWith("y")) {
                const years = parseInt(rest.slice(0, -1));
                days = years * 365; // Approximate year as 365 days
              }
            }

            const date = new Date();
            date.setDate(today.getDate() - days);
            return date.toISOString().split("T")[0]; // Return as YYYY-MM-DD
          }

          return v; // Return as is for other values
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

  get projectFields(): string[] {
    const defaultFields = ProjectView.defaultFields();
    return this.filters
      .map((f) => f.key)
      .filter((key) => {
        return !defaultFields.includes(key);
      });
  }

  get needsProjectFields(): boolean {
    return this.projectFields.length > 0;
  }

  // Helpers
  filter(issue: IssueWrapper): boolean {
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

    // Custom Fields
    if (!this.checkProjectFields(issue)) {
      return false;
    }

    // TODO: Handle Issue Fields when they are released

    return true;
  }

  checkFilters(filterName: string, values: string[]): boolean {
    const filters = this.filters.filter((f) => f.key === filterName);

    for (const filter of filters) {
      const { values: filterValues, exclude } = filter;

      if (values.length === 0) {
        continue;
      }

      // If any value matches (OR), it's a match
      const filterMatches = filterValues.some((value) =>
        values.includes(value),
      );

      if (exclude && filterMatches) {
        // If any value matches, exclude the issue
        return false;
      }
      if (!exclude && !filterMatches) {
        // At least one value must match
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

    const dateString = date.toISOString().split("T")[0] as string; // Format as YYYY-MM-DD

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

  checkProjectField(
    fieldName: string,
    field: ProjectField | undefined,
  ): boolean {
    let values: Array<string> = [];
    if (!field) {
      values = [];
    } else if (field.kind === "SingleSelect") {
      values = field.value ? [field.value] : [];
    } else if (field.kind === "MultiSelect") {
      values = field.values ?? [];
    } else if (field.kind === "Date") {
      // For Date filters, the format is:
      //   date:>=2025-06-16 or date:<=2025-06-22
      return this.checkDateFilters(fieldName, field.date);
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

  checkProjectFields(issue: IssueWrapper): boolean {
    for (const field of this.projectFields) {
      const value = issue._projectFields?.get(field);
      if (!this.checkProjectField(field, value)) {
        return false;
      }
    }

    return true;
  }

  static defaultFields(): string[] {
    return [
      // Supported fields
      "is",
      "title",
      "type",
      "repository",
      "assignee",
      "label",
      "updated",

      // TODO: Add unsupported fields
      "linked-pull-requests",
      "milestone",
      "reviewers",
      "parent-issue", // This one is easy
      "sub-issues-progress",
      // Boolean modifiers which take a field name
      "no",
      "has",
    ];
  }
}
