import { isTruthy } from "@config";

// TODO: Positional and kwarg-based params
// kwargs need fuzzy matching
// e.g. issue_number -> `issueNumber`
//       org, owner -> `organization`
//       repo -> `repository`

export type IssueFetchParameters = {
  comments: number; // Number of Comments to Fetch (default 20)
  projectFields: number | undefined; // Project Number
  subissues: boolean;
};

export type DirtyIssueFetchParameters = {
  comments?: number | string;
  projectFields?: number | string;
  subissues?: boolean | string;
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

  return { comments, projectFields, subissues };
}
