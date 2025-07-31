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

export function findLatestUpdates(
  comments: CommentWrapper[],
  n: number = 1,
): CommentWrapper[] | undefined {
  if (comments.length === 0) {
    return undefined; // No comments to process
  }

  const updates = comments.filter((comment) => comment.isUpdate);
  if (updates.length > 0) {
    return updates.slice(0, n);
  }

  // Handle the special fallback strategies
  const updateDetection = UpdateDetection.getInstance();
  for (const strategy of updateDetection.strategies) {
    switch (strategy.kind) {
      case "skip":
      case "blame":
        return undefined; // Return no comment
      case "fail": {
        const issue = comments[0].issue;
        throw new Error(
          `No valid update found for issue ${issue.title} - ${issue.url}!`,
        );
      }
    }
  }

  return comments.slice(0, n); // Default strategy is to return latest comment(s)
}

export function extractUpdate(comment: CommentWrapper): string | undefined {
  const updateDetection = UpdateDetection.getInstance();

  for (const strategy of updateDetection.strategies) {
    const update = memoizedExtractUpdateWithStrategy(comment, strategy);
    if (update !== undefined) {
      return update;
    }
  }

  return undefined;
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
