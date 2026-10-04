import { expect, test } from "@playwright/test";

test("Activity Log opens and closes the empty window", async ({
  page,
}) => {
  await page.goto("/");

  const dialog = page.locator('[role="dialog"][aria-label="Activity Log"]');

  await expect(dialog).toHaveCount(1);
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: "Activity Log" }).click();

  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("No activities yet.")).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Filter" })).toBeDisabled();
  await expect(dialog.getByRole("button", { name: "Revert" })).toBeDisabled();
  await expect(dialog.getByRole("button", { name: "Jump" })).toBeDisabled();
  const clearAllButton = dialog.getByRole("button", { name: "CLEAR ALL" });

  await expect(clearAllButton).toBeEnabled();
  await expect(clearAllButton).toHaveCSS("background-color", "rgb(248, 215, 218)");
  const marginLeft = await clearAllButton.evaluate((button) =>
    Number.parseFloat(getComputedStyle(button).marginLeft),
  );

  expect(marginLeft).toBeGreaterThan(0);
  for (const name of ["Filter", "Revert", "Jump"]) {
    const button = dialog.getByRole("button", { name });

    for (const property of ["height", "min-width", "padding", "font-size"]) {
      await expect(clearAllButton).toHaveCSS(
        property,
        await button.evaluate(
          (element, cssProperty) =>
            getComputedStyle(element).getPropertyValue(cssProperty),
          property,
        ),
      );
    }
  }
  await clearAllButton.hover();
  await expect(clearAllButton).toHaveCSS("background-color", "rgb(243, 199, 204)");
  for (const name of ["Filter", "Revert", "Jump"]) {
    const button = dialog.getByRole("button", { name });

    await expect(button).toHaveCSS("opacity", "0.5");
    await expect(button).toHaveCSS("cursor", "not-allowed");
  }

  await dialog.getByRole("button", { name: "Close Activity Log" }).click();
  await expect(dialog).toBeHidden();
});

test("Automatically export on exit starts disabled and logs both setting changes", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator('[aria-controls="setup-panel-content"]').click();

  const autoExportOnExit = page.getByRole("checkbox", {
    name: "Automatically export on exit",
  });

  await expect(autoExportOnExit).not.toBeChecked();
  await autoExportOnExit.check();
  await autoExportOnExit.uncheck();
  await page.getByRole("button", { name: "Activity Log" }).click();

  const dialog = page.locator('[role="dialog"][aria-label="Activity Log"]');
  const disabledActivity = dialog.getByRole("button", {
    name: "Export / Import: Automatically export on exit",
  }).first();
  const enabledActivity = dialog.getByRole("button", {
    name: "Export / Import: Automatically export on exit",
  }).nth(1);

  await expect(enabledActivity.locator("..")).toContainText(
    "Automatically export on exit setting was changed from disabled to enabled.",
  );
  await expect(disabledActivity.locator("..")).toContainText(
    "Automatically export on exit setting was changed from enabled to disabled.",
  );

  await enabledActivity.click();
  await expect(dialog.getByRole("button", { name: "Revert" })).toBeDisabled();
  await dialog.getByRole("button", { name: "CLEAR ALL" }).click();
  await expect(
    dialog.getByRole("button", {
      name: "Export / Import: Automatically export on exit",
    }),
  ).toHaveCount(2);
});

test("Filter is enabled only when multiple Parent-Focus groups are available", async ({
  page,
}) => {
  await page.goto("/");

  const duration = page.locator("#rotation-panel input[type='text']").first();

  await duration.fill("1.5");
  await duration.press("Tab");
  await duration.fill("2");
  await duration.press("Tab");
  await page.getByRole("button", { name: "Activity Log" }).click();

  const dialog = page.locator('[role="dialog"][aria-label="Activity Log"]');

  await expect(dialog.getByRole("button", { name: "Filter" })).toBeDisabled();
  await expect(dialog.getByRole("button", { name: "Filter" })).toHaveCSS(
    "opacity",
    "0.5",
  );

  await page.getByRole("button", { name: "Close Activity Log" }).click();
  await page.locator('input[name="moveType"][value="fixed"]').check();
  await page.getByRole("button", { name: "R", exact: true }).click();
  await page.getByRole("button", { name: "Activity Log" }).click();

  await expect(dialog.getByRole("button", { name: "Filter" })).toBeEnabled();
  await expect(dialog.getByRole("button", { name: "Filter" })).toHaveCSS(
    "opacity",
    "1",
  );
});

