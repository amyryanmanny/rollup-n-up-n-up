import { getOctokit } from "@util/octokit";
import type { PageInfoForward } from "@octokit/plugin-paginate-graphql";

import type { Issue } from "../issue";

import {
  issueNodeFragment,
  mapIssueNode,
  type IssueNode,
} from "./fragments/issue";
import { projectItemsFragment, type ProjectItems } from "./fragments/project";
import { mapProjectFieldValues } from "./fragments/project-fields";
import { pageInfoFragment } from "./fragments/page-info";

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
            subIssues(first: 50, after: $cursor) {
              nodes {
                ${issueNodeFragment}
                ${projectItemsFragment}
              }
              ${pageInfoFragment}
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
