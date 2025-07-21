import memoize from "memoize";

import { UpdateDetection } from "@util/config/update";
import { CommentWrapper } from "./comment";

export type UpdateDetectionStrategy =
  | TimeboxStrategy
  | SectionStrategy
  | MarkerStrategy
  | SkipStrategy
  | BlameStrategy
  | FailStrategy;

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

type BlameStrategy = {
  kind: "blame";
  // TODO: Add special blame behavior beyond skip. E.g. Slack messages
};

type FailStrategy = {
  kind: "fail";
};

export function findLatestUpdate(
  comments: CommentWrapper[],
): CommentWrapper | undefined {
  const updateDetection = UpdateDetection.getInstance();

  for (const strategy of updateDetection.strategies) {
    for (const comment of comments) {
      switch (strategy.kind) {
        case "timebox":
        case "section":
        case "marker": {
          // TODO: Timeframe short circuit
          const update = memoizedExtractUpdateWithStrategy(comment, strategy);
          if (update !== undefined) {
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
  const updateDetection = UpdateDetection.getInstance();

  for (const strategy of updateDetection.strategies) {
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
  if (comment.isEmpty) {
    // Empty comment isn't an update no matter the strategy
    return undefined;
  }

  // Check timeframe first
  if ("timeframe" in strategy) {
    const { timeframe } = strategy;
    if (timeframe && !comment.isWithinTimeframe(timeframe)) {
      return undefined;
    }
  }

  switch (strategy.kind) {
    case "timebox": {
      return comment._body;
    }
    case "marker": {
      const { marker } = strategy as MarkerStrategy;
      if (comment.hasMarker(marker)) {
        return comment._body;
      }
      break;
    }
    case "section": {
      const { section: sectionName } = strategy as SectionStrategy;
      const section = comment.section(sectionName);
      if (section !== undefined && section.trim() !== "") {
        return section;
      }
      break;
    }
  }

  return undefined;
}

const memoizedExtractUpdateWithStrategy = memoize(extractUpdateWithStrategy, {
  cacheKey: ([comment, strategy]) => comment.url + JSON.stringify(strategy),
});