test("Filter menu stays within the Activity Log after filtering and resizing", async ({
  page,
}) => {
  await page.goto("/");

  const duration = page.locator("#rotation-panel input[type='text']").first();

  await duration.fill("1.5");
  await duration.press("Tab");
  await page.locator('[aria-controls="colors-panel-content"]').click({
    force: true,
  });
  const outerFaceletColor = page
    .locator("#colors-panel-content input[type='text']")
    .first();

  await outerFaceletColor.fill("#123456");
  await outerFaceletColor.press("Tab");
  await page.locator('[aria-controls="view-panel-content"]').click({
    force: true,
  });
  await page
    .locator(
      'input[name="transparent-stickers-visibility"][value="hidden-behind-cube"]',
    )
    .check();
  await page.locator('[aria-controls="labels-panel-content"]').click({
    force: true,
  });
  await page.getByLabel("Show Facelet Labels").check();
  await page.setViewportSize({ width: 640, height: 420 });
  await page.getByRole("button", { name: "Activity Log" }).click();

  const dialog = page.locator('[role="dialog"][aria-label="Activity Log"]');
  const filterButton = dialog.getByRole("button", { name: "Filter" });
  const filterMenu = dialog.getByRole("group", {
    name: "Filter activities",
  });

  await filterButton.click();
  await expect(filterMenu).toBeVisible();

  async function expectFilterMenuContained() {
    const bounds = await filterMenu.evaluate((menu) => {
      const menuRect = menu.getBoundingClientRect();
      const dialogRect = menu.closest('[role="dialog"]').getBoundingClientRect();

      return {
        menuTop: menuRect.top,
        menuBottom: menuRect.bottom,
        dialogTop: dialogRect.top,
        dialogBottom: dialogRect.bottom,
        maxHeight: Number.parseFloat(getComputedStyle(menu).maxHeight),
        clientHeight: menu.clientHeight,
        scrollHeight: menu.scrollHeight,
      };
    });

    expect(bounds.menuTop).toBeGreaterThanOrEqual(bounds.dialogTop);
    expect(bounds.menuBottom).toBeLessThanOrEqual(bounds.dialogBottom);
    expect(bounds.clientHeight).toBeLessThanOrEqual(bounds.maxHeight + 1);
    await expect(filterMenu).toHaveCSS("overflow-y", "auto");

    return bounds;
  }

  let bounds = await expectFilterMenuContained();

  expect(bounds.scrollHeight).toBeGreaterThan(bounds.clientHeight);
  await filterMenu.getByRole("checkbox", { name: "View", exact: true }).check();
  bounds = await expectFilterMenuContained();
  expect(bounds.menuBottom - bounds.menuTop).toBeGreaterThan(0);

  await page.setViewportSize({ width: 640, height: 340 });
  await expectFilterMenuContained();
});

