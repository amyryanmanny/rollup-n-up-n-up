export function isTrueString(value: unknown): boolean {
  // Check against "true" sentinels users might input.
  if (typeof value !== "string") {
    return false;
  }
  return (
    value === "true" ||
    value === "1" ||
    value === "yes" ||
    value === "on" ||
    value === "enabled"
  );
}

export function isFalseString(value: unknown): boolean {
  // Check against "false" sentinels users might input.
  if (typeof value !== "string") {
    return false;
  }
  return (
    value === "false" ||
    value === "0" ||
    value === "no" ||
    value === "off" ||
    value === "disabled"
  );
}

// I always hate seeing these, but yet here we are.
// Good for collecting user input in a robust, reusable way.
export function isTruthy(value: unknown): boolean {
  if (typeof value === "string") {
    if (isTrueString(value)) {
      return true;
    } else if (isFalseString(value)) {
      return false; // Explicitly false string
    }
    // For any other strings, fallback to truthiness check
  }
  if (Array.isArray(value)) {
    // Empty arrays are not truthy, sorry Javascript.
    return value.length > 0;
  }
  return Boolean(value);
}
