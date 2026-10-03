import assert from "node:assert/strict";
import test from "node:test";
import {
  createActivityLogState,
  MAX_ACTIVITY_COUNT,
} from "../src/activityLogState.js";

function createActivity(
  id,
  parent,
  focus,
  filterFocus = focus,
  timestamp = "2026-10-02T12:00:00.000Z",
  additional = {},
) {
  return {
    id,
    timestamp,
    kind: "change",
    parent,
    focus,
    filterFocus,
    description: `${parent}: ${focus} changed`,
    snapshot: { setup: { id } },
    ...additional,
  };
}

test("activities are ordered newest first and newer inserts win timestamp ties", () => {
  const log = createActivityLogState();

  log.addActivity(createActivity(
    "older",
    "Cube",
    "Size",
    "Size",
    "2026-10-01T12:00:00.000Z",
  ));
  log.addActivity(createActivity(
    "equal-first",
    "Cube",
    "Gap",
    "Gap",
    "2026-10-02T12:00:00.000Z",
  ));
  log.addActivity(createActivity(
    "equal-second",
    "Rotation",
    "Insert",
    "Insert",
    "2026-10-02T12:00:00.000Z",
  ));

  assert.deepEqual(
    log.getActivities().map(({ id }) => id),
    ["equal-second", "equal-first", "older"],
  );
});

test("activity log retains at most 1000 newest activities", () => {
  const log = createActivityLogState();
  const baseTime = Date.parse("2026-10-01T00:00:00.000Z");

  for (let index = 0; index <= MAX_ACTIVITY_COUNT; index += 1) {
    log.addActivity(createActivity(
      `activity-${index}`,
      "Rotation",
      "Insert",
      "Insert",
      new Date(baseTime + index * 1000).toISOString(),
    ));
  }

  const activities = log.getActivities();

  assert.equal(activities.length, MAX_ACTIVITY_COUNT);
  assert.equal(activities[0].id, `activity-${MAX_ACTIVITY_COUNT}`);
  assert.equal(activities.at(-1).id, "activity-1");
});

test("filter options are unique and sorted Parent-first then Parent-Focus", () => {
  const log = createActivityLogState();

  log.addActivity(createActivity("duration", "Rotation", "Duration"));
  log.addActivity(createActivity("insert", "Rotation", "Insert"));
  log.addActivity(createActivity("global-size", "Cube", "Size (Global)", "Size"));
  log.addActivity(createActivity("cubie-size", "Cube", "Size (UFR)", "Size"));

  assert.deepEqual(
    log.getFilterOptions().map(({ label, type }) => [label, type]),
    [
      ["Cube", "parent"],
      ["Cube - Size", "focus"],
      ["Rotation", "parent"],
      ["Rotation - Duration", "focus"],
      ["Rotation - Insert", "focus"],
    ],
  );
});

test("filter enablement requires more than one Parent-Focus type", () => {
  const log = createActivityLogState();

  assert.equal(log.isFilterEnabled(), false);
  log.addActivity(createActivity("first", "Rotation", "Insert"));
  log.addActivity(createActivity("second", "Rotation", "Insert"));
  assert.equal(log.isFilterEnabled(), false);

  log.addActivity(createActivity("third", "Rotation", "Duration"));
  assert.equal(log.isFilterEnabled(), true);
});

test("Parent filters include all its focuses and multiple focus filters combine", () => {
  const log = createActivityLogState();

  log.addActivity(createActivity("duration", "Rotation", "Duration"));
  log.addActivity(createActivity("insert", "Rotation", "Insert"));
  log.addActivity(createActivity("size", "Cube", "Size (Global)", "Size"));

  log.setFilters([{ parent: "Rotation" }]);
  assert.deepEqual(
    log.getVisibleActivities().map(({ id }) => id),
    ["insert", "duration"],
  );

  log.setFilters([
    { parent: "Rotation", focus: "Duration" },
    { parent: "Cube", focus: "Size" },
  ]);
  assert.deepEqual(
    log.getVisibleActivities().map(({ id }) => id),
    ["size", "duration"],
  );

  log.setFilters([]);
  assert.equal(log.getVisibleActivities().length, 3);
});

