export type IssueField = FieldSingleSelect | FieldMultiSelect | FieldDate;

export type FieldSingleSelect = {
  kind: "SingleSelect";
  value: string | null;
  options?: string[]; // Value options for the field
};

type FieldMultiSelect = {
  kind: "MultiSelect";
  values: string[] | null;
};

type FieldDate = {
  kind: "Date";
  value: string | null; // ISO 8601 date string
  date: Date | null;
};

export const slugifyProjectFieldName = (field: string): string => {
  // RoB Area FY25Q4 -> rob-area-fy25q4
  // Slugs are not accessible with GraphQL :(
  return field.toLowerCase().replace(/\s+/g, "-");
};

export const projectFieldValueEdgesFragment = `
  edges {
    node {
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
    }
  }
`;

export type ProjectFieldValueEdge = {
  node: {
    __typename: string;
    name: string | null; // SingleSelect value name
    date: string | null; // Date value
    field: {
      name: string; // Field name
      options?: Array<{ name: string }>; // For SingleSelect field options
    };
  } | null; // Null if no union type match
};

export function mapProjectFieldValues(
  edges: Array<ProjectFieldValueEdge>,
): Map<string, IssueField> {
  return edges.reduce((accumulator, edge) => {
    const node = edge.node;
    if (node && node.field) {
      let field: IssueField;
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
      const fieldName = slugifyProjectFieldName(node.field.name);
      accumulator.set(fieldName, field);
    }
    return accumulator;
  }, new Map<string, IssueField>());
}
