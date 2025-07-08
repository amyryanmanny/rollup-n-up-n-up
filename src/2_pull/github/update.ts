import memoize from "memoize";

import { getUpdateDetectionConfig } from "@util/config/update";
import { CommentWrapper } from "./comment";

export type UpdateDetectionStrategy =
  | TimeboxStrategy
  | SectionStrategy
  | MarkerStrategy
  | SkipStrategy
  | FailStrategy
  | BlameStrategy;

export type Timeframe =
  | "today"
  | "last-week"
  | "last-month"
  | "last-year"
  | "all-time";

type TimeboxStrategy = {
  kind: "timebox";
  timeframe: Timeframe;
};

type SectionStrategy = {
  kind: "section";
  section: string;
  timeframe?: Timeframe;
};

type MarkerStrategy = {
  kind: "marker";
  marker: RegExp;
  timeframe?: Timeframe;
};

type SkipStrategy = {
  kind: "skip";
};

type FailStrategy = {
  kind: "fail";
};

type BlameStrategy = {
  kind: "blame";
  // TODO: Add special blame behavior beyond skip. E.g. Slack messages
};

export function findLatestUpdate(
  comments: CommentWrapper[],
): CommentWrapper | undefined {
  const { strategies } = getUpdateDetectionConfig();

  for (const strategy of strategies) {
    for (const comment of comments) {
      switch (strategy.kind) {
        case "timebox":
        case "section":
        case "marker": {
          const update = extractUpdateWithStrategy(comment, strategy);
          if (update !== undefined && update.trim() !== "") {
            return comment;
          }
          break;
        }
        // If we've reached these strategies, we couldn't find an update
        // And need to execute special behavior
        case "skip":
        case "blame":
          return undefined; // Return no comment
        case "fail":
          throw new Error(
            `No valid update found for issue ${comment.issue.title} - ${comment.issue.url}!`,
          );
      }
    }
  }

  return comments[0]; // By default, just return the latest comment
}

export function extractUpdate(comment: CommentWrapper): string | undefined {
  const { strategies } = getUpdateDetectionConfig();

  for (const strategy of strategies) {
    const update = memoizedExtractUpdateWithStrategy(comment, strategy);
    if (update !== undefined) {
      return update;
    }
  }
  return comment._body;
}

function extractUpdateWithStrategy(
  comment: CommentWrapper,
  strategy: UpdateDetectionStrategy,
): string | undefined {
  switch (strategy.kind) {
    case "timebox": {
      const { timeframe } = strategy as TimeboxStrategy;
      if (comment.isWithinTimeframe(timeframe)) {
        return comment._body;
      }
      break;
    }
    case "marker": {
      const { marker, timeframe } = strategy as MarkerStrategy;
      if (comment.hasMarker(marker)) {
        if (!timeframe || comment.isWithinTimeframe(timeframe)) {
          return comment._body;
        }
      }
      break;
    }
    case "section": {
      const { section: sectionName, timeframe } = strategy as SectionStrategy;
      const section = comment.section(sectionName);
      if (section !== undefined) {
        // TODO: Very unoptimized
        // Comments are sorted by createdAt, so they can be partitioned in advance
        if (!timeframe || comment.isWithinTimeframe(timeframe)) {
          return section;
        }
      }
      break;
    }
  }
  return undefined;
}

const memoizedExtractUpdateWithStrategy = memoize(extractUpdateWithStrategy, {
  cacheKey: ([comment, strategy]) => comment.url + JSON.stringify(strategy),
});
