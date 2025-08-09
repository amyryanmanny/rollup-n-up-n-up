import type { IssueRenderOptions } from "@transform/render-objects/issue";

import { isTruthy } from "./truthy";

export type DirtyIssueRenderOptions = {
  // TODO: Eventually should be unknown for all, this just includes sane types
  field?: string;
  fields?: string | string[];
  body?: string | boolean;
  updates?: string | number | boolean;
  subissues?: string | boolean;
  skipIfEmpty?: string | boolean; // Skip rendering if no updates or body
};

export function validateRenderOptions(
  options: DirtyIssueRenderOptions,
): IssueRenderOptions {
  let fields: string[] = [];
  if (options.field && options.fields) {
    throw new Error(
      'Cannot use both "field" and "fields" options. Use "fields" for multiple fields.',
    );
  }
  if (options.field) {
    fields = [options.field];
  }
  if (options.fields) {
    fields = Array.isArray(options.fields) ? options.fields : [options.fields];
  }

  let body = false; // Default to skipping body
  if (isTruthy(options.body)) {
    body = true;
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

  let subissues = undefined;
  if (options.subissues !== undefined) {
    subissues = isTruthy(options.subissues);
  }

  let skipIfEmpty = true;
  if (options.skipIfEmpty !== undefined) {
    skipIfEmpty = isTruthy(options.skipIfEmpty);
  }

  return {
    fields,
    body,
    updates,
    subissues,
    skipIfEmpty,
  };
}
