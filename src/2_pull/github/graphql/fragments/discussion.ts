import type { Discussion } from "@pull/github/discussion";
import { commentFragment, mapCommentNode, type CommentNode } from "./comment";

export const discussionNodeFragment = `
  title
  body
  url
  number
  closed
  createdAt
  updatedAt
  repository {
    name
    owner {
      login
    }
    nameWithOwner
  }
  author {
    login
  }
  labels(first: 100) {
    nodes {
      name
    }
  }
  comments(last: 25) {
    nodes {
      ${commentFragment}
    }
  }
`;

export type DiscussionNode = {
  title: string;
  body: string;
  url: string;
  number: number;
  closed: boolean;
  createdAt: string; // ISO 8601 date string
  updatedAt: string; // ISO 8601 date string
  repository: {
    name: string;
    owner: {
      login: string;
    };
    nameWithOwner: string;
  };
  author: {
    login: string;
  };
  labels: {
    nodes: Array<{ name: string }>;
  };
  comments: {
    nodes: Array<CommentNode>;
  };
};

export function mapDiscussionNode(node: DiscussionNode): Discussion {
  return {
    title: node.title,
    body: node.body,
    url: node.url,
    number: node.number,
    isOpen: node.closed,
    createdAt: new Date(node.createdAt),
    updatedAt: new Date(node.updatedAt),
    repository: {
      name: node.repository.name,
      owner: node.repository.owner.login,
      nameWithOwner: node.repository.nameWithOwner,
    },
    author: node.author.login,
    labels: node.labels.nodes.map((label) => label.name),
    comments: node.comments.nodes.map((comment) => mapCommentNode(comment)),
  };
}
