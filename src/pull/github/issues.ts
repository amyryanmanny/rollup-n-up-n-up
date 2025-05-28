import { Client } from "./client";
import type { RestEndpointMethodTypes } from "@octokit/rest";

type ListIssuesForRepoParameters =
  RestEndpointMethodTypes["issues"]["listForRepo"]["parameters"];
type ListIssuesForProjectViewParameters = {
  organization: string;
  projectNumber: number;
  typeField: string | undefined;
  typeFilter: string | undefined;
};

type Issue =
  RestEndpointMethodTypes["issues"]["listForRepo"]["response"]["data"][number];
type ProjectIssue = {
  // Until Projects are added to the REST API we have to construct the type
  // It's not worth making this a Partial, but maybe there should be a single supertype instead
  title: string;
  body: string;
  url: string;
  assignees: string[];
  type: string;
};

export class IssueList {
  private issues: Promise<(Issue | ProjectIssue)[]>;

  private constructor(issues: Promise<(Issue | ProjectIssue)[]>) {
    this.issues = issues;
  }

  static forRepo(
    client: Client,
    params: ListIssuesForRepoParameters,
  ): IssueList {
    const response = client.octokit.rest.issues.listForRepo(params);
    const data = response.then((res) => res.data);
    return new IssueList(data);
  }

  static forProjectV2(
    client: Client,
    params: ListIssuesForProjectViewParameters,
  ): IssueList {
    const query = `
      query($organization: String!, $projectNumber: Int!, $typeField: String!) {
        organization(login: $organization) {
          projectV2(number: $projectNumber) {
            title
            items(first: 100) {
              edges {
                node {
                  id
                  content {
                    __typename
                    ... on Issue {
                      title
                      assignees(first:5) {
                        nodes {
                          login
                        }
                      }
                      body
                      url
                    }
                  }
                  fieldValueByName(name: $typeField) {
                    ... on ProjectV2ItemFieldSingleSelectValue {
                      name
                    }
                  }
                }
              }
              pageInfo {
                endCursor
                hasNextPage
              }
            }
          }
        }
      }
    `;

    const response = client.octokit.graphql<{
      organization: {
        projectV2: {
          title: string;
          items: {
            edges: Array<{
              node: {
                id: string;
                content: {
                  __typename: string;
                  title: string;
                  assignees: {
                    nodes: Array<{ login: string }>;
                  };
                  body: string;
                  url: string;
                } | null;
                fieldValueByName: {
                  name?: string;
                } | null;
              };
            }>;
            pageInfo: {
              endCursor: string;
              hasNextPage: boolean;
            };
          };
        };
      };
    }>(query, {
      organization: params.organization,
      projectNumber: params.projectNumber,
      typeField: params.typeField || "Type", // Default to "Type" if not provided
    });

    const data = response.then((res) => {
      const items = res.organization.projectV2.items;
      return items.edges
        .map((edge) => {
          const content = edge.node.content;
          if (!content) return null;
          return {
            title: content.title,
            body: content.body || "",
            url: content.url,
            assignees: content.assignees.nodes.map(
              (assignee) => assignee.login,
            ),
            type: edge.node.fieldValueByName?.name || "",
          } as ProjectIssue;
          // TODO: Paginate
        })
        .filter((item) => item !== null)
        .filter(
          // So we can filter by Bug, Initiative
          (item) => params.typeFilter && item.type == params.typeFilter,
        );
    });

    return new IssueList(data);
  }

  async length(): Promise<number> {
    const issues = await this.issues;
    return issues.length;
  }

  async first(): Promise<string> {
    const issues = await this.issues;
    if (issues.length === 0) {
      return "";
    }
    const body = issues[0].body;
    if (!body) {
      return "";
    }
    return body;
  }
}
