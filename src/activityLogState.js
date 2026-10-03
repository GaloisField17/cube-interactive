export const MAX_ACTIVITY_COUNT = 1000;

function cloneAndFreeze(value) {
  const clone = structuredClone(value);

  function freezeRecursively(item, seen = new WeakSet()) {
    if (item === null || typeof item !== "object" || seen.has(item)) {
      return item;
    }

    seen.add(item);

    for (const child of Object.values(item)) {
      freezeRecursively(child, seen);
    }

    return Object.freeze(item);
  }

  return freezeRecursively(clone);
}

function getFilterKey(parent, focus) {
  return JSON.stringify([parent, focus]);
}

function isResetOrImport(activity) {
  return activity.kind === "reset" || activity.kind === "import";
}

function hasRevertValues(activity) {
  return (
    Object.hasOwn(activity, "from") &&
    Object.hasOwn(activity, "to") &&
    areValidRevertValues(activity.from, activity.to)
  );
}

function areValidRevertValues(from, to) {
  if (from === null || to === null || typeof from !== typeof to) {
    return false;
  }

  if (
    typeof from === "object" &&
    !Array.isArray(from) &&
    (Object.keys(from).length === 0 || Object.keys(to).length === 0)
  ) {
    return false;
  }

  return (
    (typeof from !== "object" || Array.isArray(from) === Array.isArray(to)) &&
    isValidValue(from) &&
    isValidValue(to)
  );
}

function isValidValue(value) {
  if (value === null) {
    return true;
  }
  if (typeof value === "number") {
    if (Number.isFinite(value)) {
      return true;
    }
  }
  if (typeof value === "string" || typeof value === "boolean") {
    return true;
  }
  if (Array.isArray(value)) {
    return value.every(isValidValue);
  }
  if (typeof value === "object") {
    return Object.values(value).every(isValidValue);
  }

  return false;
}

function compareActivities(first, second) {
  return (
    second.timestampValue - first.timestampValue ||
    second.sequence - first.sequence
  );
}

function validateActivity(activity, existingIds) {
  if (!activity || typeof activity !== "object" || Array.isArray(activity)) {
    throw new TypeError("An activity must be an object.");
  }

  for (const field of [
    "id",
    "timestamp",
    "kind",
    "parent",
    "focus",
    "filterFocus",
    "description",
  ]) {
    if (typeof activity[field] !== "string" || activity[field].length === 0) {
      throw new TypeError(`Activity field "${field}" must be a non-empty string.`);
    }
  }

  if (!["change", "reset", "import", "jump", "revert"].includes(activity.kind)) {
    throw new TypeError('Activity field "kind" is not supported.');
  }

  if (!Number.isFinite(Date.parse(activity.timestamp))) {
    throw new TypeError('Activity field "timestamp" must be a valid date string.');
  }

  if (
    !Object.hasOwn(activity, "snapshot") ||
    !activity.snapshot ||
    typeof activity.snapshot !== "object"
  ) {
    throw new TypeError('Activity field "snapshot" must be an object.');
  }

  if (existingIds.has(activity.id)) {
    throw new Error(`Activity ID "${activity.id}" already exists.`);
  }

  const hasFrom = Object.hasOwn(activity, "from");
  const hasTo = Object.hasOwn(activity, "to");

  if (
    hasFrom !== hasTo ||
    (hasFrom && (activity.from === undefined || activity.to === undefined))
  ) {
    throw new TypeError(
      'Activity fields "from" and "to" must be provided together.',
    );
  }
}

