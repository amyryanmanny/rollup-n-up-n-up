import { getOctokit } from "@util/octokit";
import type { PageInfoForward } from "@octokit/plugin-paginate-graphql";

import type { Issue } from "../issue";

import {
  ISSUE_PAGE_SIZE,
  NUM_ISSUE_ASSIGNESS,
  NUM_ISSUE_COMMENTS,
  NUM_ISSUE_LABELS,
} from ".";

import { mapIssueNode, type IssueNode } from "./issue";

import type { ProjectItems } from "./project";
import { mapProjectFieldValues } from "./project-fields";

export type ListSubissuesForIssueParameters = {
  owner: string;
  repo: string;
  issueNumber: number;
  projectNumber?: number; // Fetch ProjectFields
};

type ListSubissuesForIssueResponse = {
  subissues: Issue[];
  title: string;
  url: string;
};

export async function listSubissuesForIssue(
  params: ListSubissuesForIssueParameters,
): Promise<ListSubissuesForIssueResponse> {
  const octokit = getOctokit();

  const query = `
    query paginate($owner: String!, $repo: String!, $issueNumber: Int!, $cursor: String) {
      repositoryOwner(login: $owner) {
        repository(name: $repo) {
          issue(number: $issueNumber) {
            title
            url
            subIssues(first: ${ISSUE_PAGE_SIZE}, after: $cursor) {
              nodes {
                __typename
                title
                body
                url
                number
                state
                createdAt
                updatedAt
                issueType {
                  name
                }
                repository {
                  name
                  owner {
                    login
                  }
                  nameWithOwner
                }
                assignees(first: ${NUM_ISSUE_ASSIGNESS}) {
                  nodes {
                    login
                  }
                }
                labels(first: ${NUM_ISSUE_LABELS}) {
                  nodes {
                    name
                  }
                }
                comments(last: ${NUM_ISSUE_COMMENTS}) {
                  nodes {
                    author {
                      login
                    }
                    body
                    createdAt
                    updatedAt
                    url
                  }
                }
                parent {
                  title
                  url
                  number
                }
                projectItems(first: 10) {
                  nodes {
                    project {
                      number
                    }
                    fieldValues(first: 100) {
                      edges {
                        node {
                          __typename
                          ... on ProjectV2ItemFieldSingleSelectValue {
                            name
                            field {
                              ... on ProjectV2SingleSelectField {
                                name
                                options {
                                  name
                                }
                              }
                            }
                          }
                          ... on ProjectV2ItemFieldDateValue {
                            date
                            field {
                              ... on ProjectV2Field {
                                name
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }
        }
      }
    }
  `;

  const response = await octokit.graphql.paginate<{
    repositoryOwner: {
      repository: {
        issue: {
          title: string;
          url: string;
          subIssues: {
            nodes: Array<IssueNode & ProjectItems>;
          };
          pageInfo: PageInfoForward;
        };
      };
    };
  }>(query, params);

  const issue = response.repositoryOwner.repository.issue;
  const subissues = issue.subIssues.nodes.map((subIssue) => {
    let project = undefined;
    if (params.projectNumber) {
      const projectItem = subIssue.projectItems.nodes.find(
        (item) => item.project.number === params.projectNumber,
      );
      if (projectItem) {
        project = {
          number: projectItem.project.number,
          fields: mapProjectFieldValues(projectItem.fieldValues.edges),
        };
      }
    }
    return {
      ...mapIssueNode(subIssue),
      project,
      isSubissue: true,
    };
  });

  return {
    subissues,
    title: `Subissues for ${issue.title} (#${params.issueNumber})`,
    url: issue.url,
  };
}
