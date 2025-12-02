import { getOctokit } from "@util/octokit";

import memoize from "memoize";

import type { GetIssueParameters } from "./issue";
import type { ProjectField } from "../project-fields";

import {
  mapProjectFieldValues,
  projectFieldValueFragment,
  type ProjectFieldValueNode,
} from "./fragments/project-fields";
import { pageInfoFragment } from "./fragments/page-info";
import { rateLimitFragment, type RateLimit } from "./fragments/rate-limit";

import { debugGraphQL } from "./debug";
import { isOctokitRequestError } from "@util/error";

type ListProjectFieldsForProjectParams = {
  organization: string;
  projectNumber: number;
};

type ListProjectFieldsForProjectResponse = Array<{
  issueParams: GetIssueParameters;
  fields: Map<string, ProjectField>;
}>;

let pageSize = 100;

async function listProjectFieldsForProject(
  params: ListProjectFieldsForProjectParams,
): Promise<ListProjectFieldsForProjectResponse> {
  // Fetch all Project Items in the Project
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
          items(first: ${pageSize}, after: $cursor) {
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

  let response;
  const startTime = new Date();
  try {
    response = await octokit.graphql.paginate<
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
    >(query, { ...params, request: { retries: 0 } });
  } catch (error) {
    if (isOctokitRequestError(error)) {
      if (error.status === 429) {
        pageSize = Math.floor(pageSize / 2);
        if (pageSize < 1) {
          throw new Error("Cannot reduce Project Fields pageSize further");
        }
        console.warn(
          `Project Fields request timed out, reducing pageSize to ${pageSize} and retrying...`,
        );
        return listProjectFieldsForProject(params);
      }
    }
    throw error;
  }

  if (!response) {
    console.trace();
    throw new Error("No response from GitHub, please try again.");
  }

  debugGraphQL("List Project Fields for Project", params, response, startTime);

  const projectFieldsForProject = response.organization.projectV2.items.nodes
    .filter((projectItem) => {
      const content = projectItem.content;
      return content && content.__typename === "Issue";
    })
    .map((projectItem) => {
      return {
        issueParams: {
          organization: projectItem.content!.repository.owner.login,
          repository: projectItem.content!.repository.name,
          issueNumber: projectItem.content!.number,
        },
        fields: mapProjectFieldValues(projectItem.fieldValues.nodes),
      };
    });

  return projectFieldsForProject;
}

const memoizedListProjectFieldsForProject = memoize(
  listProjectFieldsForProject,
  {
    cacheKey: ([params]: [ListProjectFieldsForProjectParams]) =>
      `${params.organization}/projects/${params.projectNumber}`,
  },
);

export { memoizedListProjectFieldsForProject as listProjectFieldsForProject };
