# Ideas To Implement

- Activity Log

# Activity Log

## Summary

The Activity Log is a window opened from the History button. It shows
meaningful changes to the cube setup, ordered from newest to oldest, with a
timestamp and a clear description of each change. Its purpose is to make it
easy to review how the current setup was created.

The log will let users restore a past state, apply the inverse of an entry, and
filter entries.

## Functions

The Activity Log window has three menus at the top:

- **Filter** — Filter activities by Parent, Focus, or both. Show Parent
  options first, followed by Parent–Focus options.
- **Revert** — Apply the inverse of the selected activity to the current
  setup. For example, an entry saying “Setting A changed from X to Y” can be
  inverted to change it from Y back to X. This creates a new activity
  timestamped when the inverse is applied; it does not rewrite or remove the
  original entry. Guardrails for keeping inverse operations consistent will
  be defined later.
- **Jump** — Restore the setup to the state immediately after the selected
  activity. Jumping creates a new activity entry; it does not rewind, delete,
  or reorder existing entries.

Activities are ordered newest to oldest. At most one activity can be selected
at a time. Activities have button-like hover behavior; selecting another
activity moves the selection. Revert and Jump are disabled until an activity
is selected. Using Filter, Revert, or Jump clears the selected activity.

Filter supports multi-selection and is disabled when the log is empty or has
only one distinct Parent–Focus type. Its options are the distinct Parents and
Parent–Focus pairs present in the log, sorted alphabetically by Parent and
then Focus. Parent options appear before their Parent–Focus options. Selecting
a Parent includes all of its Focuses; users can also select multiple
individual Parent–Focus options, including Focuses from different Parents.
Filter Focus names omit per-item, group, and scope qualifiers from the
catalog: for example, `Cube - Size` covers both `Size (Global)` and
`Size (UFR)` activities. The full activity descriptions retain the target.
For example, activities with `Rotation: Duration`, `Rotation: Insert`, and
`Cube: Size (Global)` produce these options in order: `Cube`, `Cube - Size`,
`Rotation`, `Rotation - Duration`, `Rotation - Insert`.

Dedicated keyboard navigation for activity rows is not required for the
initial implementation.

## Scope

### Activity catalog

This catalog defines which changes create Activity Log entries and the names
used to describe them. Each entry has:

- **Parent**: the broad setting category shown first.
- **Focus**: the specific setting changed, shown after the parent.
- **Description**: a concise statement of the change, including its previous
  and new values when available.

Use the message shape `Parent: Focus was changed from <old> to <new>`. For
example: `Rotation: Duration was changed from 2s to 1s`. Format values so
people can understand them (for example, show duration in seconds, colors as
color values, visibility as `shown`/`hidden`, and dimensions with consistent
precision). For a setting that has no meaningful scalar value, describe the
change in plain language. Camera changes use the concise description
`Camera: View was changed`; do not include numeric camera coordinates or
start/end points in the visible description.

The target in parentheses is part of the Focus name. Use the app's stable,
human-readable facelet or cubie position name for per-piece changes (for
example, `UFR`); use `All`, a face name, or a cubie group name (`Centers`,
`Edges`, `Corners`, or `Core`) for grouped changes. One grouped control action
creates one entry for the exact group the user changed, not separate entries
for every affected item.

