export type ProjectField = IssueField;
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

export type Project = {
  number: number;
  fields: Map<string, ProjectField>;
};
