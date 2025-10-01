import { getOctokit } from "@util/octokit";

import type { GetIssueParameters } from "./issue";
import type { ProjectField } from "../project-fields";

import {
  debugGraphQLRateLimit,
  rateLimitFragment,
  type RateLimit,
} from "./fragments/rate-limit";
import {
  mapProjectFieldValues,
  projectFieldValueFragment,
  type ProjectFieldValueNode,
} from "./fragments/project-fields";
import { pageInfoFragment } from "./fragments/page-info";

type ListProjectFieldsForProjectParams = {
  organization: string;
  projectNumber: number;
};

type ListProjectFieldsForProjectResponse = Array<{
  issue: GetIssueParameters;
  fields: Map<string, ProjectField>;
}>;

export async function listProjectFieldsForProject(
  params: ListProjectFieldsForProjectParams,
): Promise<ListProjectFieldsForProjectResponse> {
  const { organization, projectNumber } = params;
  const projectFieldsForProject: ListProjectFieldsForProjectResponse = [];

  if (!organization || !projectNumber) {
    return projectFieldsForProject;
  }

  const octokit = getOctokit();

  const query = `
    query paginate($organization: String!, $projectNumber: Int!, $cursor: String) {
      organization(login: $organization) {
        projectV2(number: $projectNumber) {
          items(first: 10, after: $cursor) {
            nodes {
              content {
                ... on Issue {
                  repository {
                    owner {
                      login
                    }
                    name
                  }
                  number
                }
              }
              fieldValues(first: 50) {
                nodes {
                  ${projectFieldValueFragment}
                }
              }
            }
            ${pageInfoFragment}
          }
        }
      }
      ${rateLimitFragment}
    }
  `;

  const response = await octokit.graphql.paginate<
    {
      organization: {
        projectV2: {
          items: {
            nodes: Array<{
              content: {
                repository: {
                  owner: {
                    login: string;
                  };
                  name: string;
                };
                number: number;
              } | null;
              fieldValues: {
                nodes: Array<ProjectFieldValueNode>;
              };
            }>;
          };
        } | null;
      };
    } & RateLimit
  >(query, params);

  debugGraphQLRateLimit("List Project Fields for Project", params, response);

  const items = response.organization.projectV2?.items.nodes;
  if (!items) {
    return [];
  }

  for (const item of items) {
    if (item.content === null) {
      // If it's not an Issue, skip it
      continue;
    }

    projectFieldsForProject.push({
      issue: {
        organization: item.content.repository.owner.login,
        repository: item.content.repository.name,
        issueNumber: item.content.number,
      },
      fields: mapProjectFieldValues(item.fieldValues.nodes),
    });
  }

  return projectFieldsForProject;
}
