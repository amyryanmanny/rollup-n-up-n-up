import type { IssueFieldSetting } from "@pull/github/issue-fields";
import { ProjectView } from "@pull/github/project-view";

export const issueFieldSettingNodeFragment = `
  __typename
  ... on IssueFieldText {
    name
  }
  ... on IssueFieldSingleSelect {
    name
    options {
      name
    }
  }
  ... on IssueFieldDate {
    name
  }
  ... on IssueFieldNumber {
    name
  }
`;

export type IssueFieldSettingNode = {
  __typename: string;
  name: string; // SingleSelect value name
  date: string | null; // Date value
  options?: Array<{
    // For SingleSelect field options
    name: string;
  }>;
} | null; // Null if no union type match

export function mapIssueFieldSettingNodes(
  nodes: Array<IssueFieldSettingNode>,
): Map<string, IssueFieldSetting> {
  return nodes.reduce((accumulator, node) => {
    if (node) {
      let field: IssueFieldSetting;
      switch (node.__typename) {
        case "IssueFieldText":
          field = {
            kind: "Text",
            name: node.name,
          };
          break;
        case "IssueFieldSingleSelect":
          field = {
            kind: "SingleSelect",
            name: node.name,
            options: node.options!.map((option) => option.name),
          };
          break;
        case "IssueFieldDate": {
          field = {
            kind: "Date",
            name: node.name,
          };
          break;
        }
        case "IssueFieldNumber": {
          field = {
            kind: "Number",
            name: node.name,
          };
          break;
        }
        default:
          // Ignore other field types
          return accumulator;
      }
      const fieldName = ProjectView.slugifyFieldName(node.name);
      accumulator.set(fieldName, field);
    }
    return accumulator;
  }, new Map<string, IssueFieldSetting>());
}
