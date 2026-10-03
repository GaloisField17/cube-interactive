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

async function ensureExpanded(page, contentId) {
  const header = page.locator(`[aria-controls="${contentId}"]`);

  if ((await header.getAttribute("aria-expanded")) !== "true") {
    await header.click();
  }

  await expect(header).toHaveAttribute("aria-expanded", "true");
}

async function openOuterFaceletColorInput(page, input) {
  await ensureExpanded(page, "colors-panel-content");
  await ensureExpanded(page, "outer-facelets-panel-content");
  await expect(input).toBeVisible();
}

test("color and label settings export, import, and reset to defaults", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("canvas")).toHaveCount(1);

  await ensureExpanded(page, "colors-panel-content");
  const outerFaceletColor = page
    .locator("#outer-facelets-panel-content input")
    .first();

  await openOuterFaceletColorInput(page, outerFaceletColor);
  await outerFaceletColor.fill("#123456");

  await ensureExpanded(page, "inner-panel-content");
  const innerCubieColor = page.locator("#inner-panel-content input").first();

  await innerCubieColor.fill("#234567");

  await ensureExpanded(page, "labels-panel-content");
  const faceletLabels = page.getByLabel("Show Facelet Labels");

  await faceletLabels.check();
  await ensureExpanded(page, "facelet-labels-panel-content");
  const faceletLabelSection = page
    .locator("#facelet-labels-panel-content")
    .locator("xpath=..");
  const faceletLabelColor = faceletLabelSection.locator("input").first();

  await faceletLabelColor.fill("#456789");
  const labelDepth = page.getByRole("textbox", {
    name: "Label Depth Value",
    exact: true,
  });

  await labelDepth.fill("0.42");
  await labelDepth.press("Tab");

  await ensureExpanded(page, "setup-panel-content");
  const exported = await exportSetup(page);
  const exportedFaceletColors = Object.values(
    exported.setup.cube.cubies,
  ).flatMap((cubie) =>
    Object.values(cubie.facelets ?? {}).map((facelet) => facelet.color),
  );

  assert.ok(exportedFaceletColors.length > 0);
  assert.ok(exportedFaceletColors.every((color) => color === "#123456"));
  assert.ok(
    Object.values(exported.setup.cube.cubies).some(
      (cubie) => cubie.innerColor === "#234567",
    ),
  );
  assert.ok(
    Object.values(exported.setup.colors.faceletLabels).every(
      (color) => color === "#456789",
    ),
  );
  assert.equal(exported.setup.labels.facelets, true);
  assert.equal(exported.setup.labels.labelDepth, 0.42);

  const [svgDownload] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export SVG" }).click(),
  ]);

  assert.ok((await readFile(await svgDownload.path())).byteLength > 0);

  await ensureExpanded(page, "colors-panel-content");
  await openOuterFaceletColorInput(page, outerFaceletColor);
  await outerFaceletColor.fill("#654321");
  await ensureExpanded(page, "inner-panel-content");
  await innerCubieColor.fill("#765432");

  await ensureExpanded(page, "labels-panel-content");
  await ensureExpanded(page, "facelet-labels-panel-content");
  await faceletLabelColor.fill("#654321");
  await labelDepth.fill("0.6");
  await labelDepth.press("Tab");
  await faceletLabels.uncheck();

  await ensureExpanded(page, "setup-panel-content");
  await page.getByRole("button", { name: "Import JSON" }).click();
  await page
    .getByPlaceholder("Paste exported JSON here")
    .fill(JSON.stringify(exported));
  await page.getByRole("button", { name: "Import", exact: true }).click();

  await ensureExpanded(page, "labels-panel-content");
  await expect(faceletLabels).toBeChecked();
  await ensureExpanded(page, "facelet-labels-panel-content");
  await expect(faceletLabelColor).toHaveValue("#456789");
  await expect(labelDepth).toHaveValue("0.42");

  await ensureExpanded(page, "colors-panel-content");
  await openOuterFaceletColorInput(page, outerFaceletColor);
  await expect(outerFaceletColor).toHaveValue("#123456");
  await ensureExpanded(page, "inner-panel-content");
  await expect(innerCubieColor).toHaveValue("#234567");

  await page.getByRole("button", { name: /reset to defaults/i }).click();

  await ensureExpanded(page, "colors-panel-content");
  await openOuterFaceletColorInput(page, outerFaceletColor);
  await expect(outerFaceletColor).toHaveValue("red");

  await ensureExpanded(page, "labels-panel-content");
  await expect(faceletLabels).not.toBeChecked();

  await ensureExpanded(page, "setup-panel-content");
  const resetSetup = await exportSetup(page);

  assert.deepEqual(resetSetup.setup, {});
});

