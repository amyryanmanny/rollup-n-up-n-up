import memoize from "memoize";

import { getUpdateDetectionConfig } from "@util/config/update";
import { CommentWrapper } from "./comment";

export type UpdateDetectionKind = "marker" | "section" | "skip";
export type UpdateDetectionStrategy =
  | MarkerStrategy
  | SectionStrategy
  | SkipStrategy;

export type Timeframe = "last-week" | "last-month" | "last-year" | "all-time";

type MarkerStrategy = {
  kind: "marker";
  marker: RegExp;
  timeframe?: Timeframe;
};

type SectionStrategy = {
  kind: "section";
  section: string;
  timeframe?: Timeframe;
};

type SkipStrategy = {
  kind: "skip";
};

export function findLatestUpdate(
  comments: CommentWrapper[],
): CommentWrapper | undefined {
  const { strategies } = getUpdateDetectionConfig();

  for (const strategy of strategies) {
    for (const comment of comments) {
      if (strategy.kind === "skip") {
        // If we've reached this strategy, we couldn't find an update
        // And we don't want to return the latest comment
        return undefined;
      }
      const update = extractUpdateWithStrategy(comment, strategy);
      if (update !== undefined) {
        return comment;
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
    case "skip": {
      break; // Doesn't mean anything to the individual comment, only the list
    }
  }
  return undefined;
}

const memoizedExtractUpdateWithStrategy = memoize(extractUpdateWithStrategy, {
  cacheKey: ([comment, strategy]) => comment.url + JSON.stringify(strategy),
});