test("setting changes create Activity Log entries with before and after values", async ({
  page,
}) => {
  await page.goto("/");

  const duration = page.locator("#rotation-panel input[type='text']").first();

  await duration.fill("1.5");
  await duration.press("Tab");
  await page
    .locator('[aria-controls="colors-panel-content"]')
    .click({ force: true });
  const outerFaceletColor = page
    .locator("#outer-facelets-panel-content input")
    .first();
  const originalColor = await outerFaceletColor.inputValue();

  await outerFaceletColor.fill("#123456");
  await outerFaceletColor.press("Tab");
  await page.locator('[aria-controls="view-panel-content"]').click();
  await page
    .locator('input[name="transparent-stickers-visibility"][value="hidden-behind-cube"]')
    .check();
  await page
    .locator(
      'input[name="peek-stickers-visibility"][value="hidden-behind-cube"]',
    )
    .check();
  await page.locator('[aria-controls="labels-panel-content"]').click();
  await page.getByLabel("Show Facelet Labels").check();

  const canvasBounds = await page.locator("canvas").boundingBox();

  await page.mouse.move(
    canvasBounds.x + canvasBounds.width * 0.35,
    canvasBounds.y + canvasBounds.height * 0.4,
  );
  await page.mouse.down();
  await page.mouse.move(
    canvasBounds.x + canvasBounds.width * 0.45,
    canvasBounds.y + canvasBounds.height * 0.47,
    { steps: 4 },
  );
  await page.mouse.up();
  await page.getByRole("button", { name: "Activity Log" }).click();

  const dialog = page.locator('[role="dialog"][aria-label="Activity Log"]');

  await expect(
    dialog.getByText("Duration was changed from 1s to 1.5s."),
  ).toBeVisible();
  const changeValues = dialog
    .getByRole("button", { name: "Rotation: Duration" })
    .first()
    .locator("..")
    .locator("code");

  await expect(changeValues).toHaveText(["1s", "1.5s"]);
  await expect(changeValues.first()).toHaveCSS("color", "rgb(106, 106, 106)");
  await expect(changeValues.first()).toHaveCSS(
    "background-color",
    "rgb(240, 240, 240)",
  );
  await expect(dialog.locator("time").first()).toHaveText(
    /^\d{2} [A-Z][a-z]{2} \d{4} at \d{2}:\d{2}:\d{2}$/,
  );
  await expect(
    dialog.locator("button[aria-pressed]").filter({
      hasText: "Colors: Outer Facelet",
    }),
  ).toBeVisible();
  const colorActivity = dialog
    .locator("button[aria-pressed]")
    .filter({ hasText: "Colors: Outer Facelet" })
    .first()
    .locator("..");
  const colorValues = colorActivity.locator("code");
  const colorSwatches = colorActivity.locator(
    '[role="img"][aria-label^="Color "]',
  );

  await expect(colorValues).toHaveText([originalColor, "#123456"]);
  await expect(colorSwatches).toHaveCount(2);
  await expect(colorSwatches.nth(0)).toHaveAttribute(
    "aria-label",
    `Color ${originalColor}`,
  );
  await expect(colorSwatches.nth(1)).toHaveAttribute(
    "aria-label",
    "Color #123456",
  );
  await expect(colorSwatches.nth(1)).toHaveCSS(
    "background-color",
    "rgb(18, 52, 86)",
  );
  for (let index = 0; index < 2; index += 1) {
    await expect
      .poll(() =>
        colorSwatches.nth(index).evaluate((swatch) => ({
          radius: swatch.style.borderRadius,
          precedingSpace: swatch.previousSibling?.textContent,
        })),
      )
      .toEqual({ radius: "50%", precedingSpace: " " });
  }
  const transparentVisibility = dialog.getByRole("button", {
    name: "View: Transparent Stickers",
  });

  await expect(transparentVisibility).toBeVisible();
  const transparentVisibilityActivity = transparentVisibility.locator("..");

  await expect(transparentVisibilityActivity).toContainText(
    "Transparent stickers setting was changed from disabled to enabled.",
  );
  await expect(transparentVisibilityActivity.locator("code")).toHaveText([
    "disabled",
    "enabled",
  ]);
  const peekVisibility = dialog.getByRole("button", {
    name: "View: Peek Stickers",
  });

  await expect(peekVisibility).toBeVisible();
  const peekVisibilityActivity = peekVisibility.locator("..");

  await expect(peekVisibilityActivity).toContainText(
    "Peek stickers setting was changed from disabled to enabled.",
  );
  await expect(peekVisibilityActivity.locator("code")).toHaveText([
    "disabled",
    "enabled",
  ]);
  await expect(dialog.locator("button[aria-pressed]").first()).toHaveAttribute(
    "aria-label",
    "Camera: Orbit",
  );
  await peekVisibility.click();
  await dialog.getByRole("button", { name: "Revert" }).click();
  await expect(
    page.locator(
      'input[name="peek-stickers-visibility"][value="always-visible"]',
    ),
  ).toBeChecked();
  await expect(
    dialog.getByText(
      "Peek stickers setting was changed from enabled back to disabled.",
    ),
  ).toBeVisible();
  await transparentVisibility.click();
  await dialog.getByRole("button", { name: "Revert" }).click();
  await expect(
    page.locator(
      'input[name="transparent-stickers-visibility"][value="always-visible"]',
    ),
  ).toBeChecked();
  await expect(
    dialog.getByText(
      "Transparent stickers setting was changed from enabled back to disabled.",
    ),
  ).toBeVisible();
  await expect(
    dialog.getByText("Facelet labels were changed from disabled to enabled."),
  ).toBeVisible();
});

