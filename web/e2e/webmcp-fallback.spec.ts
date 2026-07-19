import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const circleFixturePath = resolve(
  import.meta.dirname,
  "../../fixtures/shape-recognition/input/circle.png",
);

test("Given WebMCP is unavailable, when the studio starts, then the complete visible conversion path remains usable", async ({
  page,
}) => {
  const javascriptErrors: Error[] = [];
  page.on("pageerror", (error) => javascriptErrors.push(error));
  const response = await page.goto("/");

  expect(response?.headers()["origin-agent-cluster"]).toBe("?1");
  expect(response?.headers()["permissions-policy"]).toBe("tools=(self)");
  await expect(page.locator("html")).toHaveAttribute("data-webmcp", "unsupported");
  await page.getByLabel("Rasterbild auswählen").setInputFiles(circleFixturePath);
  await page.getByRole("button", { name: "Konvertieren" }).click();

  await expect(page.getByTestId("svg-output").locator("svg")).toBeVisible();
  await expect(page.locator('[data-run-id="1"]')).toBeVisible();
  expect(javascriptErrors).toEqual([]);
});
