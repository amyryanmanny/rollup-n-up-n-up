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
  filter: string;
};

export class ProjectView {
  private name: string;
  private number: number | undefined;

  private filters: Map<string, string[]>;
  private excludeFilters: Map<string, string[]>;

  constructor(params: ProjectViewParameters) {
    this.name = params.name;
    this.number = params.number;

    this.filters = new Map<string, string[]>();
    this.excludeFilters = new Map<string, string[]>();

    // Parse the filter string. Only split on spaces outside of quotes
    params.filter.match(/(?:[^\s"]+|"[^"]*")+/g)?.forEach((f) => {
      const [key, value] = f.split(":");
      if (key && value) {
        const values = value.split(",").map((v) => {
          if (v.startsWith('"') && v.endsWith('"')) {
            // Remove quotes from the value
            v = v.slice(1, -1).trim();
          }
          return v.trim();
        });
        if (key.startsWith("-")) {
          // Exclude filter
          this.excludeFilters.set(key.trim().slice(1), values);
        } else {
          // Regular filter
          this.filters.set(key.trim(), values);
        }
      }
    });
  }

  getName(): string {
    return this.name;
  }

  getNumber(): number | undefined {
    return this.number;
  }

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

  getCustomFields(): string[] {
    const defaultFields = ProjectView.defaultFields();
    return Array.from([
      ...this.filters.keys(),
      ...this.excludeFilters.keys(),
    ]).filter((key) => {
      return !defaultFields.includes(key);
    });
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
    filter: response.organization.projectV2.view.filter,
  });
}
