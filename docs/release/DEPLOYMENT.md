# Static demo deployment

Target: `https://studio.img2.download`

Status on 19 July 2026: the production build and local preview acceptance pass. Publication is
waiting for the GitHub repository and Cloudflare zone access.

Direct Chrome 150 acceptance opened `/workspace`, emitted four native SVG shapes, created two
runs, showed their one parameter difference, downloaded a 336-byte SVG and survived a reload with
an empty warning and error log. The automated gate below additionally verifies response headers,
same-origin traffic and Cloudflare's per-file limit.

## Cloudflare Pages configuration

Connect the repository through the Cloudflare Pages Git integration and use:

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Root directory | repository root |
| Build command | `npm ci && npm run build` |
| Build output directory | `web/dist` |
| Node.js | 22.14 or newer |

The build copies `web/public/_headers` into `web/dist`. It supplies the required origin
isolation and WebMCP permissions headers. No Functions or server runtime are needed. Cloudflare
Pages serves this project as an SPA because it has a root `index.html` and no `404.html`, so a
direct visit such as `/workspace` reaches the application without a separate rewrite rule.

Provider references:

- [Git integration](https://developers.cloudflare.com/pages/configuration/git-integration/)
- [Build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/)
- [Custom headers](https://developers.cloudflare.com/pages/configuration/headers/)
- [SPA serving](https://developers.cloudflare.com/pages/configuration/serving-pages/#single-page-application-spa-rendering)
- [Custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/)
- [Platform limits](https://developers.cloudflare.com/pages/platform/limits/#file-size)

After the first successful Pages deployment, add `studio.img2.download` under **Custom domains**.
Cloudflare validates the domain and creates or requests the required DNS record.

## Acceptance

Local production preview:

```bash
npm --prefix web run test:demo
```

Published deployment:

```bash
IMG2SVG_DEMO_BASE_URL=https://studio.img2.download \
  npm --prefix web run test:demo
```

The same test verifies direct navigation, security headers, local geometric conversion, a second
run, A/B comparison, byte-bearing SVG download, reload, clean console and no cross-origin image
traffic. It also rejects any build asset above Cloudflare Pages' 25 MiB per-file limit.
