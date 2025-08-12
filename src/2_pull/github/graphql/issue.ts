import { getOctokit } from "@util/octokit";
import type { Issue } from "../issue";
import { NUM_ISSUE_ASSIGNESS, NUM_ISSUE_COMMENTS, NUM_ISSUE_LABELS } from ".";

export type GetIssueParameters = {
  organization: string;
  repo: string;
  issueNumber: number;
};

export type IssueNode = {
  __typename: string;
  title: string;
  body: string;
  url: string;
  number: number;
  state: "OPEN" | "CLOSED";
  createdAt: string; // ISO 8601 date string
  updatedAt: string; // ISO 8601 date string
  issueType: {
    name: string;
  } | null;
  repository: {
    name: string;
    owner: {
      login: string;
    };
    nameWithOwner: string;
  };
  assignees: {
    nodes: Array<{ login: string }>;
  };
  labels: {
    nodes: Array<{ name: string }>;
  };
  comments: {
    nodes: Array<{
      author: {
        login: string;
      } | null;
      body: string;
      createdAt: string; // ISO 8601 date string
      updatedAt: string; // ISO 8601 date string
      url: string;
    }>;
  };
  parent: {
    title: string;
    url: string;
    number: number;
  } | null;
};

export function mapIssueNode(node: IssueNode): Issue {
  return {
    title: node.title,
    body: node.body,
    url: node.url,
    number: node.number,
    state: node.state,
    createdAt: new Date(node.createdAt),
    updatedAt: new Date(node.updatedAt),
    type: node.issueType?.name || "Issue",
    repository: {
      name: node.repository.name,
      owner: node.repository.owner.login,
      nameWithOwner: node.repository.nameWithOwner,
    },
    assignees: node.assignees.nodes.map((assignee) => assignee.login),
    labels: node.labels.nodes.map((label) => label.name),
    comments: node.comments.nodes.map((comment) => ({
      author: comment.author?.login || "Unknown",
      body: comment.body,
      createdAt: new Date(comment.createdAt),
      updatedAt: new Date(comment.updatedAt),
      url: comment.url,
    })),
    parent: node.parent
      ? {
          title: node.parent.title,
          url: node.parent.url,
          number: node.parent.number,
        }
      : undefined,
  };
}

export async function getIssue(params: GetIssueParameters): Promise<Issue> {
  const octokit = getOctokit();

  const query = `
    query ($organization: String!, $repo: String!, $issueNumber: Int!) {
      organization(login: $organization) {
        repository(name: $repo) {
          issue(number: $issueNumber) {
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
          }
        }
      }
    }
  `;

  const response = await octokit.graphql<{
    organization: {
      repository: {
        issue: IssueNode;
      };
    };
  }>(query, params);

  return mapIssueNode(response.organization.repository.issue);
}