test("grouped face color changes update individual color activity baselines", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator('[aria-controls="colors-panel-content"]').click({
    force: true,
  });

  const colorsPanel = page.locator("#colors-panel-content");
  const faceColor = colorsPanel
    .getByText("F - Front", { exact: true })
    .locator("..")
    .locator('input[type="text"]')
    .first();
  const faceletColor = page
    .locator("#outer-facelets-panel-content")
    .getByText("FUL:", { exact: true })
    .locator("..")
    .locator('input[type="text"]')
    .first();

  await faceColor.fill("blue");
  await faceColor.press("Tab");
  await expect(faceletColor).toHaveValue("blue");
  await faceletColor.fill("orange");
  await faceletColor.press("Tab");

  await page.getByRole("button", { name: "Activity Log" }).click();

  const dialog = page.locator('[role="dialog"][aria-label="Activity Log"]');
  const faceActivity = dialog
    .getByRole("button", { name: "Colors: Outer Facelet (F)" })
    .locator("..");
  const faceletActivity = dialog
    .getByRole("button", { name: "Colors: Outer Facelet (FUL)" })
    .locator("..");

  await expect(faceActivity.locator("code")).toHaveText(["red", "blue"]);
  await expect(faceletActivity.locator("code")).toHaveText([
    "blue",
    "orange",
  ]);
  const faceletSwatches = faceletActivity.locator('[role="img"]');

  await expect(faceletSwatches).toHaveCount(2);
  await expect(faceletSwatches.nth(0)).toHaveAttribute(
    "aria-label",
    "Color blue",
  );
  await expect(faceletSwatches.nth(1)).toHaveAttribute(
    "aria-label",
    "Color orange",
  );
});

test("mixed color activity values are capitalized and have no swatch", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator('[aria-controls="colors-panel-content"]').click({
    force: true,
  });

  const allOuterFacelets = page
    .locator("#colors-panel-content input[type='text']")
    .first();

  await expect(allOuterFacelets).toHaveAttribute("placeholder", "Mixed");
  await allOuterFacelets.fill("#123456");
  await allOuterFacelets.press("Tab");
  await page.getByRole("button", { name: "Activity Log" }).click();

  const activity = page
    .locator('[role="dialog"][aria-label="Activity Log"]')
    .getByRole("button", { name: "Colors: Outer Facelet (All)" })
    .locator("..");

  await expect(activity.locator("code")).toHaveText(["Mixed", "#123456"]);
  await expect(activity.locator('[role="img"]')).toHaveCount(1);
  await expect(activity.locator('[role="img"]')).toHaveAttribute(
    "aria-label",
    "Color #123456",
  );
});

test("individual color undo restores the previous color and logs the reversal", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator('[aria-controls="colors-panel-content"]').click({
    force: true,
  });

  const faceletRow = page
    .locator("#outer-facelets-panel-content")
    .getByText("FUL:", { exact: true })
    .locator("..");
  const faceletColor = faceletRow.locator('input[type="text"]').first();

  await expect(faceletColor).toHaveValue("red");
  await faceletColor.fill("blue");
  await faceletColor.press("Tab");
  const undoButton = faceletRow.getByRole("button", {
    name: "Undo Color Change",
  });

  await expect(undoButton).toBeVisible();
  await undoButton.click();
  await expect(faceletColor).toHaveValue("red");
  await expect(undoButton).toBeHidden();

  await page.getByRole("button", { name: "Activity Log" }).click();

  const dialog = page.locator('[role="dialog"][aria-label="Activity Log"]');
  const faceletEntries = dialog.getByRole("button", {
    name: "Colors: Outer Facelet (FUL)",
  });

  await expect(faceletEntries).toHaveCount(2);
  await expect(faceletEntries.nth(0).locator("..")).toContainText(
    /Color of FUL facelet was changed from\s+blue\s+to\s+red\s+\./,
  );
  await expect(faceletEntries.nth(1).locator("..")).toContainText(
    /Color of FUL facelet was changed from\s+red\s+to\s+blue\s+\./,
  );
});

