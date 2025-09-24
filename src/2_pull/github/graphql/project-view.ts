import { getOctokit } from "@util/octokit";
import { ProjectView } from "../project-view";

export type GetProjectViewParameters = {
  organization: string;
  projectNumber: number;
  projectViewNumber?: number;
  customQuery?: string;
};

export async function getProjectView(
  params: GetProjectViewParameters,
): Promise<ProjectView> {
  const octokit = getOctokit();

  const query = `
    query($organization: String!, $projectNumber: Int!, $projectViewNumber: Int!) {
      organization(login: $organization) {
        projectV2(number: $projectNumber) {
          view(number: $projectViewNumber) {
            name
            filter
          }
        }
      }
    }
  `;

  const response = await octokit.graphql<{
    organization: {
      projectV2: {
        view: {
          name: string;
          filter: string;
        };
      };
    };
  }>(query, {
    organization: params.organization,
    projectNumber: params.projectNumber,
    projectViewNumber: params.projectViewNumber,
  });

  return new ProjectView({
    name: response.organization.projectV2.view.name,
    number: params.projectViewNumber,
    projectNumber: params.projectNumber,
    filterQuery: response.organization.projectV2.view.filter,
  });
}
