export function parseExpressionToItems(expression: string): string[] {
  // Step 1: Split the expression by 'and' and 'or'
  const logicalParts = expression.split(/\s+(and|or)\s+/);

  // Step 2: Extract items from each part
  const items = logicalParts.flatMap((part) => {
    const match = part.match(/(.+?)\s*[<>]=?\s*\d+(\.\d+)?/);
    return match ? [match[1].trim()] : [];
  });

  // Remove duplicates
  return [...new Set(items)];
}

export function parseExpressionDetailed(
  expression: string
): (string[] | string)[] {
  // Split the expression by 'and' and 'or', but keep the logical operators
  const parts = expression.split(/\s+(and|or)\s+/);

  return parts.map((part) => {
    if (part.toLowerCase() === "and" || part.toLowerCase() === "or") {
      return [part.toLowerCase()];
    }

    const match = part.match(/(.+?)\s*([<>]=?)\s*(\d+(\.\d+)?)/);
    if (match) {
      const [, item, operator, value] = match;
      return [item.trim(), operator, value];
    }

    return [part.trim()]; // For any unrecognized parts
  });
}