test("grouped color undo restores the exact mixed colors and logs the reversal", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator('[aria-controls="colors-panel-content"]').click({
    force: true,
  });

  const faceInputs = page.locator(
    "#outer-facelets-panel-content input[type='text']",
  );
  const originalColorControls = await faceInputs.evaluateAll((inputs) =>
    inputs.map((input) => ({
      value: input.value,
      placeholder: input.placeholder,
    })),
  );
  const allOuterFacelets = page
    .locator("#colors-panel-content input[type='text']")
    .first();

  await expect(allOuterFacelets).toHaveAttribute("placeholder", "Mixed");
  await allOuterFacelets.fill("#123456");
  await allOuterFacelets.press("Tab");
  const undoButton = page
    .locator('#colors-panel-content button[aria-label="Undo Color Change"]:visible')
    .first();

  await expect(undoButton).toBeVisible();
  await undoButton.click();
  await expect
    .poll(() =>
      faceInputs.evaluateAll((inputs) =>
        inputs.map((input) => ({
          value: input.value,
          placeholder: input.placeholder,
        })),
      ),
    )
    .toEqual(originalColorControls);
  await expect(allOuterFacelets).toHaveAttribute("placeholder", "Mixed");

  await page.getByRole("button", { name: "Activity Log" }).click();

  const dialog = page.locator('[role="dialog"][aria-label="Activity Log"]');
  const groupedEntries = dialog.getByRole("button", {
    name: "Colors: Outer Facelet (All)",
  });

  await expect(groupedEntries).toHaveCount(2);
  await expect(groupedEntries.nth(0).locator("..")).toContainText(
    /Color of all outer facelets was changed from\s+#123456\s+to\s+Mixed\s*\./,
  );
  await expect(groupedEntries.nth(1).locator("..")).toContainText(
    /Color of all outer facelets was changed from\s+Mixed\s+to\s+#123456\s+\./,
  );
});

test("view color undo restores and logs the previous color", async ({ page }) => {
  await page.goto("/");
  const viewHeader = page.locator('[aria-controls="view-panel-content"]');

  if ((await viewHeader.getAttribute("aria-expanded")) !== "true") {
    await viewHeader.click();
  }
  await expect(viewHeader).toHaveAttribute("aria-expanded", "true");
  await page
    .locator(
      'input[name="peek-stickers-visibility"][value="hidden-behind-cube"]',
    )
    .check();

  const peekColor = page.locator("#view-panel-content input[type='text']").first();
  await expect(peekColor).toBeVisible();
  const originalColor = await peekColor.inputValue();

  await peekColor.fill("#123456");
  await peekColor.press("Tab");
  const undoButton = page
    .locator('#view-panel-content button[aria-label="Undo Color Change"]:visible')
    .first();

  await expect(undoButton).toBeVisible();
  await undoButton.click();
  await expect(peekColor).toHaveValue(originalColor);
  await expect(undoButton).toBeHidden();

  await page.getByRole("button", { name: "Activity Log" }).click();

  const entries = page
    .locator('[role="dialog"][aria-label="Activity Log"]')
    .getByRole("button", { name: "View: Peek Hide Color" });

  await expect(entries).toHaveCount(2);
  await expect(entries.nth(0).locator("..")).toContainText(
    /Peek hide color was changed from\s+#123456\s+to\s+none\s*\./iu,
  );
  await expect(entries.nth(1).locator("..")).toContainText(
    /Peek hide color was changed from\s+none\s+to\s+#123456\s*\./iu,
  );
});