| Parent | Focus | Changes to log |
| --- | --- | --- |
| Rotation | Duration | Rotation animation duration. |
| Rotation | Insert | A rotation is inserted into the sequence. |
| Rotation | Remove | A rotation is removed from the sequence. |
| Rotation | Edit | The rotation sequence is edited or a rotation is replaced. |
| Cube | Size (Global) | Size changed for all cubies through the global size control. |
| Cube | Gap (Global) | Gap changed for all cubies through the global gap control. |
| Cube | Size (<cubie position or group>) | Size changed for one cubie or a grouped set of cubies. |
| Cube | Gap (<cubie position or group>) | Gap changed for one cubie or a grouped set of cubies. |
| Camera | View | A completed orbit, zoom, or pan gesture changes the camera view. Group each continuous gesture into one activity. |
| View | Ghost Sticker Visibility | Whether stickers behind the cube use the ghost effect. |
| View | Peek Sticker Visibility | Whether hidden stickers are shown with the peek effect. |
| View | Peek Sticker Depth | The depth of the peek sticker effect. |
| View | Peek Hide Color | The color used to determine which stickers are hidden from the peek effect. |
| Colors | Outer Facelet (<facelet position>) | The color of one facelet. |
| Colors | Outer Facelet (<face>) | The color of all outer facelets on one face. |
| Colors | Outer Facelet (All) | The color applied to all outer facelets. |
| Colors | Inner Cubie (<cubie position>) | The inner color of one cubie. |
| Colors | Inner Cubie (All) | The color applied to all cubies' inner surfaces. |
| Colors | Facelet Label (<facelet position>) | The color of one facelet label. |
| Colors | Facelet Label (<face>) | The color applied to facelet labels on one face. |
| Colors | Facelet Label (All) | The color applied to all facelet labels. |
| Colors | Axis Label (<face>) | The color of one axis label. |
| Colors | Axis Label (All) | The color applied to all axis labels. |
| Colors | Rotation Arrow (<face>) | The color of one face's rotation arrow. |
| Colors | Rotation Arrow (All) | The color applied to all rotation arrows. |
| Labels | Facelet Labels | Whether facelet labels are shown. |
| Labels | Facelet Label Visibility | Whether facelet labels are always visible or hidden behind the cube. |
| Labels | Facelet Label Depth | The depth of facelet labels. |
| Labels | Axis Labels | Whether axis labels are shown. |
| Labels | Axis Label Visibility | Whether axis labels are always visible or hidden behind the cube. |
| Labels | Axis Label Format | Whether axis labels use custom text, Cartesian coordinates, or face names. |
| Labels | Axis Label Text (<face>) | The custom text for one face's axis label. Log only when custom format is active. |
| Labels | Axis Label Depth | The depth of axis labels. |
| Labels | Axis Arrows | Whether axis arrows are shown. |
| Labels | Axis Arrow (<face>) Visibility | Whether the axis arrow for one face is shown. |
| Labels | Axis Arrow Visibility | Whether axis arrows are always visible or hidden behind the cube. |
| Labels | Axis Arrow Depth | The depth of axis arrows. |
| Labels | Rotation Arrows | Whether rotation arrows are shown. |
| Labels | Rotation Arrow (<face>) Visibility | Whether the rotation arrow for one face is shown. |
| Labels | Rotation Arrow Visibility | Whether rotation arrows are always visible or hidden behind the cube. |
| Labels | Rotation Arrow Depth | The depth of rotation arrows. |
| Labels | Rotation Arrow Thickness | The thickness of rotation arrows. |
| Labels | Rotation Arrow Radius | The radius of rotation arrows. |
| Labels | Rotation Arrow Direction | Whether rotation arrows point clockwise or counter-clockwise. |

### Composite activities

Resets create one summarized entry, not one entry per changed field. The entry
identifies the Parent and, when applicable, Focus that was reset, and whether
the reset used an individual reset button or the global Reset to Defaults
button.

| Parent | Focus | Action |
| --- | --- | --- |
| <reset Parent> | <reset Focus, if applicable> | A reset button resets the identified Parent/Focus. State that it was reset using the individual reset button. |
| Setup | Reset to Defaults | The user activates the global Reset to Defaults button. |
| Import | Settings | A setup is imported. Use the description `Import: Settings were changed via import.` |
| Jump | Past State | The setup is restored to the state immediately after a past activity. The Jump action creates this new activity entry. |

Changes to a setting not yet represented in this catalog should not be silently
omitted: add its parent/focus pair and an example description here as part of
defining the feature.

### Grouping and continuous changes

Record accepted changes only: do not log intermediate typing, invalid input,
or no-op values. Group continuous interactions (such as dragging a slider or
editing a text value) into one entry when the interaction ends. Camera
gestures are also grouped into one `Camera: View` activity when the gesture
ends.

Store the camera state needed for Jump and Revert with the activity, even
though the visible description is simply `Camera: View was changed`. Camera
changes caused programmatically by Import, Reset to Defaults, Jump, or Revert
are part of that operation and must not create an additional camera activity.

Reset and import entries describe the operation as specified above rather
than listing every changed field. Jump and Revert behavior for these
summarized entries will be specified further as needed.

## Explicitly excluded

- Starting, pausing, or stopping animation.
- Playback navigation: next, previous, go to start, or go to end.
- Scrolling the rotation text or selecting a particular rotation instance.
- Expanding or collapsing UI panels or boxes.
