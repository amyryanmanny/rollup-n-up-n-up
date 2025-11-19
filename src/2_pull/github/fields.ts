export type Field =
  | TextField
  | SingleSelect
  | MultiSelect
  | DateField
  | NumberField;

export type FieldKinds =
  | "Text"
  | "SingleSelect"
  | "MultiSelect"
  | "Date"
  | "Number";

export type TextField = {
  kind: "Text";
  value: string | null;
};

export type SingleSelect = {
  kind: "SingleSelect";
  value: string | null;
  options: string[]; // Value options for the field
};

export type MultiSelect = {
  kind: "MultiSelect";
  values: string[] | null;
  options: string[]; // Value options for the field
};

export type DateField = {
  kind: "Date";
  value: string | null; // ISO 8601 date string
  date: Date | null;
};

export type NumberField = {
  kind: "Number";
  value: number | null;
};

export function mapFieldToString(field: Field): string {
  switch (field.kind) {
    case "Text":
    case "SingleSelect":
    case "Date":
    case "Number":
      return field.value ? String(field.value) : "";
    case "MultiSelect":
      return field.values ? field.values.join(", ") : "";
  }
}

export function mapFieldsToString(
  fields: Map<string, Field>,
): Map<string, string> {
  return new Map(
    Array.from(fields.entries()).map(([name, field]) => {
      return [name, mapFieldToString(field)];
    }),
  );
}