test("Reset Rotation records Rotation and Camera entries with the same time", async ({
  page,
}) => {
  await page.goto("/");

  const duration = page.locator("#rotation-panel input[type='text']").first();

  await duration.fill("1.5");
  await duration.press("Tab");

  const canvasBounds = await page.locator("canvas").boundingBox();

  await page.mouse.move(
    canvasBounds.x + canvasBounds.width * 0.35,
    canvasBounds.y + canvasBounds.height * 0.4,
  );
  await page.mouse.down();
  await page.mouse.move(
    canvasBounds.x + canvasBounds.width * 0.45,
    canvasBounds.y + canvasBounds.height * 0.47,
    { steps: 4 },
  );
  await page.mouse.up();

  await page.getByRole("button", { name: "Reset Rotation" }).click();
  await page.getByRole("button", { name: "Activity Log" }).click();

  const dialog = page.locator('[role="dialog"][aria-label="Activity Log"]');
  const rotationReset = dialog.getByRole("button", {
    name: "Rotation: Settings",
  });
  const cameraReset = dialog.getByRole("button", {
    name: "Camera: Settings",
  });

  await expect(rotationReset.locator("..")).toContainText(
    "Settings were reset using the individual reset button.",
  );
  await expect(cameraReset.locator("..")).toContainText(
    "Settings were reset using the individual reset button.",
  );
  await expect(rotationReset.locator("time")).toHaveText(
    await cameraReset.locator("time").textContent(),
  );
});

test("Reset Cube Settings records an Activity Log entry", async ({ page }) => {
  await page.goto("/");
  await page.locator('[aria-controls="cube-panel-content"]').click();

  const cubeSize = page.locator("#cube-panel-content input[type='text']").first();

  await cubeSize.fill("1.2");
  await cubeSize.press("Tab");
  await page.getByRole("button", { name: "Reset Cube Settings", exact: true }).click();

  await expect(cubeSize).toHaveValue("1");
  await page.getByRole("button", { name: "Activity Log" }).click();

  const dialog = page.locator('[role="dialog"][aria-label="Activity Log"]');
  const cubeReset = dialog.getByRole("button", { name: "Cube: Settings" });

  await expect(cubeReset.locator("..")).toContainText(
    "Settings were reset using the individual reset button.",
  );
});

test("adding a rotation to the sequence creates a Rotation activity", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator('input[name="moveType"][value="fixed"]').check();
  await page.getByRole("button", { name: "R", exact: true }).click();
  await page.getByRole("button", { name: "Activity Log" }).click();

  const dialog = page.locator('[role="dialog"][aria-label="Activity Log"]');

  await expect(
    dialog.getByText(
      "R was inserted. The rotation sequence is now R.",
    ),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Rotation: Insert" }),
  ).toHaveAttribute("aria-pressed", "false");
});

test("Revert removes an inserted rotation from the sequence", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator('input[name="moveType"][value="fixed"]').check();
  await page.getByRole("button", { name: "R", exact: true }).click();
  await page.getByRole("button", { name: "Activity Log" }).click();

  const dialog = page.locator('[role="dialog"][aria-label="Activity Log"]');

  await dialog.getByRole("button", { name: "Rotation: Insert" }).click();
  await dialog.getByRole("button", { name: "Revert" }).click();

  await expect(
    page.getByRole("listbox", { name: "Rotation Sequence" }),
  ).toHaveText("");
});

test("Revert restores a label setting", async ({ page }) => {
  await page.goto("/");
  await page
    .locator('[aria-controls="labels-panel-content"]')
    .click({ force: true });

  const faceletLabels = page.getByLabel("Show Facelet Labels");

  await faceletLabels.check();
  await page.getByRole("button", { name: "Activity Log" }).click();

  const dialog = page.locator('[role="dialog"][aria-label="Activity Log"]');

  await dialog.getByRole("button", { name: "Labels: Facelet Labels" }).click();
  await dialog.getByRole("button", { name: "Revert" }).click();

  await expect(faceletLabels).not.toBeChecked();
});

