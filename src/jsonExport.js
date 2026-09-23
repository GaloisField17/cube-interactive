export const JSON_EXPORT_VERSION = 1;

function isObject(value) {
  return value !== null && typeof value === "object";
}

export function omitDefaultValues(value, defaults) {
  if (Array.isArray(value)) {
    const defaultArray = Array.isArray(defaults) ? defaults : [];

    return JSON.stringify(value) === JSON.stringify(defaultArray)
      ? undefined
      : value;
  }

  if (isObject(value)) {
    const result = {};

    for (const [key, item] of Object.entries(value)) {
      const difference = omitDefaultValues(item, defaults?.[key]);

      if (difference !== undefined) {
        result[key] = difference;
      }
    }

    return Object.keys(result).length > 0 ? result : undefined;
  }

  return value === defaults ? undefined : value;
}

export function createJsonExport(setup, defaultSetup, exportedAt = new Date()) {
  return {
    version: JSON_EXPORT_VERSION,
    exportedAt: exportedAt.toISOString().replace(/\.\d{3}Z$/, "Z"),
    setup: omitDefaultValues(setup, defaultSetup) ?? {},
  };
}
