import type { Comment } from "@pull/github/comment";

export type CommentNode = {
  author: {
    login: string;
  } | null;
  body: string;
  createdAt: string; // ISO 8601 date string
  updatedAt: string; // ISO 8601 date string
  url: string;
};

export const commentFragment = `
  author {
    login
  }
  body
  createdAt
  updatedAt
  url
`;

export function mapCommentNode(node: CommentNode): Comment {
  return {
    author: node.author?.login || "Unknown",
    body: node.body,
    createdAt: new Date(node.createdAt),
    updatedAt: new Date(node.updatedAt),
    url: node.url,
  };
}
