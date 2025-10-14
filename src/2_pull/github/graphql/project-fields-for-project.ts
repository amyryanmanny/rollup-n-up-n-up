import { getOctokit } from "@util/octokit";

import type { GetIssueParameters } from "./issue";
import type { ProjectField } from "../project-fields";

import {
  mapProjectFieldValues,
  projectFieldValueFragment,
  type ProjectFieldValueNode,
} from "./fragments/project-fields";
import { pageInfoFragment } from "./fragments/page-info";
import {
  debugGraphQLRateLimit,
  rateLimitFragment,
  type RateLimit,
} from "./fragments/rate-limit";

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

  if (!organization || !projectNumber) {
    throw new Error(
      "Organization and projectNumber are required to listProjectFieldsForProject",
    );
  }

  const octokit = getOctokit();

  const query = `
    query paginate($organization: String!, $projectNumber: Int!, $cursor: String) {
      organization(login: $organization) {
        projectV2(number: $projectNumber) {
          items(first: 3, after: $cursor) {
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
              fieldValues(first: 100) {
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
                __typename: string;
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
        };
      };
    } & RateLimit
  >(query, params);

  debugGraphQLRateLimit("List Project Fields for Project", params, response);

  const projectFieldsForProject = response.organization.projectV2.items.nodes
    .filter((projectItem) => {
      const content = projectItem.content;
      return content && content.__typename === "Issue";
    })
    .map((projectItem) => {
      return {
        issue: {
          organization: projectItem.content!.repository.owner.login,
          repository: projectItem.content!.repository.name,
          issueNumber: projectItem.content!.number,
        },
        fields: mapProjectFieldValues(projectItem.fieldValues.nodes),
      };
    });

  return projectFieldsForProject;
}
