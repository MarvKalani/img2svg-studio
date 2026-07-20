# Static demo deployment

Target: `https://studio.img2.download`

Status on 20 July 2026: the production build is live through Cloudflare Pages. The custom domain,
public acceptance test and direct Chrome 150 review pass.

Cloudflare builds the public `MarvKalani/img2svg-studio` repository on every push to `main`. The
first deployment was built from application commit `27ad982`; the Pages project is also reachable
at `https://img2svg-studio.pages.dev`.

Direct Chrome 150 acceptance opened `/workspace`, emitted four native SVG shapes, created two
runs, showed their one parameter difference, downloaded a 336-byte SVG and survived a reload with
an empty warning and error log. The automated gate below additionally verifies response headers,
same-origin traffic and Cloudflare's per-file limit.

## Cloudflare Pages configuration

The Cloudflare Pages Git integration uses:

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

`studio.img2.download` is attached under **Custom domains**. Cloudflare manages its CNAME to the
Pages project.

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

The public run on 20 July 2026 passed both scenarios in real Chrome in three seconds. A separate
header probe returned HTTP 200 with `Origin-Agent-Cluster: ?1` and
`Permissions-Policy: tools=(self)`.
