import { expect, test } from "@playwright/test";

test("History opens and closes the empty Activity Log window", async ({
  page,
}) => {
  await page.goto("/");

  const dialog = page.locator('[role="dialog"][aria-label="Activity Log"]');

  await expect(dialog).toHaveCount(1);
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: "History" }).click();

  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("No activities yet.")).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Filter" })).toBeDisabled();
  await expect(dialog.getByRole("button", { name: "Revert" })).toBeDisabled();
  await expect(dialog.getByRole("button", { name: "Jump" })).toBeDisabled();
  for (const name of ["Filter", "Revert", "Jump"]) {
    const button = dialog.getByRole("button", { name });

    await expect(button).toHaveCSS("opacity", "0.5");
    await expect(button).toHaveCSS("cursor", "not-allowed");
  }

  await dialog.getByRole("button", { name: "Close Activity Log" }).click();
  await expect(dialog).toBeHidden();
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
  await page.getByRole("button", { name: "History" }).click();

  const dialog = page.locator('[role="dialog"][aria-label="Activity Log"]');

  await expect(dialog.getByRole("button", { name: "Filter" })).toBeDisabled();
  await expect(dialog.getByRole("button", { name: "Filter" })).toHaveCSS(
    "opacity",
    "0.5",
  );

  await page.getByRole("button", { name: "Close Activity Log" }).click();
  await page.locator('input[name="moveType"][value="fixed"]').check();
  await page.getByRole("button", { name: "R", exact: true }).click();
  await page.getByRole("button", { name: "History" }).click();

  await expect(dialog.getByRole("button", { name: "Filter" })).toBeEnabled();
  await expect(dialog.getByRole("button", { name: "Filter" })).toHaveCSS(
    "opacity",
    "1",
  );
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

  await outerFaceletColor.fill("#123456");
  await outerFaceletColor.press("Tab");
  await page.locator('[aria-controls="view-panel-content"]').click();
  await page
    .locator('input[name="ghost-stickers-visibility"][value="hidden-behind-cube"]')
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
  await page.getByRole("button", { name: "History" }).click();

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
  await expect(changeValues.first()).toHaveCSS("color", "rgb(215, 186, 125)");
  await expect(changeValues.first()).toHaveCSS(
    "background-color",
    "rgb(58, 58, 58)",
  );
  await expect(dialog.locator("time").first()).toHaveText(
    /^\d{2} [A-Z][a-z]{2} \d{4} at \d{2}:\d{2}:\d{2}$/,
  );
  await expect(
    dialog.locator("button[aria-pressed]").filter({
      hasText: "Colors: Outer Facelet",
    }),
  ).toBeVisible();
  await expect(
    dialog.getByText(
      "Sticker ghost visibility was changed from shown through the cube to hidden behind the cube.",
    ),
  ).toBeVisible();
  await expect(
    dialog.getByText("Facelet labels were changed from disabled to enabled."),
  ).toBeVisible();
  await expect(dialog.locator("button[aria-pressed]").first()).toHaveAttribute(
    "aria-label",
    "Camera: Orbit",
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
  await page.getByRole("button", { name: "History" }).click();

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

test("adding a rotation to the sequence creates a Rotation activity", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator('input[name="moveType"][value="fixed"]').check();
  await page.getByRole("button", { name: "R", exact: true }).click();
  await page.getByRole("button", { name: "History" }).click();

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
  await page.getByRole("button", { name: "History" }).click();

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
  await page.getByRole("button", { name: "History" }).click();

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
  await page.getByRole("button", { name: "History" }).click();

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
  await page.getByRole("button", { name: "History" }).click();

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
  await page.getByRole("button", { name: "History" }).click();

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
  await page.getByRole("button", { name: "History" }).click();

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
  await page.getByRole("button", { name: "History" }).click();

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
  await page.getByRole("button", { name: "History" }).click();

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
  await page.getByRole("button", { name: "History" }).click();

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

  await page.getByRole("button", { name: "History" }).click();
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

  await page.getByRole("button", { name: "History" }).click();
  await expect(
    dialog.getByText("Imported settings."),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Import: Settings" }).click();
  await expect(dialog.getByRole("button", { name: "Revert" })).toBeDisabled();
  await expect(dialog.getByRole("button", { name: "Jump" })).toBeEnabled();
  await expect(
    dialog.getByText("Duration was changed from 1s to 1.5s."),
  ).toHaveCount(0);
});
