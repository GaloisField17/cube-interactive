# Ideas To Implement

- Activity Log

## Activity Log

### Purpose

The Activity Log button opens a session-only log of meaningful setup changes,
ordered newest first. Each activity shows its Parent, Focus, description, and
completion time. The log holds up to 1,000 activities and is cleared when the
app starts fresh.

### Controls and behavior

- **Filter** — Multi-select Parent and Parent–Focus options, sorted by Parent
  and then Focus, with Parents listed first. Selecting a Parent includes all
  its Focuses. Filter is disabled for an empty log or when only one distinct
  Parent–Focus group exists.
- **Revert** — Apply the selected activity's inverse to the current setup and
  add a new activity; do not change or remove the original. Available only
  when both `from` and `to` contain valid, applicable values. Do not require
  the current value to match `to`. Reset and Import activities cannot be
  reverted.
- **Jump** — Restore the setup snapshot from immediately after the selected
  activity and record the Jump as a new activity.

All three controls are disabled when unavailable. Revert and Jump require a
selection; Reset and Import selections disable Revert. At most one activity
can be selected. Using Filter, Revert, or Jump clears the selection. Activity
rows have button-like hover behavior. Dedicated keyboard navigation is out of
scope for now.

Filter options use canonical Focus groups without target qualifiers. For
example, activities `Rotation: Duration`, `Rotation: Insert`, and
`Cube: Size (Global)` produce `Cube`, `Cube - Size`, `Rotation`,
`Rotation - Duration`, and `Rotation - Insert`.

### Activity catalog

Each activity has a **Parent** (broad category), **Focus** (setting changed),
and a concise, natural-English description. Implemented description templates
are listed below for reference. Distinguish displayed values with inline code
styling. Format values readably: durations
in seconds, colors as color values, visibility as shown/hidden, and dimensions
with consistent precision. Use human-readable facelet/cubie position names
(such as `UFR`) and group names (`Centers`, `Edges`, `Corners`, `Core`).
Grouped controls create one activity for the exact group changed.

| Parent          | Focus                            | Changes to log                                                                       |
| --------------- | -------------------------------- | ------------------------------------------------------------------------------------ |
| Rotation        | Duration                         | Rotation animation duration.                                                         |
| Rotation        | Insert                           | A rotation is inserted into the sequence.                                            |
| Rotation        | Remove                           | A rotation is removed from the sequence.                                             |
| Rotation        | Edit                             | The sequence is edited or a rotation is replaced.                                    |
| Cube            | Size (Global)                    | Global size change.                                                                  |
| Cube            | Gap (Global)                     | Global gap change.                                                                   |
| Cube            | Size (position or group)         | Size change for one cubie or a group.                                                |
| Cube            | Gap (position or group)          | Gap change for one cubie or a group.                                                 |
| Camera          | Orbit                            | Completed orbit; describe azimuth/elevation changes in degrees.                      |
| Camera          | Pan                              | Completed pan; describe camera-relative horizontal/vertical changes.                 |
| Camera          | Zoom                             | Completed zoom; describe zoom level as a percentage of default distance.             |
| View            | Transparent Stickers             | Whether stickers hidden behind the cube are shown with a dimmed, transparent effect. |
| View            | Peek Stickers                    | Whether hidden stickers use the peek effect.                                         |
| View            | Peek Sticker Depth               | Depth of the peek effect.                                                            |
| View            | Peek Hide Color                  | Color used to hide stickers from the peek effect.                                    |
| Colors          | Outer Facelet (position)         | Color of one facelet.                                                                |
| Colors          | Outer Facelet (face)             | Color of all outer facelets on one face.                                             |
| Colors          | Outer Facelet (All)              | Color of all outer facelets.                                                         |
| Colors          | Inner Cubie (position)           | Inner color of one cubie.                                                            |
| Colors          | Inner Cubie (All)                | Inner color of all cubies.                                                           |
| Colors          | Facelet Label (position)         | Color of one facelet label.                                                          |
| Colors          | Facelet Label (face)             | Color of facelet labels on one face.                                                 |
| Colors          | Facelet Label (All)              | Color of all facelet labels.                                                         |
| Colors          | Axis Label (face)                | Color of one axis label.                                                             |
| Colors          | Axis Label (All)                 | Color of all axis labels.                                                            |
| Colors          | Rotation Arrow (face)            | Color of one rotation arrow.                                                         |
| Colors          | Rotation Arrow (All)             | Color of all rotation arrows.                                                        |
| Labels          | Facelet Labels                   | Whether facelet labels are shown.                                                    |
| Labels          | Facelet Label Visibility         | Always visible or hidden behind the cube.                                            |
| Labels          | Facelet Label Depth              | Depth of facelet labels.                                                             |
| Labels          | Axis Labels                      | Whether axis labels are shown.                                                       |
| Labels          | Axis Label (face) Visibility     | Whether one face's axis label is shown.                                              |
| Labels          | Axis Label Visibility            | Always visible or hidden behind the cube.                                            |
| Labels          | Axis Label Format                | Custom text, Cartesian coordinates, or face names.                                   |
| Labels          | Axis Label Text (face)           | Custom text for one face; log only in custom format.                                 |
| Labels          | Axis Label Depth                 | Depth of axis labels.                                                                |
| Labels          | Axis Arrows                      | Whether axis arrows are shown.                                                       |
| Labels          | Axis Arrow (face) Visibility     | Whether one face's axis arrow is shown.                                              |
| Labels          | Axis Arrow Visibility            | Always visible or hidden behind the cube.                                            |
| Labels          | Axis Arrow Depth                 | Depth of axis arrows.                                                                |
| Labels          | Rotation Arrows                  | Whether rotation arrows are shown.                                                   |
| Labels          | Rotation Arrow (face) Visibility | Whether one face's rotation arrow is shown.                                          |
| Labels          | Rotation Arrow Visibility        | Always visible or hidden behind the cube.                                            |
| Labels          | Rotation Arrow Depth             | Depth of rotation arrows.                                                            |
| Labels          | Rotation Arrow Thickness         | Thickness of rotation arrows.                                                        |
| Labels          | Rotation Arrow Radius            | Radius of rotation arrows.                                                           |
| Labels          | Rotation Arrow Direction         | Clockwise or counter-clockwise direction.                                            |
| Export / Import | Automatically export on exit     | Whether the current setup should be automatically exported when leaving the app.     |

