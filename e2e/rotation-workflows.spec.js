import { expect, test } from "@playwright/test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function exportSetup(page) {
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export JSON" }).click(),
  ]);

  return JSON.parse(await readFile(await download.path(), "utf8"));
}

async function setRotationDuration(page, seconds) {
  const duration = page
    .locator("#rotation-panel-content input[type='text']")
    .first();

  await duration.fill(String(seconds));
  await duration.press("Tab");
}

async function selectFixedMoves(page, moves) {
  await page.getByLabel("Fixed").check();

  for (const move of moves) {
    await page.getByRole("button", { name: move, exact: true }).click();
  }
}

async function openSetupPanel(page) {
  const header = page.locator('[aria-controls="setup-panel-content"]');

  if ((await header.getAttribute("aria-expanded")) !== "true") {
    await header.click();
  }
  await expect(header).toHaveAttribute("aria-expanded", "true");
}

test("rotation queue pauses, stops after the active move, and resumes", async ({
  page,
}) => {
  await page.goto("/");
  await setRotationDuration(page, 1.5);
  await selectFixedMoves(page, ["R", "U"]);

  const timeline = page.getByRole("slider", { name: "Rotation Timeline" });
  const playPause = page.getByRole("button", {
    name: "Play Or Pause Rotation",
  });
  const stop = page.getByRole("button", { name: "Stop Rotation" });
  const rotationPanel = page.locator("#rotation-panel");

  await expect(timeline).toHaveAttribute("max", "2");
  await expect(stop).toBeEnabled();
  await playPause.click();
  await expect(rotationPanel).toContainText("Paused");
  await playPause.click();
  await stop.click();

  await expect(timeline).toHaveValue("1", { timeout: 5000 });
  await expect(rotationPanel).toContainText("Stopped");
  await expect(page.locator(".rotation-entry")).toHaveCount(2);
  await expect(playPause).toBeEnabled();

  await playPause.click();
  await expect(timeline).toHaveValue("2", { timeout: 5000 });
  await expect(rotationPanel).toContainText("Rotation");
});

test("reset cancels active rotation and clears queued work", async ({ page }) => {
  await page.goto("/");
  await setRotationDuration(page, 5);
  await selectFixedMoves(page, ["R", "U"]);

  const stop = page.getByRole("button", { name: "Stop Rotation" });
  const reset = page.getByRole("button", { name: /reset to defaults/i });

  await expect(stop).toBeEnabled();
  await reset.click();
  await expect(reset).toBeEnabled();
  await expect(page.locator(".rotation-entry")).toHaveCount(0);
  await expect(
    page.getByRole("slider", { name: "Rotation Timeline" }),
  ).toBeDisabled();

  await openSetupPanel(page);
  const exported = await exportSetup(page);

  assert.deepEqual(exported.setup, {});
});

test("timeline scrub and seek rebuild the cube at the selected boundary", async ({
  page,
}) => {
  await page.goto("/");
  await setRotationDuration(page, 0);
  await selectFixedMoves(page, ["R", "U"]);

  const timeline = page.getByRole("slider", { name: "Rotation Timeline" });
  const firstEntry = page.locator(".rotation-entry").nth(0);
  const lastEntry = page.locator(".rotation-entry").nth(1);

  await expect(timeline).toHaveValue("2", { timeout: 5000 });
  await openSetupPanel(page);
  const completed = await exportSetup(page);

  assert.deepEqual(completed.setup.rotations.moves, ["R", "U"]);
  assert.ok(completed.setup.cube);

  await page.getByRole("button", { name: "Go To Solved State" }).click();
  await expect(timeline).toHaveValue("0");
  await expect(firstEntry).toHaveAttribute("aria-selected", "false");
  const solved = await exportSetup(page);

  assert.equal(solved.setup.cube, undefined);

  const bounds = await timeline.boundingBox();

  assert.ok(bounds);
  await page.mouse.click(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  );
  await expect(timeline).toHaveValue("1");
  await expect(firstEntry).toHaveAttribute("aria-selected", "true");
  await expect(lastEntry).toHaveAttribute("aria-selected", "false");

  const scrubbed = await exportSetup(page);

  assert.ok(scrubbed.setup.cube);
  assert.notDeepEqual(scrubbed.setup.cube, completed.setup.cube);

  await timeline.focus();
  await timeline.press("End");
  await expect(timeline).toHaveValue("2");
  await expect(lastEntry).toHaveAttribute("aria-selected", "true");
  const soughtToEnd = await exportSetup(page);

  assert.deepEqual(soughtToEnd.setup.cube, completed.setup.cube);
});
