import { context } from "@actions/github";

import { DefaultDict } from "@util/collections";
import { getOctokit } from "@util/octokit";

import type { IssueField } from "./graphql/project";
import type { IssueWrapper } from "./issue";

export type GetProjectViewParameters = {
  organization: string;
  projectNumber: number;
  projectViewNumber?: number;
  customQuery?: string;
};

type ProjectViewParameters = {
  name?: string;
  number?: number;
  filterQuery: string;
};

export class ProjectView {
  private params: ProjectViewParameters;

  private filters: DefaultDict<string, string[]>;
  private excludeFilters: DefaultDict<string, string[]>;

  constructor(params: ProjectViewParameters) {
    this.params = params;

    this.filters = new DefaultDict<string, string[]>(() => []);
    this.excludeFilters = new DefaultDict<string, string[]>(() => []);

    // Parse the filter string
    // Split on spaces unless they're inside quotes
    const matches = params.filterQuery.match(/(?:[^\s"]+|"[^"]*")+/g);
    if (!matches) {
      return;
    }

    matches.forEach((f) => {
      const [key, valueStr] = f.split(":").map((s) => s.trim());
      if (!key || !valueStr) {
        // Skip if the key or value is missing
        return;
      }

      const values = valueStr
        .split(",")
        .map((v) => {
          // Remove quotes from the value
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
                days = parseInt(rest.slice(0, -1), 10);
              }
              if (rest.endsWith("w")) {
                const weeks = parseInt(rest.slice(0, -1), 10);
                days = weeks * 7; // Convert weeks to days
              }
              if (rest.endsWith("m")) {
                const months = parseInt(rest.slice(0, -1), 10);
                days = months * 30; // Approximate month as 30 days
              }
              if (rest.endsWith("y")) {
                const years = parseInt(rest.slice(0, -1), 10);
                days = years * 365; // Approximate year as 365 days
              }
            }

            const date = new Date();
            date.setDate(today.getDate() - days);
            return date.toISOString().split("T")[0]; // Return as YYYY-MM-DD
          }

          return v; // Return as is for other values
        });

      if (key.startsWith("-")) {
        // Exclude filter
        const eKey = key.slice(1); // Remove the leading dash
        this.excludeFilters.get(eKey).push(...values);
      } else {
        // Regular filter
        this.filters.get(key).push(...values);
      }
    });
  }

  // Properties
  get name(): string | undefined {
    return this.params.name;
  }

  get number(): number | undefined {
    return this.params.number;
  }

  get filterQuery(): string {
    return this.params.filterQuery;
  }

  get customFields(): string[] {
    const defaultFields = ProjectView.defaultFields();
    return Array.from([
      ...this.filters.keys(),
      ...this.excludeFilters.keys(),
    ]).filter((key) => {
      return !defaultFields.includes(key);
    });
  }

  // Helpers
  getFilterType(): string[] | undefined {
    return this.filters.get("type");
  }

  filter(issue: IssueWrapper): boolean {
    // First check against default fields
    if (!this.checkType(issue.type)) {
      return false;
    }

    if (!this.checkRepo(issue.repoNameWithOwner)) {
      return false;
    }

    if (!this.checkAssignees(issue.assignees)) {
      return false;
    }

    // Next check against all the custom Project Fields
    for (const field of this.customFields) {
      const value = issue._projectFields.get(field);
      if (!this.checkField(field, value)) {
        return false;
      }
    }

    return true;
  }

  checkField(fieldName: string, field: IssueField | undefined): boolean {
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
      return this.checkDateField(fieldName, field.date);
    }

    const included = this.filters.get(fieldName);
    const excluded = this.excludeFilters.get(fieldName);

    if (values.some((value) => excluded.some((f) => f === value))) {
      return false; // At least one value is excluded
    }

    // If there are no inclusion filters, all values are valid
    if (included.length === 0) {
      return true;
    }

    // Return whether at least one value is included
    return values.some((value) => included.some((f) => f === value));
  }

  checkDateField(field: string, date: Date | null): boolean {
    // Check if the date is within the range specified in the filter
    const filter = this.filters.get(field);
    if (!filter) {
      return true; // No filter means all dates are valid
    } else if (date === null) {
      return false; // Null dates are not valid
    }

    const dateString = date.toISOString().split("T")[0]; // Format as YYYY-MM-DD

    for (const condition of filter) {
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

  // TODO: checkTitle with globbing

  checkType(type: string): boolean {
    return this.checkField("type", {
      kind: "SingleSelect",
      value: type,
    });
  }

  checkOpen(is: string): boolean {
    return this.checkField("is", {
      kind: "SingleSelect",
      value: is,
    });
  }

  checkRepo(repo: string): boolean {
    return this.checkField("repo", {
      kind: "SingleSelect",
      value: repo ?? null,
    });
  }

  checkAssignees(assignees: string[]): boolean {
    return this.checkField("assignee", {
      kind: "MultiSelect",
      values: assignees,
    });
  }

  static defaultFields(): string[] {
    return [
      "repository",
      "assignee",
      "label",
      "is",
      "title",
      "linked-pull-requests",
      "milestone",
      "type", // DONE
      "reviewers",
      "parent-issue",
      "sub-issues-progress",
      // Boolean modifiers which take a field name
      "no",
      "has",
    ];
  }
}

export async function getProjectView(
  params: GetProjectViewParameters,
): Promise<ProjectView> {
  const octokit = getOctokit();

  const query = `
    query($organization: String!, $projectNumber: Int!, $projectViewNumber: Int!) {
      organization(login: $organization) {
        projectV2(number: $projectNumber) {
          view(number: $projectViewNumber) {
            name
            filter
          }
        }
      }
    }
  `;

  const response = await octokit.graphql<{
    organization: {
      projectV2: {
        view: {
          name: string;
          filter: string;
        };
      };
    };
  }>(query, {
    organization: params.organization,
    projectNumber: params.projectNumber,
    projectViewNumber: params.projectViewNumber,
  });

  return new ProjectView({
    name: response.organization.projectV2.view.name,
    number: params.projectViewNumber,
    filterQuery: response.organization.projectV2.view.filter,
  });
}
