import {
  projectFieldValueFragment,
  type ProjectFieldValueNode,
} from "./project-fields";

export const projectItemsFragment = `
  projectItems(first: 10) {
    nodes {
      project {
        number
      }
      fieldValues(first: 100) {
        ${projectFieldValueFragment}
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
        nodes: Array<ProjectFieldValueNode>;
      };
    }>;
  };
};