export function createActivityLogState() {
  let activities = [];
  let selectedActivityId = null;
  let selectedFilterKeys = new Set();
  let nextSequence = 0;

  function getFilterOptions() {
    const focusesByParent = new Map();

    for (const { activity } of activities) {
      if (!focusesByParent.has(activity.parent)) {
        focusesByParent.set(activity.parent, new Set());
      }

      focusesByParent.get(activity.parent).add(activity.filterFocus);
    }

    const options = [];

    for (const parent of [...focusesByParent.keys()].sort((a, b) =>
      a.localeCompare(b),
    )) {
      options.push({
        key: getFilterKey(parent, null),
        type: "parent",
        parent,
        focus: null,
        label: parent,
      });

      for (const focus of [...focusesByParent.get(parent)].sort((a, b) =>
        a.localeCompare(b),
      )) {
        options.push({
          key: getFilterKey(parent, focus),
          type: "focus",
          parent,
          focus,
          label: `${parent} - ${focus}`,
        });
      }
    }

    return options;
  }

  function pruneUnavailableFilters() {
    const availableKeys = new Set(getFilterOptions().map(({ key }) => key));

    selectedFilterKeys = new Set(
      [...selectedFilterKeys].filter((key) => availableKeys.has(key)),
    );
  }

  function getVisibleActivities() {
    if (selectedFilterKeys.size === 0) {
      return activities.map(({ activity }) => activity);
    }

    return activities
      .filter(({ activity }) => {
        if (selectedFilterKeys.has(getFilterKey(activity.parent, null))) {
          return true;
        }

        return selectedFilterKeys.has(
          getFilterKey(activity.parent, activity.filterFocus),
        );
      })
      .map(({ activity }) => activity);
  }

  function setFilters(filters) {
    if (!Array.isArray(filters)) {
      throw new TypeError("Filters must be an array.");
    }

    const availableOptions = new Map(
      getFilterOptions().map((option) => [option.key, option]),
    );
    const nextFilterKeys = new Set();

    for (const filter of filters) {
      if (!filter || typeof filter.parent !== "string") {
        throw new TypeError("Each filter must specify a Parent.");
      }

      const focus = filter.focus ?? null;
      const key = getFilterKey(filter.parent, focus);

      if (!availableOptions.has(key)) {
        throw new RangeError("The selected filter does not exist in the activity log.");
      }

      nextFilterKeys.add(key);
    }

    selectedFilterKeys = nextFilterKeys;
    selectedActivityId = null;
  }

  function addActivity(activity) {
    const existingIds = new Set(activities.map(({ activity: item }) => item.id));

    validateActivity(activity, existingIds);

    const immutableActivity = cloneAndFreeze(activity);

    activities.push({
      activity: immutableActivity,
      timestampValue: Date.parse(immutableActivity.timestamp),
      sequence: nextSequence,
    });
    nextSequence += 1;
    activities.sort(compareActivities);

    if (activities.length > MAX_ACTIVITY_COUNT) {
      activities.length = MAX_ACTIVITY_COUNT;
    }

    if (!activities.some(({ activity: item }) => item.id === selectedActivityId)) {
      selectedActivityId = null;
    }

    pruneUnavailableFilters();

    return immutableActivity;
  }

  function getActivity(activityId) {
    return (
      activities.find(({ activity }) => activity.id === activityId)?.activity ??
      null
    );
  }

  function selectActivity(activityId) {
    if (activityId === null) {
      selectedActivityId = null;
      return;
    }

    const activity = getActivity(activityId);

    if (!activity) {
      throw new RangeError(`Activity "${activityId}" does not exist.`);
    }

    if (!getVisibleActivities().some((item) => item.id === activityId)) {
      throw new RangeError(
        `Activity "${activityId}" is hidden by the active filters.`,
      );
    }

    selectedActivityId = activityId;
  }

  function getSelectedFilters() {
    return getFilterOptions().filter(({ key }) => selectedFilterKeys.has(key));
  }

  function canRevert(activityId = selectedActivityId) {
    const activity = getActivity(activityId);

    return Boolean(
      activity &&
        activity.revertible !== false &&
        !isResetOrImport(activity) &&
        hasRevertValues(activity),
    );
  }

  return {
    addActivity,
    canRevert,
    clearSelection() {
      selectedActivityId = null;
    },
    getActivities() {
      return activities.map(({ activity }) => activity);
    },
    getActivity,
    getFilterOptions,
    getSelectedActivity() {
      return getActivity(selectedActivityId);
    },
    getSelectedFilters,
    getVisibleActivities,
    isFilterEnabled() {
      const distinctTypes = new Set(
        activities.map(({ activity }) =>
          getFilterKey(activity.parent, activity.filterFocus),
        ),
      );

      return distinctTypes.size > 1;
    },
    selectActivity,
    setFilters,
  };
}
