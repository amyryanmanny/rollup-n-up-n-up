// Fetch is finally happening
import { isTruthy } from "@config";

import type { IssueWrapper } from "@pull/github/issue";

// TODO: Positional and kwarg-based params
// kwargs need fuzzy matching
// e.g. issue_number -> `issueNumber`
//       org, owner -> `organization`
//       repo -> `repository`

export type IssueFetchParameters = {
  comments: number; // Number of Comments to Fetch (default 20)
  projectFields: number | undefined; // Project Number
  subissues: boolean;
  filter: (issue: IssueWrapper) => boolean;
};

export type DirtyIssueFetchParameters = {
  comments?: number | string;
  projectFields?: number | string;
  subissues?: boolean | string;
  filter?: (issue: IssueWrapper) => boolean;
};

export function validateFetchParameters(
  params: DirtyIssueFetchParameters | undefined,
): IssueFetchParameters {
  let comments = 20;
  if (params?.comments !== undefined) {
    comments = Number(params.comments);
  }

  let projectFields = undefined;
  if (params?.projectFields !== undefined) {
    projectFields = Number(params.projectFields);
  }

  let subissues = false;
  if (params?.subissues !== undefined) {
    subissues = isTruthy(params.subissues);
  }

  let filter: (issue: IssueWrapper) => boolean = () => true;
  if (params?.filter !== undefined) {
    filter = params.filter;
  }

  return { comments, projectFields, subissues, filter };
}
