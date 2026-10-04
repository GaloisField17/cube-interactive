# Ideas To Implement

- Activity Log

## Activity Log

The Activity Log is session-only, shows up to 1,000 activities newest first, and records accepted, meaningful setup changes (not no-ops or intermediate input). Entries cover rotations, cube settings, camera gestures, view, color and label settings, resets, imports, jumps, and reverts. Related changes such as resets are summarized; programmatic camera changes are included in their parent action.

- **Filter** groups entries by Parent and Focus.
- **Revert** applies a supported activity in reverse and records a new entry. Reset and Import entries are not revertible.
- **Jump** restores the full setup snapshot saved after an activity and records a new entry.

Activities have unique UUIDv4 IDs, ISO 8601 timestamps, descriptions, and immutable setup snapshots. Changes with applicable before/after values store both; Jump entries link to their target by ID. Missing or evicted targets have disabled links, while the Jump snapshot remains usable.

### Pending Improvements

- Include the Activity Log when exporting/importing settings. Keep the current UUIDv4 activity IDs. Merge imported activities by ID: skip an entry if that ID already exists with matching activity contents, so importing the same log repeatedly is safe. If an imported entry has an existing ID but different contents, keep the existing activity unchanged, assign the imported activity a fresh UUIDv4 ID, and update references to it within the imported log using an old-ID-to-new-ID map. In particular, update Jump links in descriptionParts and keep their displayed ID text consistent. Do not rewrite links in the existing log. This avoids timestamp-based decisions and preserves relationships among imported activities; a Jump snapshot remains usable even if its target is absent from the merged log, in which case retain the disabled/missing activity link behavior.

- Include the source file name in the Import description, or distinguish file import from pasted JSON.

- Implement the **CLEAR ALL** button with an in-app confirmation for consistency: “Are you sure you want to clear all activity logs?” and “This action cannot be undone.” Provide **Yes** and **No**. Do not clear before explicit confirmation. **Yes** clears all activities, selection, and filters, then closes both dialogs. **No**, Escape, or dismissing the confirmation leaves the log and setup unchanged and closes both dialogs. Clearing must not reset the setup or stop future activity recording.

  Prevent races with asynchronous Revert or Jump: disable **CLEAR ALL** while either action is in progress, and re-enable it when the action settles. This prevents a pending action from adding an entry after the log is cleared.

## UI Windows

### Panel header consistency

Rendered desktop inspection found the main panel headers mostly consistent:

| Panel | Title | Individual reset | Expand/collapse |
| --- | --- | --- | --- |
| Rotation | 18px bold | 22x22px, before title | 20px regular, right-aligned |
| Cube | 18px bold | 22x22px, before title | 20px regular, right-aligned |
| View | 18px bold | 22x22px, before title | 20px regular, right-aligned |
| Colors | 18px bold | 22x22px, before title | 20px regular, right-aligned |
| Labels | 18px bold | 22x22px, before title | 20px bold, right-aligned |
| Export / Import | 18px bold | None; Reset to Defaults is separate | 20px regular, right-aligned |

The five individual reset buttons use matching size and placement. Export /
Import's header is about one pixel shorter because it has no reset button.
Styles and header assembly are still partly defined separately in panel code,
although the reset-button creation helper is shared.

When standardizing, use shared constants for title typography, reset-button
dimensions, and expand/collapse indicator styling, plus a small presentational
header helper that supports an optional reset button. Keep each panel's
expand/collapse state and callbacks local rather than introducing a general
panel framework. Make the Labels indicator regular weight to match the others.
Consider making keyboard and accessibility behavior consistent too: some
panels make the whole header clickable, while Rotation has a separate toggle.

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