test("Revert applies a scalar setting's inverse and records the reversal", async ({
  page,
}) => {
  await page.goto("/");

  const duration = page.locator("#rotation-panel input[type='text']").first();

  await duration.fill("1.5");
  await duration.press("Tab");
  await page.getByRole("button", { name: "Activity Log" }).click();

  const dialog = page.locator('[role="dialog"][aria-label="Activity Log"]');

  await dialog.getByRole("button", { name: "Rotation: Duration" }).click();
  await dialog.getByRole("button", { name: "Revert" }).click();

  await expect(duration).toHaveValue("1");
  await expect(
    dialog.getByText(
      "Duration was changed from 1.5s back to 1s.",
    ),
  ).toBeVisible();
  const revertedValues = dialog
    .getByRole("button", { name: "Rotation: Duration" })
    .first()
    .locator("..")
    .locator("code");

  await expect(revertedValues).toHaveText(["1.5s", "1s"]);
  await expect(dialog.getByRole("button", { name: "Revert" })).toBeDisabled();
});

test("Revert restores keyed values for a grouped color activity", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .locator('[aria-controls="colors-panel-content"]')
    .click({ force: true });

  const allOuterFacelets = page
    .locator("#outer-facelets-panel-content input")
    .first();
  const originalColor = await allOuterFacelets.inputValue();

  await allOuterFacelets.fill("#123456");
  await allOuterFacelets.press("Tab");
  await page.getByRole("button", { name: "Activity Log" }).click();

  const dialog = page.locator('[role="dialog"][aria-label="Activity Log"]');

  await dialog
    .getByRole("button", { name: "Colors: Outer Facelet (F)" })
    .click();
  await dialog.getByRole("button", { name: "Revert" }).click();

  await expect(allOuterFacelets).toHaveValue(originalColor);
  await expect(
    dialog.getByText(/Color of F face was changed from/).first(),
  ).toBeVisible();
});

test("Revert restores keyed values for grouped cube dimensions", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .locator('[aria-controls="cube-panel-content"]')
    .click({ force: true });
  await page.locator('input[name="cubeGapMode"][value="custom"]').check();

  const cornerSize = page
    .getByText("Corners", { exact: true })
    .locator("xpath=..")
    .locator("input")
    .first();
  const originalSize = await cornerSize.inputValue();

  await cornerSize.fill("1.25");
  await cornerSize.press("Tab");
  await page.getByRole("button", { name: "Activity Log" }).click();

  const dialog = page.locator('[role="dialog"][aria-label="Activity Log"]');

  await dialog.getByRole("button", { name: "Cube: Size (Corners)" }).click();
  await dialog.getByRole("button", { name: "Revert" }).click();

  await expect(cornerSize).toHaveValue(originalSize);
});

test("Revert restores camera gestures and records a camera reversal", async ({
  page,
}) => {
  await page.goto("/");

  const canvasBounds = await page.locator("canvas").boundingBox();

  await page.mouse.move(
    canvasBounds.x + canvasBounds.width * 0.35,
    canvasBounds.y + canvasBounds.height * 0.4,
  );
  await page.mouse.down();
  await page.mouse.move(
    canvasBounds.x + canvasBounds.width * 0.45,
    canvasBounds.y + canvasBounds.height * 0.47,
    { steps: 4 },
  );
  await page.mouse.up();
  await page.getByRole("button", { name: "Activity Log" }).click();

  const dialog = page.locator('[role="dialog"][aria-label="Activity Log"]');

  await dialog.getByRole("button", { name: "Camera: Orbit" }).click();
  await dialog.getByRole("button", { name: "Revert" }).click();

  await expect(
    dialog.getByText(/Camera was orbited back to azimuth/),
  ).toBeVisible();
});

test("Revert of a Jump restores the state from before that Jump", async ({
  page,
}) => {
  await page.goto("/");

  const duration = page.locator("#rotation-panel input[type='text']").first();

  await duration.fill("1.5");
  await duration.press("Tab");
  await duration.fill("2");
  await duration.press("Tab");
  await page.getByRole("button", { name: "Activity Log" }).click();

  const dialog = page.locator('[role="dialog"][aria-label="Activity Log"]');

  await dialog
    .getByRole("button", { name: "Rotation: Duration" })
    .last()
    .click();
  await dialog.getByRole("button", { name: "Jump" }).click();
  await expect(duration).toHaveValue("1.5");

  await dialog.getByRole("button", { name: "Jump: Past State" }).click();
  await dialog.getByRole("button", { name: "Revert" }).click();

  await expect(duration).toHaveValue("2");
  await expect(
    dialog.getByText("Restored the setup from before the selected Jump."),
  ).toBeVisible();
});