Settings added to the app must be added to this catalog when they should be
logged. Do not silently omit an in-scope change.

### Composite activities

Accepted changes only are recorded: no intermediate typing, invalid inputs,
or no-ops. Continuous edits and camera gestures create one activity when the
interaction ends. Programmatic camera changes made by Import, Reset, Jump, or
Revert are included in that operation and do not create separate camera
activities.

Resets create one summary activity rather than one per changed field. Use the
reset Parent and Focus; describe an individual reset as
`Parent: Focus were reset using the individual reset button.` Reset to Defaults
creates `Setup: Settings were reset to defaults.` Import creates
`Export / Import: Imported Settings` with the description
`Settings were manually imported as JSON.` These summaries are not
revertible.

Reset Rotation creates two activities at the same timestamp: one for
`Rotation: Settings` and one for `Camera: Settings`. Both use
`Settings were reset using the individual reset button.`

Jump creates `Jump: Past State` with a snapshot of the restored state.
Reverting a Jump restores the full setup from before that Jump.

### Activity data

Store each activity as an immutable record containing:

- `id`: unique identifier.
- `timestamp`: ISO 8601 completion time, displayed locally as
  `DD MMM YYYY at HH:mm:ss`.
- `kind`: `change`, `reset`, `import`, `jump`, or `revert`.
- `parent`, `focus`: catalog names, including a target qualifier when
  applicable.
- `filterFocus`: canonical Focus group without a target qualifier.
- `description`: readable text shown in the log.
- `descriptionParts`: optional rich-text segments, including inline code and
  links to related activities.
- `from`, `to`: optional typed values for the affected setting; required and
  applicable for Revert.
- `snapshot`: immutable full setup immediately after the activity, including
  camera state, used by Jump.

Capture `from` and `to` at the same scope and data type. Omit them when an
operation has no single applicable before/after value, such as Reset or
Import. Camera descriptions use Orbit, Pan, or Zoom and readable values, not
raw position/target vectors.

### Exclusions

- Starting, pausing, stopping, or navigating animation (Next, Previous, Go to
  Start, Go to End).
- Scrolling rotation text or selecting an individual rotation instance.
- Expanding or collapsing UI panels or boxes.
- Camera changes other than completed Orbit, Pan, and Zoom gestures.

### Description templates

Implemented description reference. The Parent and Focus are shown separately
from the descriptions. Values use inline code. `{from}`, `{to}`, and `{target}`
stand for the previous value, new value, and affected item/group.

