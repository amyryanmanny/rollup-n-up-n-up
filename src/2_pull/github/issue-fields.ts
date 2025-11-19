import type {
  FieldKinds,
  TextField,
  SingleSelect,
  DateField,
  NumberField,
} from "./fields";

export type IssueFieldSetting = {
  kind: FieldKinds;
  name: string;
  options?: Array<string>;
};

export type IssueFieldValue =
  | TextField
  | SingleSelect
  | DateField
  | NumberField;
