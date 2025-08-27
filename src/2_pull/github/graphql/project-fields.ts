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

type ListProjectFields = GetIssueParameters & {
  projectNumber: number;
};

export async function listProjectFieldsForIssue(
  params: ListProjectFields,
): Promise<Map<string, ProjectField>> {
  const octokit = getOctokit();

  const query = `
    query paginate($organization: String!, $repository: String!, $issueNumber: Int!, $cursor: String) {
      organization(login: $organization) {
        repository(name: $repository) {
          issue(number: $issueNumber) {
            projectItems(first: 7, after: $cursor) {
              nodes {
                project {
                  number
                }
                fieldValues(first: 30) {
                  nodes {
                    ${projectFieldValueFragment}
                  }
                }
              }
              ${pageInfoFragment}
            }
          }
        }
      }
      ${rateLimitFragment}
    }
  `;

  const response = await octokit.graphql.paginate<
    {
      organization: {
        repository: {
          issue: {
            projectItems: {
              nodes: Array<{
                project: {
                  number: number;
                };
                fieldValues: {
                  nodes: Array<ProjectFieldValueNode>;
                };
              }>;
            };
          };
        };
      };
    } & RateLimit
  >(query, params);

  debugGraphQLRateLimit("List Project Fields for Issue", params, response);

  const project =
    response.organization.repository.issue.projectItems.nodes.find(
      (p) => p.project.number === params.projectNumber,
    );

  if (!project) {
    return new Map();
  }

  return mapProjectFieldValues(project.fieldValues.nodes);
}
