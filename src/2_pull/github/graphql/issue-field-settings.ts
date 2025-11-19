import { getOctokit } from "@util/octokit";

import memoize from "memoize";

import type { IssueFieldSetting } from "../issue-fields";

import {
  issueFieldSettingNodeFragment,
  mapIssueFieldSettingNodes,
  type IssueFieldSettingNode,
} from "./fragments/issue-field-settings";
import { rateLimitFragment, type RateLimit } from "./fragments/rate-limit";

import { debugGraphQL } from "./debug";
import { pageInfoFragment } from "./fragments/page-info";

export type GetIssueFieldSettingsParameters = {
  organization: string;
};

export type IssueFieldSettingsResponse = Map<string, IssueFieldSetting>;

async function getIssueFieldSettings(
  params: GetIssueFieldSettingsParameters,
): Promise<IssueFieldSettingsResponse> {
  const octokit = getOctokit();

  const query = `
    query paginate($organization: String!, $cursor: String) {
      organization(login: $organization) {
        issueFields(first: 100, after: $cursor) {
          nodes {
            ${issueFieldSettingNodeFragment}
          }
          ${pageInfoFragment}
        }
      }
      ${rateLimitFragment}
    }
  `;

  const startTime = new Date();
  const response = await octokit.graphql.paginate<
    {
      organization: {
        issueFields: {
          nodes: IssueFieldSettingNode[];
        };
      };
    } & RateLimit
  >(query, {
    ...params,
    headers: {
      "GraphQL-Features": "issue_fields",
    },
  });

  debugGraphQL("Get Issue Field Settings", params, response, startTime);

  return mapIssueFieldSettingNodes(response.organization.issueFields.nodes);
}

const memoizedGetIssueFieldSettings = memoize(getIssueFieldSettings, {
  cacheKey: ([params]: [GetIssueFieldSettingsParameters]) =>
    `${params.organization}`,
});

export { memoizedGetIssueFieldSettings as getIssueFieldSettings };
