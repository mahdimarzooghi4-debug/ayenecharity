const SENSITIVE_KEY_PATTERN =
  /(password|passwd|secret|token|authorization|cookie|session|cardnumber|accountnumber|receiptbody|filebody)/i;

const SECRET_TEXT_PATTERNS: Array<[RegExp, string]> = [
  [/Bearer\s+[A-Za-z0-9._~+\/-]+=*/gi, "Bearer [REDACTED]"],
  [/(ayene_admin_session=)[^;\s]+/gi, "$1[REDACTED]"],
  [/([?&](?:token|secret|password|session)=)[^&#\s]+/gi, "$1[REDACTED]"],
];

export function redactText(value: string): string {
  return SECRET_TEXT_PATTERNS.reduce(
    (current, [pattern, replacement]) =>
      current.replace(pattern, replacement),
    value,
  );
}

export function redactValue(
  value: unknown,
  depth = 0,
): unknown {
  if (depth > 5) return "[TRUNCATED]";

  if (typeof value === "string") {
    return redactText(value);
  }

  if (
    value === null ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "undefined"
  ) {
    return value;
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactText(value.message),
    };
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, depth + 1));
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(
        ([key, item]) => [
          key,
          SENSITIVE_KEY_PATTERN.test(key)
            ? "[REDACTED]"
            : redactValue(item, depth + 1),
        ],
      ),
    );
  }

  return String(value);
}
