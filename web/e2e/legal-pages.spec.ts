import { expect, test } from "@playwright/test";

test("Given the Studio is open, when the footer is reached, then every legal page is linked", async ({
  page,
}) => {
  await page.goto("/");

  const footer = page.getByRole("contentinfo");
  await expect(footer.getByRole("link", { name: "Impressum" })).toHaveAttribute(
    "href",
    "/impressum.html",
  );
  await expect(footer.getByRole("link", { name: "Datenschutz" })).toHaveAttribute(
    "href",
    "/datenschutz.html",
  );
  await expect(footer.getByRole("link", { name: "Lizenzen" })).toHaveAttribute(
    "href",
    "/licenses.html",
  );
});

test("Given the legal notice is opened, when English is selected, then its required identity remains available", async ({
  page,
}) => {
  await page.goto("/impressum.html");

  const germanNotice = page.locator('[data-legal-language="de"]');
  await expect(page.getByRole("heading", { name: "Impressum" })).toBeVisible();
  await expect(germanNotice.locator("address")).toContainText("Marvin Kalani");
  await expect(germanNotice.locator("address")).toContainText("Zum Bruch 3a");
  await expect(germanNotice.getByRole("link", { name: "support@kalanis.de" })).toBeVisible();

  await page.getByLabel("Sprache / Language").selectOption("en");
  await expect(page.getByRole("heading", { name: "Legal notice" })).toBeVisible();
  await expect(page.getByText("Information pursuant to section 5 DDG")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Legal information" })).toBeVisible();
});

test("Given privacy information is opened, then local processing and optional network access are disclosed", async ({
  page,
}) => {
  await page.goto("/datenschutz.html");

  const germanPrivacy = page.locator('[data-legal-language="de"]');
  await expect(page.getByRole("heading", { name: "Datenschutz" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Lokale Bildverarbeitung" })).toBeVisible();
  await expect(germanPrivacy.getByText("Cloudflare", { exact: true })).toBeVisible();
  await expect(germanPrivacy.getByText("Hugging Face", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Cookies und Reichweitenmessung" })).toBeVisible();
});

test("Given license information is opened, then the source license and change date are visible", async ({
  page,
}) => {
  await page.goto("/licenses.html");

  const germanLicenses = page.locator('[data-legal-language="de"]');
  await expect(page.getByRole("heading", { name: "Lizenzen" })).toBeVisible();
  await expect(
    germanLicenses.getByText("Business Source License 1.1", { exact: true }),
  ).toBeVisible();
  await expect(germanLicenses.getByText("20. Juli 2030", { exact: true })).toBeVisible();
  await expect(
    germanLicenses.getByRole("link", { name: "vollständige Lizenztext" }),
  ).toHaveAttribute("href", "https://github.com/MarvKalani/img2svg-studio/blob/main/LICENSE.md");
});