test("setting filters clears selection and only visible activities may be selected", () => {
  const log = createActivityLogState();

  log.addActivity(createActivity("duration", "Rotation", "Duration"));
  log.addActivity(createActivity("size", "Cube", "Size", "Size"));
  log.selectActivity("duration");
  assert.equal(log.getSelectedActivity().id, "duration");

  log.setFilters([{ parent: "Cube" }]);
  assert.equal(log.getSelectedActivity(), null);
  assert.throws(() => log.selectActivity("duration"), /hidden by the active filters/u);
  log.selectActivity("size");
  log.clearSelection();
  assert.equal(log.getSelectedActivity(), null);
});

test("recorded activities are detached immutable copies", () => {
  const log = createActivityLogState();
  const activity = createActivity("size", "Cube", "Size", "Size", undefined, {
    from: { value: 1 },
    to: { value: 2 },
  });

  activity.timestamp = "2026-10-02T12:00:00.000Z";
  const recorded = log.addActivity(activity);
  activity.snapshot.setup.id = "mutated";
  activity.from.value = 10;

  assert.equal(recorded.snapshot.setup.id, "size");
  assert.equal(recorded.from.value, 1);
  assert.equal(Object.isFrozen(recorded), true);
  assert.equal(Object.isFrozen(recorded.snapshot.setup), true);
  assert.throws(() => {
    recorded.snapshot.setup.id = "changed";
  }, TypeError);
});

test("Revert requires from/to values and excludes reset and import activities", () => {
  const log = createActivityLogState();

  log.addActivity(createActivity("setting", "Cube", "Size", "Size", undefined, {
    from: 1,
    to: 2,
  }));
  log.addActivity(createActivity("reset", "Colors", "Reset", "Reset", undefined, {
    kind: "reset",
    from: { value: "old" },
    to: { value: "default" },
  }));
  log.addActivity(createActivity("import", "Import", "Settings", "Settings", undefined, {
    kind: "import",
    from: { setup: "old" },
    to: { setup: "new" },
  }));
  log.addActivity(createActivity("no-values", "Rotation", "Insert"));
  log.addActivity(createActivity("null-values", "View", "Setting", "Setting", undefined, {
    from: null,
    to: null,
  }));
  log.addActivity(createActivity("mismatched-values", "View", "Setting", "Setting", undefined, {
    from: 1,
    to: "2",
  }));
  log.addActivity(createActivity("invalid-values", "View", "Setting", "Setting", undefined, {
    from: { first: Number.NaN },
    to: { first: 1 },
  }));
  log.addActivity(createActivity("different-shapes", "View", "Setting", "Setting", undefined, {
    from: { first: 1 },
    to: { second: 2 },
  }));

  assert.equal(log.canRevert("setting"), true);
  assert.equal(log.canRevert("reset"), false);
  assert.equal(log.canRevert("import"), false);
  assert.equal(log.canRevert("no-values"), false);
  assert.equal(log.canRevert("null-values"), false);
  assert.equal(log.canRevert("mismatched-values"), false);
  assert.equal(log.canRevert("invalid-values"), false);
  assert.equal(log.canRevert("different-shapes"), true);

  log.addActivity(createActivity("jump", "Jump", "Past State", "Past State", undefined, {
    kind: "jump",
    from: { setup: "before" },
    to: { setup: "after" },
  }));
  assert.equal(log.canRevert("jump"), true);
});

test("evicting the selected oldest activity clears the selection", () => {
  const log = createActivityLogState();
  const selected = createActivity(
    "oldest",
    "Rotation",
    "Insert",
    "Insert",
    "2020-01-01T00:00:00.000Z",
  );

  log.addActivity(selected);
  log.selectActivity(selected.id);

  for (let index = 0; index < MAX_ACTIVITY_COUNT; index += 1) {
    log.addActivity(createActivity(
      `newer-${index}`,
      "Rotation",
      "Insert",
      "Insert",
      new Date(Date.parse("2021-01-01T00:00:00.000Z") + index * 1000)
        .toISOString(),
    ));
  }

  assert.equal(log.getActivity(selected.id), null);
  assert.equal(log.getSelectedActivity(), null);
});

test("duplicate IDs and incomplete from/to pairs are rejected", () => {
  const log = createActivityLogState();

  log.addActivity(createActivity("unique", "Rotation", "Insert"));
  assert.throws(
    () => log.addActivity(createActivity("unique", "Rotation", "Remove")),
    /already exists/u,
  );
  assert.throws(
    () => log.addActivity(createActivity(
      "incomplete",
      "Cube",
      "Size",
      "Size",
      undefined,
      { from: 1 },
    )),
    /provided together/u,
  );
});
