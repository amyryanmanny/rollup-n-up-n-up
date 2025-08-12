import {
  projectFieldValueEdgesFragment,
  type ProjectFieldValueEdge,
} from "./project-fields";

export const projectItemsFragment = `
  projectItems(first: 10) {
    nodes {
      project {
        number
      }
      fieldValues(first: 100) {
        ${projectFieldValueEdgesFragment}
      }
    }
  }
`;

export type ProjectItems = {
  projectItems: {
    nodes: Array<{
      project: {
        number: number;
      };
      fieldValues: {
        edges: Array<ProjectFieldValueEdge>;
      };
    }>;
  };
};
