import type {
  IssueRenderOptions,
  CommentRenderOptions,
  DiscussionRenderOptions,
} from "@transform/render-objects";

import { isTruthy } from "./truthy";

export type DirtyRenderOptions = {
  // TODO: Should really be unknown for all, this just includes sane types
  header?: string | boolean;
  body?: string | boolean;
  updates?: string | number | boolean;
  author?: string | boolean;
  createdAt?: string | boolean;
  updatedAt?: string | boolean;
  field?: string;
  fields?: string | string[];
  // TODO: Labels
  subissues?: string | boolean;
  skipIfEmpty?: string | boolean; // Skip rendering if no updates or body
};

export function validateRenderOptions(
  options: DirtyRenderOptions = {},
): IssueRenderOptions & CommentRenderOptions & DiscussionRenderOptions {
  let fields: string[] = [];
  if (options.field && options.fields) {
    throw new Error(
      'Cannot use both "field" and "fields" options. Use "fields" for multiple fields.',
    );
  }

  let header = true; // Default to rendering header
  if (options.header !== undefined) {
    header = isTruthy(options.header);
  }

  let body = false; // Default to skipping body
  if (options.body !== undefined) {
    body = isTruthy(options.body);
  }

  let updates = 1; // Default to just the latest update
  if (options.updates !== undefined) {
    updates = Number(options.updates);
    if (isNaN(updates)) {
      updates = Number(isTruthy(options.updates));
    } else if (updates < 0) {
      throw new Error(`Invalid updates option: ${updates}`);
    }
  }

  let author = true;
  if (options.author) {
    author = isTruthy(options.author);
  }

  let createdAt = false;
  if (options.createdAt) {
    createdAt = isTruthy(options.createdAt);
  }

  let updatedAt = false;
  if (options.updatedAt) {
    updatedAt = isTruthy(options.updatedAt);
  }

  if (options.field) {
    fields = [options.field];
  } else if (options.fields) {
    fields = Array.isArray(options.fields) ? options.fields : [options.fields];
  }

  let subissues = undefined;
  if (options.subissues !== undefined) {
    subissues = isTruthy(options.subissues);
  }

  let skipIfEmpty = true;
  if (options.skipIfEmpty !== undefined) {
    skipIfEmpty = isTruthy(options.skipIfEmpty);
  }

  return {
    header,
    body,
    updates,
    author,
    createdAt,
    updatedAt,
    fields,
    subissues,
    skipIfEmpty,
  };
}
