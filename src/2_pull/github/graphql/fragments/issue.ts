import type { Issue } from "@pull/github/issue";
import {
  issueFieldValueNodeFragment,
  mapIssueFieldValueNodes,
  type IssueFieldValueNode,
} from "./issue-field-values";

export const issueNodeFragment = `
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
  assignees(first: 5) {
    nodes {
      login
    }
  }
  labels(first: 100) {
    nodes {
      name
    }
  }
  issueFieldValues(first: 100) {
    nodes {
      ${issueFieldValueNodeFragment}
    }
  }
  parent {
    title
    url
    number
  }
`;

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
  issueFieldValues: {
    nodes: Array<IssueFieldValueNode>;
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
    isOpen: node.state === "OPEN",
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
    issueFields: mapIssueFieldValueNodes(node.issueFieldValues.nodes),
    parent: node.parent
      ? {
          title: node.parent.title,
          url: node.parent.url,
          number: node.parent.number,
        }
      : undefined,
  };
}
