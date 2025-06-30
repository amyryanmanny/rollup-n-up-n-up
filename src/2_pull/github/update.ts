import { getUpdateDetectionConfig } from "@util/config/update";
import { CommentWrapper } from "./comment";

export type UpdateDetectionKind = "marker" | "section" | "skip";
export type UpdateDetectionStrategy =
  | MarkerStrategy
  | SectionStrategy
  | SkipStrategy;

type MarkerStrategy = {
  kind: "marker";
  marker: RegExp;
};

type SectionStrategy = {
  kind: "section";
  name: string;
};

type SkipStrategy = {
  kind: "skip";
};

export const DEFAULT_MARKER = RegExp(/<(!--\s*UPDATE\s*--)>/g); // TODO: Custom marker as input

export function findLatestUpdate(
  comments: CommentWrapper[],
): CommentWrapper | undefined {
  const config = getUpdateDetectionConfig();

  console.log(JSON.stringify(config, null, 2));
  for (const comment of comments) {
    for (const strategy of config.strategies) {
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

// TODO: Memoize
export function extractUpdate(comment: CommentWrapper): string | undefined {
  const config = getUpdateDetectionConfig();

  for (const strategy of config.strategies) {
    const update = extractUpdateWithStrategy(comment, strategy);
    if (update !== undefined) {
      return update;
    }
  }
  return undefined;
}

// TODO: Memoize
function extractUpdateWithStrategy(
  comment: CommentWrapper,
  strategy: UpdateDetectionStrategy,
): string | undefined {
  switch (strategy.kind) {
    case "marker": {
      const { marker } = strategy as MarkerStrategy;
      if (comment.hasMarker(marker)) {
        // SIDE_EFFECT: Remove the marker
        comment.removeUpdateMarker(marker);
        return comment._body; // Return the body after removing the marker
      }
      break;
    }
    case "section": {
      const { name: sectionName } = strategy as SectionStrategy;
      const section = comment.section(sectionName);
      if (section !== undefined) {
        return section;
      }
      break;
    }
    case "skip": {
      break; // Doesn't mean anything to the individual comment, only the list
    }
  }
  return undefined;
}
