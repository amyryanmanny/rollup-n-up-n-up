import { getMemory } from "@transform/memory";
import { emojiCompare } from "@util/emoji";
import { title } from "@util/string";

import {
  listIssuesForProject,
  type ListIssuesForProjectParameters,
} from "./graphql/project";
import {
  getProjectView,
  ProjectView,
  type GetProjectViewParameters,
} from "./project-view";
import {
  listIssuesForRepo,
  type ListIssuesForRepoParameters,
} from "./graphql/repo";
import {
  listSubissuesForIssue,
  type ListSubissuesForIssueParameters,
} from "./graphql/subissues";

import { IssueWrapper } from "./issue";

type SourceOfTruth = {
  title: string;
  url: string;
  groupKey?: string; // When using a groupBy
};

export class IssueList {
  private memory = getMemory();

  private sourceOfTruth: SourceOfTruth;
  private issues: IssueWrapper[];

  // Some Array functions should fall through
  get length(): number {
    return this.issues.length;
  }

  get isEmpty(): boolean {
    return this.issues.length === 0;
  }

  get hasUpdates(): boolean {
    // Check if any issue has an update
    return this.issues.some((issue) => issue.hasUpdate);
  }

  get blame(): IssueList {
    const issuesWithNoUpdate = this.issues.filter((issue) => !issue.hasUpdate);
    return new IssueList(issuesWithNoUpdate, {
      title: `${this.sourceOfTruth.title} - Missing Updates`,
      url: this.sourceOfTruth.url,
    });
  }

  [Symbol.iterator]() {
    return this.issues[Symbol.iterator]();
  }

  find(predicate: (issue: IssueWrapper) => boolean): IssueWrapper | undefined {
    // Find an issue by a predicate
    return this.issues.find(predicate);
  }

  // Issue Filtering / Grouping / Sorting
  filter(view: ProjectView) {
    // Filter the issues
    this.issues = this.issues.filter((wrapper) => {
      // First check against default fields
      if (!view.checkType(wrapper.type)) {
        return false;
      }

      if (!view.checkRepo(wrapper.repoNameWithOwner)) {
        return false;
      }

      // Next check against all the custom Project Fields
      for (const field of view.customFields) {
        const value = wrapper._projectFields.get(field);
        if (!view.checkField(field, value)) {
          return false;
        }
      }

      return true;
    });

    // Scope the Source of Truth to the view
    if (view.number) {
      this.sourceOfTruth.url += `/views/${view.number}`;
    } else {
      this.sourceOfTruth.url += `?filterQuery=${encodeURIComponent(
        view.filterQuery,
      )}`;
    }
    this.sourceOfTruth.title += ` (${view.name})`;
  }

  sort(fieldName: string, direction: "asc" | "desc" = "asc"): IssueList {
    // Sort the issues by the given field name
    this.issues.sort((a, b) => {
      const aValue = a.field(fieldName);
      const bValue = b.field(fieldName);

      if (aValue < bValue) {
        return direction === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return direction === "asc" ? 1 : -1;
      }
      return 0;
    });

    return this; // Allow method chaining
  }

  sortByEmoji(fieldName: string): IssueList {
    // TODO: Combine with sort(), no need for both
    // Sort the issues by the given field name
    // The field is expected to be a status containing an emoji
    // Red comes first
    this.issues.sort((a, b) => {
      const aValue = a.field(fieldName);
      const bValue = b.field(fieldName);

      // If both have the same emoji or neither has it, sort alphabetically
      return emojiCompare(aValue, bValue) ?? aValue.localeCompare(bValue);
    });

    return this;
  }

  groupBy(fieldName: string): IssueList[] {
    // Group the issues by the given field name
    const groups = new Map<string, IssueList>();

    for (const issue of this.issues) {
      const key = issue.field(fieldName);
      if (!groups.has(key)) {
        groups.set(
          key,
          new IssueList([], {
            title: this.sourceOfTruth.title,
            url: this.sourceOfTruth.url,
            groupKey: key || "No " + title(fieldName),
          }),
        );
      }
      groups.get(key)!.issues.push(issue);
    }

    return Array.from(groups.entries())
      .sort(([a], [b]) => emojiCompare(a, b) ?? a.localeCompare(b))
      .map(([, group]) => group);
  }

  overallStatus(fieldName: string): string {
    // TODO: Custom sort order in case they don't use emoji
    // Get the max status emoji from the issues
    return this.issues
      .map((issue) => issue.field(fieldName) ?? "")
      .sort((a, b) => emojiCompare(a, b) ?? a.localeCompare(b))[0];
  }

  // Properties
  get header(): string {
    return `[${this.sourceOfTruth.title}](${this.sourceOfTruth.url})`;
  }

  get title(): string {
    return this.sourceOfTruth.title;
  }

  get url(): string {
    return this.sourceOfTruth.url;
  }

  get groupKey(): string {
    if (!this.sourceOfTruth.groupKey) {
      throw new Error("Don't use groupKey without a groupBy.");
    }
    return this.sourceOfTruth.groupKey;
  }

  // Constructors
  private constructor(issues: IssueWrapper[], sourceOfTruth: SourceOfTruth) {
    this.sourceOfTruth = sourceOfTruth;
    this.issues = issues;
  }

  static async forRepo(
    params: ListIssuesForRepoParameters,
  ): Promise<IssueList> {
    const response = await listIssuesForRepo(params);
    const { issues, title, url } = response;
    return new IssueList(
      issues.map((issue) => new IssueWrapper(issue)),
      { title, url },
    );
  }

  static async forSubissues(
    params: ListSubissuesForIssueParameters,
  ): Promise<IssueList> {
    const response = await listSubissuesForIssue(params);
    const { subissues, title, url } = response;
    return new IssueList(
      subissues.map((issue) => new IssueWrapper(issue)),
      { title, url },
    );
  }

  static async forProject(
    params: ListIssuesForProjectParameters,
  ): Promise<IssueList> {
    const response = await listIssuesForProject(params);
    const { issues, title, url } = response;
    return new IssueList(
      issues.map((issue) => new IssueWrapper(issue)),
      { title, url },
    );
  }

  static async forProjectView(
    params: GetProjectViewParameters,
  ): Promise<IssueList> {
    let view: ProjectView;

    if (params.projectViewNumber === undefined) {
      if (params.customQuery === undefined) {
        throw new Error(
          "Either projectViewNumber or customQuery must be provided.",
        );
      }
      view = new ProjectView({
        name: "Custom Query",
        filterQuery: params.customQuery,
      });
    } else {
      view = await getProjectView(params);
    }

    const issueList = await this.forProject({
      organization: params.organization,
      projectNumber: params.projectNumber,
      typeFilter: view.getFilterType(),
    });
    issueList.filter(view);

    return issueList;
  }

  // Render / Memory Functions
  get rendered(): string {
    // IssueLists are Level 2
    return `## ${this.header}\n\n${this.issues.map((issue) => issue.rendered).join("\n\n")}`;
  }

  remember() {
    this.memory.remember(this.rendered);
  }

  render(): string {
    this.remember();
    return this.rendered;
  }
}
