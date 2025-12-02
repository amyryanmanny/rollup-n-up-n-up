import type { TextField, SingleSelect, DateField, NumberField } from "./fields";

export type IssueFieldValue =
  | TextField
  | SingleSelect
  | DateField
  | NumberField;
