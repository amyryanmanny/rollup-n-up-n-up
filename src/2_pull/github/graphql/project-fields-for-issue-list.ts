import { getOctokit } from "@util/octokit";

import type { GetIssueParameters } from "./issue";

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
import type { ProjectField } from "../project-fields";

type ListProjectFieldsForListOfIssuesParams = {
  issues: Array<GetIssueParameters>;
  projectNumber: number;
};

type ListProjectFieldsForListOfIssuesResponse = Map<
  GetIssueParameters,
  Map<string, ProjectField>
>;

const BATCH_SIZE = 50;

async function listProjectFieldsForBatch(issues: Array<GetIssueParameters>) {
  const octokit = getOctokit();

  const query = `
    query {
      ${issues
        .map(
          ({ organization, repository, issueNumber }, index) => `issue${
            index + 1
          }: repository(owner: "${organization}", name: "${repository}") {
              issue(number: ${issueNumber}) {
                projectItems(first: 7) {
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
                }
              }
            }
          `,
        )
        .join("\n")}
      ${rateLimitFragment}
    }
  `;

  const response = await octokit.graphql<
    {
      [issue: string]: {
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
    } & RateLimit
  >(query);

  debugGraphQLRateLimit(
    "List Project Fields for List of Issues",
    issues,
    response,
  );

  return response;
}

export async function listProjectFieldsForListOfIssues(
  params: ListProjectFieldsForListOfIssuesParams,
): Promise<ListProjectFieldsForListOfIssuesResponse> {
  if (!params.issues.length) {
    return new Map();
  }

  const projectFieldsMap = new Map<
    GetIssueParameters,
    Map<string, ProjectField>
  >();

  let cursor = 0;
  while (cursor < params.issues.length) {
    const batch = params.issues.slice(cursor, cursor + BATCH_SIZE);
    const response = await listProjectFieldsForBatch(batch);

    for (let i = 0; i < batch.length; i++) {
      const issueResponse = response[`issue${i + 1}`];
      if (issueResponse === undefined) {
        continue;
      }

      const project = issueResponse.issue.projectItems.nodes.find(
        (p) => p.project.number === params.projectNumber,
      );
      if (project !== undefined) {
        projectFieldsMap.set(
          batch[i] as GetIssueParameters,
          mapProjectFieldValues(project.fieldValues.nodes),
        );
      } else {
        // Set this issue to an empty map so their fields aren't fetched again
        projectFieldsMap.set(batch[i] as GetIssueParameters, new Map());
      }
    }

    cursor += BATCH_SIZE;
  }

  return projectFieldsMap;
}