test("per-cubie dimensions export and restore through setup import", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("canvas")).toHaveCount(1);
  await ensureExpanded(page, "cube-panel-content");
  await page.locator('input[name="cubeGapMode"][value="custom"]').check();

  const cornerSize = page
    .getByText("Corners", { exact: true })
    .locator("xpath=..")
    .locator("input")
    .first();

  await cornerSize.fill("1.25");
  await cornerSize.press("Tab");
  await ensureExpanded(page, "setup-panel-content");

  const exported = await exportSetup(page);
  const cubiesWithCustomSize = Object.values(exported.setup.cube.cubies).filter(
    (cubie) => cubie.size === 1.25,
  );

  assert.ok(cubiesWithCustomSize.length > 0);
  assert.ok(cubiesWithCustomSize.length < 26);

  await page.getByRole("button", { name: "Activity Log" }).click();
  const activityDialog = page.locator(
    '[role="dialog"][aria-label="Activity Log"]',
  );

  await expect(
    activityDialog.getByRole("button", {
      name: "Cube: Size (Corners)",
    }),
  ).toBeVisible();
  await activityDialog
    .getByRole("button", { name: "Close Activity Log" })
    .click();

  await ensureExpanded(page, "cube-panel-content");
  await expect(cornerSize).toHaveValue("1.25");
  await cornerSize.fill("1.5");
  await cornerSize.press("Tab");

  await ensureExpanded(page, "setup-panel-content");
  await page.getByRole("button", { name: "Import JSON" }).click();
  await page
    .getByPlaceholder("Paste exported JSON here")
    .fill(JSON.stringify(exported));
  await page.getByRole("button", { name: "Import", exact: true }).click();

  await ensureExpanded(page, "cube-panel-content");
  await expect(
    page.locator('input[name="cubeGapMode"][value="custom"]'),
  ).toBeChecked();
  await expect(cornerSize).toHaveValue("1.25");

  await ensureExpanded(page, "setup-panel-content");
  const restored = await exportSetup(page);

  assert.deepEqual(restored.setup.cube, exported.setup.cube);
});

test("axis label and arrow settings retain their appearance and visibility", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("canvas")).toHaveCount(1);
  await ensureExpanded(page, "view-panel-content");
  await page
    .locator('input[name="transparent-stickers-visibility"][value="hidden-behind-cube"]')
    .check();
  await page
    .locator('input[name="peek-stickers-visibility"][value="hidden-behind-cube"]')
    .check();
  await page.getByLabel("Peek Stickers Depth Value").fill("0.75");
  await page.getByLabel("Peek Stickers Depth Value").press("Tab");
  await ensureExpanded(page, "labels-panel-content");

  await page.getByLabel("Show Axis Labels").check();
  await page.locator('input[name="axis-label-mode"][value="custom"]').check();
  await page.getByLabel("Custom Label R").fill("Right");
  await page.getByLabel("Axis Label Depth Value").fill("0.37");
  await page.getByLabel("Axis Label Depth Value").press("Tab");
  await page.getByText("Show Label R", { exact: true })
    .locator("xpath=..")
    .locator('input[type="checkbox"]')
    .check();

  await page.getByLabel("Show Axis Arrows").check();
  await page.getByLabel("Axis Arrow Depth Value").fill("0.31");
  await page.getByLabel("Axis Arrow Depth Value").press("Tab");
  await page.getByText("Show Axis R", { exact: true })
    .locator("xpath=..")
    .locator('input[type="checkbox"]')
    .check();

  await page.getByLabel("Show Rotation Arrows").check();
  await page.getByLabel("Rotation Arrow Depth Value").fill("0.78");
  await page.getByLabel("Rotation Arrow Depth Value").press("Tab");
  await page.getByLabel("Rotation Arrow Thickness Value").fill("0.025");
  await page.getByLabel("Rotation Arrow Thickness Value").press("Tab");
  await page.getByLabel("Rotation Arrow Radius Value").fill("0.8");
  await page.getByLabel("Rotation Arrow Radius Value").press("Tab");
  await page.locator("#rotation-arrow-direction").selectOption(
    "counter-clockwise",
  );
  await page.getByText("Show Arrow R", { exact: true })
    .locator("xpath=..")
    .locator('input[type="checkbox"]')
    .check();

  await ensureExpanded(page, "colors-panel-content");
  await ensureExpanded(page, "axis-label-color-panel-content");
  await page
    .locator("#axis-label-color-panel-content input")
    .first()
    .fill("#123456");
  await ensureExpanded(page, "rotation-arrow-color-panel-content");
  await page
    .locator("#rotation-arrow-color-panel-content input")
    .first()
    .fill("#654321");

  await ensureExpanded(page, "setup-panel-content");
  const exported = await exportSetup(page);

  assert.equal(
    exported.setup.view.transparentStickersVisibility,
    "hidden-behind-cube",
  );
  assert.equal(
    exported.setup.view.peekStickersVisibility,
    "hidden-behind-cube",
  );
  assert.equal(exported.setup.view.peekStickersDepth, 0.75);
  assert.equal(exported.setup.labels.axisLabelsByFace.R.customText, "Right");
  assert.equal(exported.setup.labels.axisLabelsByFace.R.visible, true);
  assert.equal(exported.setup.labels.axisLabelMode, "custom");
  assert.equal(exported.setup.labels.axisLabelDepth, 0.37);
  assert.equal(exported.setup.labels.axisDepth, 0.31);
  assert.equal(exported.setup.labels.axisArrowsByFace.R.visible, true);
  assert.equal(exported.setup.labels.rotationArrowDepth, 0.78);
  assert.equal(exported.setup.labels.rotationArrowThickness, 0.025);
  assert.equal(exported.setup.labels.rotationArrowRadius, 0.8);
  assert.equal(
    exported.setup.labels.rotationArrowDirection,
    "counter-clockwise",
  );
  assert.equal(exported.setup.labels.rotationArrowsByFace.R.visible, true);
  assert.equal(exported.setup.colors.axisLabels.F, "#123456");
  assert.equal(exported.setup.colors.rotationArrows.F, "#654321");

  await page.getByRole("button", { name: "Import JSON" }).click();
  await page
    .getByPlaceholder("Paste exported JSON here")
    .fill(JSON.stringify(exported));
  await page.getByRole("button", { name: "Import", exact: true }).click();
  await ensureExpanded(page, "setup-panel-content");

  const imported = await exportSetup(page);

  assert.deepEqual(imported.setup, exported.setup);
});
