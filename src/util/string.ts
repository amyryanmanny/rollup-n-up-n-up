export const toSnakeCase = (str: string): string => {
  // Convert a string to snake_case
  return str
    .replace(/([a-z])([A-Z])/g, "$1_$2") // Add underscore before uppercase letters
    .replace(/\s+/g, "_") // Replace spaces with underscores
    .toLowerCase(); // Convert to lowercase
};

export const splitMarkdownByHeaders = (
  markdown: string,
): Map<string, string> => {
  // Thanks Copilot
  const headerRegex = /^#+\s+(.*)$/gm;
  const sections = new Map<string, string>();
  let match: RegExpExecArray | null;
  let lastHeader: string | null = null;
  let lastIndex = 0;

  while ((match = headerRegex.exec(markdown)) !== null) {
    if (lastHeader !== null) {
      sections.set(lastHeader, markdown.slice(lastIndex, match.index).trim());
    }
    lastHeader = toSnakeCase(match[1].trim());
    lastIndex = match.index + match[0].length;
  }

  if (lastHeader !== null) {
    sections.set(lastHeader, markdown.slice(lastIndex).trim());
  }

  return sections;
};

export const stripHtml = (s: string): string => {
  // Remove HTML comments from the markdown
  return s.replace(
    /<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<.*?>|<!--[\s\S]*?-->/g,
    "",
  );
};
