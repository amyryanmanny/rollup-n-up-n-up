import { DefaultDict } from "@util/collections";

import type { GitHubClient } from "./client";

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
  private _name: string;
  private _number: number | undefined;
  private _filterQuery: string;

  private filters: DefaultDict<string, string[]>;
  private excludeFilters: DefaultDict<string, string[]>;

  constructor(params: ProjectViewParameters) {
    this._name = params.name;
    this._number = params.number;
    this._filterQuery = params.filterQuery;

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
    return this._name;
  }

  get number(): number | undefined {
    return this._number;
  }

  get filterQuery(): string {
    return this._filterQuery;
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

  checkField(field: string, value: string | undefined): boolean {
    const included = this.filters.get(field);
    const excluded = this.excludeFilters.get(field);

    if (included && (value === undefined || !included.includes(value!))) {
      return false;
    }
    if (excluded && excluded.includes(value!)) {
      return false;
    }
    return true;
  }

  checkType(type: string): boolean {
    return this.checkField("type", type);
  }

  checkOpen(is: string): boolean {
    return this.checkField("is", is);
  }

  checkRepo(repo: string | undefined): boolean {
    return this.checkField("repo", repo);
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
  client: GitHubClient,
  params: GetProjectViewParameters,
): Promise<ProjectView> {
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

  const response = await client.octokit.graphql<{
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