test("Jump restores a saved rotation sequence", async ({ page }) => {
  await page.goto("/");
  await page.locator('input[name="moveType"][value="fixed"]').check();
  await page.getByRole("button", { name: "R", exact: true }).click();
  await page.getByRole("button", { name: "U", exact: true }).click();
  await page.getByRole("button", { name: "Activity Log" }).click();

  const dialog = page.locator('[role="dialog"][aria-label="Activity Log"]');
  const rotationActivity = dialog.getByRole("button", {
    name: "Rotation: Insert",
  }).last();

  await rotationActivity.click();
  await dialog.getByRole("button", { name: "Jump" }).click();

  await expect(
    page.getByRole("listbox", { name: "Rotation Sequence" }),
  ).toHaveText("R");
});

test("Jump description links clear filters and select the restored activity", async ({
  page,
}) => {
  await page.goto("/");

  const duration = page.locator("#rotation-panel input[type='text']").first();

  await duration.fill("1.5");
  await duration.press("Tab");
  await page.getByRole("button", { name: "Activity Log" }).click();

  const dialog = page.locator('[role="dialog"][aria-label="Activity Log"]');
  const targetButton = dialog.getByRole("button", {
    name: "Rotation: Duration",
  });
  const targetId = await targetButton.locator("..").getAttribute("data-activity-id");

  await targetButton.click();
  await dialog.getByRole("button", { name: "Jump" }).click();
  await dialog.getByRole("button", { name: "Filter" }).click();
  await dialog.getByRole("checkbox", { name: "Jump", exact: true }).check();

  const jumpLink = dialog.getByRole("link", {
    name: `Show activity ${targetId}`,
  });

  await expect(jumpLink).toBeVisible();
  await jumpLink.click();

  await expect(
    dialog
      .locator(`[data-activity-id="${targetId}"]`)
      .getByRole("button", { name: "Rotation: Duration" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    dialog.locator('input[type="checkbox"]:checked'),
  ).toHaveCount(0);
});

test("import and Reset to Defaults create composite summary entries", async ({
  page,
}) => {
  await page.goto("/");
  const duration = page.locator("#rotation-panel input[type='text']").first();

  await duration.fill("1.2");
  await duration.press("Tab");
  await page.getByRole("button", { name: /reset to defaults/i }).click();

  const dialog = page.locator('[role="dialog"][aria-label="Activity Log"]');

  await page.getByRole("button", { name: "Activity Log" }).click();
  await expect(
    dialog.getByText("All settings were reset to their defaults."),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Setup: Reset to Defaults" }).click();
  await expect(dialog.getByRole("button", { name: "Revert" })).toBeDisabled();
  await expect(dialog.getByRole("button", { name: "Jump" })).toBeEnabled();
  await dialog.getByRole("button", { name: "Close Activity Log" }).click();

  await page.locator('[aria-controls="setup-panel-content"]').click({
    force: true,
  });
  await page.getByRole("button", { name: "Import JSON" }).click();
  await page
    .getByPlaceholder("Paste exported JSON here")
    .fill(
      JSON.stringify({
        version: 2,
        exportedAt: new Date().toISOString(),
        setup: { rotations: { durationSeconds: 1.5 } },
      }),
    );
  await page.getByRole("button", { name: "Import", exact: true }).click();

  await page.getByRole("button", { name: "Activity Log" }).click();
  await expect(
    dialog.getByText("Settings were manually imported as JSON."),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "Export / Import: Imported Settings" })
    .click();
  await expect(dialog.getByRole("button", { name: "Revert" })).toBeDisabled();
  await expect(dialog.getByRole("button", { name: "Jump" })).toBeEnabled();
  await expect(
    dialog.getByText("Duration was changed from 1s to 1.5s."),
  ).toHaveCount(0);
});