| Activity                                       | Draft description                                                                                                                                                                |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ---------- |
| Rotation — Duration                            | `Duration was changed from {from}s to {to}s.`                                                                                                                                    |
| Rotation — Insert                              | `{move} was inserted. The rotation sequence is now {sequence}.` Show the entire resulting sequence.                                                                              |
| Rotation — Remove                              | `{move} was removed. The rotation sequence is now {sequence}.` Show the entire resulting sequence.                                                                               |
| Rotation — Edit                                | `After the edit, the rotation sequence is now {sequence}.` Show the entire resulting sequence.                                                                                   |
| Cube — Size (Global)                           | `Size of all cubies was changed globally from {from} to {to}.`                                                                                                                   |
| Cube — Gap (Global)                            | `Gap between all cubies was changed globally from {from} to {to}.`                                                                                                               |
| Cube — Size (position or group)                | `Size of {target} was changed from {from} to {to}.`                                                                                                                              |
| Cube — Gap (position or group)                 | `Gap of {target} was changed from {from} to {to}.`                                                                                                                               |
| Camera — Orbit                                 | `Camera was orbited to azimuth {azimuth}° and elevation {elevation}°.`                                                                                                           |
| Camera — Pan                                   | `Camera was panned {horizontal} horizontally and {vertical} vertically.`                                                                                                         |
| Camera — Zoom                                  | `Camera zoom was changed to {to}%.`                                                                                                                                              |
| View — Transparent Stickers                    | `Transparent stickers setting was changed from {disabled                                                                                                                         | enabled} to {disabled | enabled}.` |
| View — Peek Stickers                           | `Peek stickers setting was changed from {from} to {to}.`                                                                                                                         |
| View — Peek Sticker Depth                      | `Peek sticker depth was changed from {from} to {to}.`                                                                                                                            |
| View — Peek Hide Color                         | `Peek hide color was changed to {to}.`                                                                                                                                           |
| Export / Import — Automatically export on exit | `Automatically export on exit setting was changed from {disabled                                                                                                                 | enabled} to {disabled | enabled}.` |
| Colors — Outer Facelet (position)              | `Color of {target} facelet was changed from {from} to {to}.`                                                                                                                     |
| Colors — Outer Facelet (face)                  | `Color of {target} face was changed from {from} to {to}.`                                                                                                                        |
| Colors — Outer Facelet (All)                   | `Color of all outer facelets was changed from {from} to {to}.`                                                                                                                   |
| Colors — Inner Cubie (position)                | `Inner color of cubie {target} was changed from {from} to {to}.`                                                                                                                 |
| Colors — Inner Cubie (All)                     | `Inner color of all cubies was changed from {from} to {to}.`                                                                                                                     |
| Colors — Facelet Label (position)              | `Label color of facelet {target} was changed from {from} to {to}.`                                                                                                               |
| Colors — Facelet Label (face)                  | `Label color on face {target} was changed from {from} to {to}.`                                                                                                                  |
| Colors — Facelet Label (All)                   | `Color of all facelet labels was changed from {from} to {to}.`                                                                                                                   |
| Colors — Axis Label (face)                     | `Color of the {target} axis label was changed from {from} to {to}.`                                                                                                              |
| Colors — Axis Label (All)                      | `Color of all axis labels was changed from {from} to {to}.`                                                                                                                      |
| Colors — Rotation Arrow (face)                 | `Color of the {target} rotation arrow was changed from {from} to {to}.`                                                                                                          |
| Colors — Rotation Arrow (All)                  | `Color of all rotation arrows was changed from {from} to {to}.`                                                                                                                  |
| Labels — Facelet Labels                        | `Facelet labels were changed from {from} to {to}.`                                                                                                                               |
| Labels — Facelet Label Visibility              | `Facelet label visibility was changed from {from} to {to}.`                                                                                                                      |
| Labels — Facelet Label Depth                   | `Facelet label depth was changed from {from} to {to}.`                                                                                                                           |
| Labels — Axis Labels                           | `Axis labels were changed from {from} to {to}.`                                                                                                                                  |
| Labels — Axis Label (face) Visibility          | `Visibility of the {target} axis label was changed from {from} to {to}.`                                                                                                         |
| Labels — Axis Label Visibility                 | `Axis label visibility was changed from {from} to {to}.`                                                                                                                         |
| Labels — Axis Label Format                     | `Axis label format was changed from {from} to {to}.`                                                                                                                             |
| Labels — Axis Label Text (face)                | `Text of the {target} axis label was changed from {from} to {to}.` Always show both texts, even when long.                                                                       |
| Labels — Axis Label Depth                      | `Axis label depth was changed from {from} to {to}.`                                                                                                                              |
| Labels — Axis Arrows                           | `Axis arrows were changed from {from} to {to}.`                                                                                                                                  |
| Labels — Axis Arrow (face) Visibility          | `Visibility of the {target} axis arrow was changed from {from} to {to}.`                                                                                                         |
| Labels — Axis Arrow Visibility                 | `Axis arrow visibility was changed from {from} to {to}.`                                                                                                                         |
| Labels — Axis Arrow Depth                      | `Axis arrow depth was changed from {from} to {to}.`                                                                                                                              |
| Labels — Rotation Arrows                       | `Rotation arrows were changed from {from} to {to}.`                                                                                                                              |
| Labels — Rotation Arrow (face) Visibility      | `Visibility of the {target} rotation arrow was changed from {from} to {to}.`                                                                                                     |
| Labels — Rotation Arrow Visibility             | `Rotation arrow visibility was changed from {from} to {to}.`                                                                                                                     |
| Labels — Rotation Arrow Depth                  | `Rotation arrow depth was changed from {from} to {to}.`                                                                                                                          |
| Labels — Rotation Arrow Thickness              | `Rotation arrow thickness was changed from {from} to {to}.`                                                                                                                      |
| Labels — Rotation Arrow Radius                 | `Rotation arrow radius was changed from {from} to {to}.`                                                                                                                         |
| Labels — Rotation Arrow Direction              | `Rotation arrow direction was changed from {from} to {to}.`                                                                                                                      |
| Individual reset                               | `Settings were reset using the individual reset button.`                                                                                                                         |
| Reset Rotation — Rotation entry                | `Settings were reset using the individual reset button.`                                                                                                                         |
| Reset Rotation — Camera entry                  | `Settings were reset using the individual reset button.`                                                                                                                         |
| Reset to Defaults                              | `All settings were reset to their defaults.`                                                                                                                                     |
| Export / Import — Imported Settings            | `Settings were manually imported as JSON.`                                                                                                                                       |
| Jump                                           | `Jumped to previous state: [link]`                                                                                                                                               |
| Revert — value-based activity                  | Use the original activity template in reverse: show the original `to` as the value reverted from and the original `from` as the value restored, using `back to` instead of `to`. |
| Revert — rotation sequence                     | `Rotation sequence was changed from {current sequence} back to {restored sequence}.` Show the entire restored sequence.                                                          |
| Revert — camera Orbit                          | `Camera was orbited back to azimuth {azimuth}° and elevation {elevation}°.` Use the restored values.                                                                             |
| Revert — camera Pan                            | `Camera was panned back {horizontal} horizontally and {vertical} vertically.` Use the restored values.                                                                           |
| Revert — camera Zoom                           | `Camera zoom was changed back to {zoom}%.` Use the restored value.                                                                                                               |
| Revert — Jump                                  | `Restored the setup from before the selected Jump.`                                                                                                                              |

