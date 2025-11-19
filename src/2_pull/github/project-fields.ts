import type { DateField, SingleSelect } from "./fields";

export type ProjectField = SingleSelect | DateField;

export type Project = {
  organization: string;
  number: number;
  fields: Map<string, ProjectField>;
};
