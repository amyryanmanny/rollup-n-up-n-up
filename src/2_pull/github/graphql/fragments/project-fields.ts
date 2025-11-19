import { type ProjectField } from "@pull/github/project-fields";
import { ProjectView } from "@pull/github/project-view";

export const projectFieldValueFragment = `
  __typename
  ... on ProjectV2ItemFieldSingleSelectValue {
    name
    field {
      ... on ProjectV2SingleSelectField {
        name
        options {
          name
        }
      }
    }
  }
  ... on ProjectV2ItemFieldDateValue {
    date
    field {
      ... on ProjectV2Field {
        name
      }
    }
  }
`;

export type ProjectFieldValueNode = {
  __typename: string;
  name: string | null; // SingleSelect value name
  date: string | null; // Date value
  field: {
    name: string; // Field name
    options?: Array<{
      // For SingleSelect field options
      name: string;
    }>;
  };
} | null; // Null if no union type match

export function mapProjectFieldValues(
  nodes: Array<ProjectFieldValueNode>,
): Map<string, ProjectField> {
  return nodes.reduce((accumulator, node) => {
    if (node && node.field) {
      let field: ProjectField;
      switch (node.__typename) {
        case "ProjectV2ItemFieldSingleSelectValue":
          field = {
            kind: "SingleSelect",
            value: node.name,
            options: node.field.options!.map((option) => option.name),
          };
          break;
        case "ProjectV2ItemFieldDateValue": {
          const date = node.date;
          field = {
            kind: "Date",
            value: date,
            date: date ? new Date(date) : null,
          };
          break;
        }
        default:
          // Ignore other field types
          return accumulator;
      }
      // TODO: Don't slugify here. Although helpful, it's lossy
      const fieldName = ProjectView.slugifyFieldName(node.field.name);
      accumulator.set(fieldName, field);
    }
    return accumulator;
  }, new Map<string, ProjectField>());
}