Use `enabled/disabled` for feature toggles (Facelet Labels, Axis Labels, Axis
Arrows, and Rotation Arrows); use readable visibility values for visibility
settings. Camera wording should describe the gesture in understandable terms,
never raw position/target vectors. For grouped color changes, always show both
`from` and `to`; use `mixed` for `from` when the group previously had multiple
colors. The resulting `to` color is uniform and should never be `mixed`. For
grouped cube size/gap changes with different previous values, show `mixed` for
`from` and the uniform new value for `to`. Axis Label Text descriptions always
show both old and new text, even when long.

For Jump, `[link]` will be a pressable link to the activity whose after-state
was restored. Pressing it will select that activity in the log and
automatically scroll it into view, clearing filters if necessary. The link
displays the target activity ID in inline code. If the target was evicted from
the 1,000-entry log, show the ID as disabled inline code with an explanation.

### Pending Improvements

- Include the Activity Log when exporting/importing settings.

- Import description to include file name or just say pasted.

## Export / Import

### Automatically export on exit

The **Automatically export on exit** checkbox is unchecked by default. For now,
toggling it only creates an Activity Log entry; it does not export or persist
anything. Its entries are not revertible until the option has a defined effect.

Possible implementations to consider:

- Trigger a JSON download while the page is closing. Browser lifecycle policies
  may block or cancel downloads started during `beforeunload` or `pagehide`.
- Save the latest setup in browser storage and offer a download or recovery
  action on the next visit. Decide how to handle storage limits, private
  browsing, multiple tabs, and stale data.
- Ask the user to export before leaving. Custom exit prompts are restricted by
  browsers, and native unload prompts cannot provide a reliable custom workflow.
- Let the user choose a destination file and update it on changes with the File
  System Access API. This requires browser support and explicit file permission.
- Define what “exit” includes (closing a tab/window, navigating away, or
  reloading), and decide how to avoid duplicate or unexpected exports.
