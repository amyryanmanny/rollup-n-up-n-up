import { isTruthy } from "@config";

// TODO: Positional and kwarg-based params
// kwargs need fuzzy matching
// e.g. issue_number -> `issueNumber`
//       org, owner -> `organization`
//       repo -> `repository`

export type FetchParameters = {
  subissues: boolean;
};

export type DirtyFetchParameters = {
  subissues?: boolean | string;
};

export function validateFetchParameters(
  params: DirtyFetchParameters | undefined,
): FetchParameters {
  let subissues = false;
  if (params?.subissues !== undefined) {
    subissues = isTruthy(params.subissues);
  }

  return { subissues };
}
