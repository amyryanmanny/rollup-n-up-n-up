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
  name: string;
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

    // Parse the filter string. Only split on spaces outside of quotes
    params.filterQuery.match(/(?:[^\s"]+|"[^"]*")+/g)?.forEach((f) => {
      const [key, value] = f.split(":").map((s) => s.trim());
      if (key && value) {
        const values = value.split(",").map((v) => {
          if (v.startsWith('"') && v.endsWith('"')) {
            // Remove quotes from the value
            v = v.slice(1, -1);
          }
          return v.trim();
        });
        if (key.startsWith("-")) {
          // Exclude filter
          this.excludeFilters.get(key.slice(1)).push(...values);
        } else {
          // Regular filter
          this.filters.get(key).push(...values);
        }
      }
    });
  }

  // Properties
  get name(): string {
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

    } else if (field.kind === "SingleSelect") {
      strValue = field.value;
    } else if (field.kind === "Date") {
      // For Date filters, the format is:
      //   date:>=2025-06-16 or date:<=2025-06-22
      return this.checkDateField(fieldName, field.date);
    }

    const included = this.filters.get(fieldName);
    const excluded = this.excludeFilters.get(fieldName);

    if (
      included.length &&
      (strValue === null || !included.includes(strValue))
    ) {
      return false;
    }
    if (excluded.length && strValue !== null && excluded.includes(strValue)) {
      return false;
    }
    return true;
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

  checkRepo(repo: string | undefined): boolean {
    return this.checkField("repo", {
      kind: "SingleSelect",
      value: repo ?? null,
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
