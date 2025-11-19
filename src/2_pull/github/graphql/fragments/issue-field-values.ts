import type { IssueFieldValue } from "@pull/github/issue-fields";
import { ProjectView } from "@pull/github/project-view";

export const issueFieldValueNodeFragment = `
  __typename
  ... on IssueFieldTextValue {
    textValue: value
    field {
      ... on IssueFieldText {
        name
      }
    }
  }
  ... on IssueFieldSingleSelectValue {
    singleSelectValue: name
    field {
      ... on IssueFieldSingleSelect {
        name
        options {
          name
        }
      }
    }
  }
  ... on IssueFieldDateValue {
    dateValue: value
    field {
      ... on IssueFieldDate {
        name
      }
    }
  }
  ... on IssueFieldNumberValue {
    numberValue: value
    field {
      ... on IssueFieldNumber {
        name
      }
    }
  }
`;

export type IssueFieldValueNode = {
  __typename: string;
  field: {
    name: string;
    options?: Array<{ name: string }>;
  };
  // Discriminated union values
  textValue: string | null;
  singleSelectValue: string | null;
  dateValue: string | null;
  numberValue: number | null;
};

export function mapIssueFieldValueNodes(
  nodes: Array<IssueFieldValueNode>,
): Map<string, IssueFieldValue> {
  return nodes.reduce((accumulator, node) => {
    if (node && node.field) {
      let field: IssueFieldValue;
      switch (node.__typename) {
        case "IssueFieldTextValue":
          field = {
            kind: "Text",
            value: node.textValue || null,
          };
          break;
        case "IssueFieldSingleSelectValue":
          field = {
            kind: "SingleSelect",
            value: node.singleSelectValue || null,
            options: node.field.options!.map((option) => option.name),
          };
          break;
        case "IssueFieldDateValue": {
          field = {
            kind: "Date",
            value: node.dateValue || null,
            date: node.dateValue ? new Date(node.dateValue) : null,
          };
          break;
        }
        case "IssueFieldNumberValue": {
          field = {
            kind: "Number",
            value: node.numberValue || null,
          };
          break;
        }
        default:
          // Ignore other field types
          return accumulator;
      }
      const fieldName = ProjectView.slugifyFieldName(node.field.name);
      accumulator.set(fieldName, field);
    }
    return accumulator;
  }, new Map<string, IssueFieldValue>());
}
