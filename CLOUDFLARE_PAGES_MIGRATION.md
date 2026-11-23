# SPQR → Cloudflare Pages 迁移准备

状态：**仅准备；尚未部署、切换域名或更改 GitHub 仓库可见性。** 在 Cloudflare 公网站点完整测试并获得明确切换批准前，仓库必须保持公开，现有 GitHub Pages 保持运行。

当前审查分支增加商业同盟成员议事、增员邀请及其主战役和地图入口。代码提交 `5147fe10` 的 [GitHub 托管规则检查](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45082160751)通过 1,357/1,357 项；[Pages 打包和三入口浏览器](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45082160721)、[36 个月浏览器](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45082160719)、[Poki 打包](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45082160729)和[三组深度浏览器](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45082160709)全部通过。第一组实际操作同盟议事、主战役和地图入口、提议、存读档、组织地图及来信答复。`dist/` 有 335 个公开运行文件，5.02 MiB 总量，最大单文件 1.06 MiB，低于 25 MiB 限制；公开路径门禁通过。这仍是 GitHub 托管的打包与浏览器测试，**不是 Cloudflare 实际站点验收**。

公开 `main` 的长期情报归档已合入审查分支。合并提交 `9ae1f232` 的 [规则检查](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45084993666)通过 1,359/1,359 项；[Pages 包与三入口浏览器](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45084993731)、[36 个月浏览器](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45084993728)、[Poki](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45084993715)和[三组深度浏览器](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45084993722)全部通过。第一组实测商业同盟议事、长期情报分页及内部安全旧报告的存读档。当前公开包仍为 335 个文件、5.02 MiB，总文件最大 1.06 MiB，公开路径检查通过。Cloudflare 实际部署和新域名仍待验收。

随后公开 `main` 的归档身份线索修复又合入审查分支。新合并提交的 GitHub 托管包和浏览器检查尚待运行；上段数字只适用于已验证的 `9ae1f232`。

## 运行入口与依赖审计

| URL | 入口 | 主要依赖 |
| --- | --- | --- |
| `/` | `index.html` → `app.js` | 主战役引擎、地图与历史数据、Han 世界模块、CSS、128px 肖像 |
| `/map-lab/` | `map-lab/index.html` → `map-lab/lab.js` | 主战役引擎与存档、MapLibre GL、地形与道路数据、128px 肖像、Map Lab CSS |
| `/han/` | `han/index.html` → `han/play.js` | Han 引擎、地图、宫廷与体验模块、CSS |

`npm run build:pages` 每次清空并重建 `dist/`。它从三个 HTML 入口递归追踪本地 HTML/CSS/JS 引用，复制运行所需模块、128px 肖像和地图数据；另附地图/肖像公开来源说明及 MapLibre 许可证。MapLibre GL 固定为 6.18.0，JS、CSS 与 worker 在站内提供。Map Lab 的 Esri 影像、AWS/Mapzen 地形瓦片和 Google Fonts 仍依赖第三方网络服务；原来的地图玩法和外部服务条款没有改变。

`dist/` 不含测试、开发脚本、内部说明、原始肖像母版、64px 未使用缩略图、GitHub 工作流、配置文件或 `node_modules`。构建会拒绝内部路径、超过 20,000 个文件或单个超过 25 MiB 的静态文件。浏览器执行的 JavaScript 仍可从公开站点查看，私有 GitHub 源码不意味着前端代码不可获取。

## 浏览器存档转移

三个页面都有“迁移存档”入口。导出文件保留以下 `localStorage` 值的原始文本：`spqr-save-1`、`spqr-save-2`、`spqr-save-3`、`spqr-han-save-browser`、`spqr-legacy-archive`。导入只处理这些已知键，拒绝未知格式或超过 50 MiB 的文件；主战役存档只写入空槽，已有槽位绝不覆盖，历史档案按 ID 合并，无法导入的项目会列在结果中。写入失败会尝试恢复原值。导入后刷新页面并在游戏中点击“读取”即可载入；当前正在玩的战役不会被静默替换。导出文件包含完整游戏状态，应由玩家自行保管。

域名切换前，请玩家在**旧域名**导出存档，并在**新域名**导入。浏览器不会自动共享两个域名的 `localStorage`。页面间即时切换仍使用原有 `sessionStorage` handoff，存档格式和键没有改变。

## Cloudflare Pages 建站配置

1. 保持 GitHub 仓库公开。将这个准备分支合并到 `main` 后，先确认 GitHub Pages 仍正常；不要改动它的发布源或删除部署。
2. 在 Cloudflare Pages 新建 **Git 集成**项目，授权该仓库。配置：生产分支 `main`、根目录仓库根目录、框架 `None`、构建命令 `npm run build:pages`、输出目录 `dist`、Node.js 22。Cloudflare 账号中的项目名及将来的正式域名尚待确定，不写入源码。
3. 开启预览分支部署；先在 Cloudflare 提供的 `*.pages.dev` 地址测试 `/`、`/map-lab/`、`/han/`。检查 Network 面板无本地 404、地图 worker 正常加载、肖像显示、主战役与地图之间切换、行军/回合/外交/情报/Han/存读档及跨域导入。
4. 在 Cloudflare Pages 项目设置中启用 **Web Analytics 一次**。Pages 会自动注入 beacon；`dist/` 已移除源 HTML 里用于旧站点的手动 beacon。检查新域名页面中恰好一个 beacon，并在 Analytics 面板确认新主机名收到流量。将来自新域名的数据与旧域名分开核对。
   游戏内的公开分析渠道已识别 `<project>.pages.dev` 为 production、`<preview>.<project>.pages.dev` 为 staging。确定正式自定义域名后，把它准确填入 `analytics-settings.js` 的 `hostnames.production`，再通过测试与构建；未知域名默认仍属于 development preview。已在主分支配置的生产 GA4 ID `G-3VDCWZRJCL` 保留，仍受玩家同意开关控制；staging ID 与自建会话端点为空。上线后应确认 GA4 的新主机名数据及同意状态符合预期。
5. 在正式域名上再次测试、确认原 GitHub Pages 可访问，并获得**明确切换批准**后，才切换 DNS/入口。确认公开 Cloudflare 站点稳定，再单独申请更改仓库为 private 的批准。不要重命名仓库或删除旧部署。

Cloudflare Pages 文档：[Git 集成](https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/)、[构建配置](https://developers.cloudflare.com/pages/configuration/build-configuration/)、[静态 HTML 设置](https://developers.cloudflare.com/pages/framework-guides/deploy-anything/)、[平台限制](https://developers.cloudflare.com/pages/platform/limits/)、[Web Analytics](https://developers.cloudflare.com/pages/how-to/web-analytics/)。当前官方限制包括单个静态文件最多 25 MiB、Free 项目最多 20,000 文件、构建最多 20 分钟；每次部署前应复核。

## 最近一次托管验证（2026-11-22）

- 草稿 PR #307 的代码提交 `5b2c2fc5` 已纳入公开 `main` 至 `3a8f2e75`，仍未合并。[规则检查](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45078662936)通过 **1,351/1,351** 项；[Pages 打包及三个入口浏览器](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45078663045)、[36 个月浏览器](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45078662980)、[Poki 打包](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45078662919)及[三组深度浏览器](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45078662974)全部通过。第一组实际操作商业同盟提议、存读档、组织地图和收到邀请后的明确答复，也展开较早的内部调查报告，检查观察日期、收件日期和情报来源。预备公开包含 **327 个文件、4.96 MiB，总文件最大 1.06 MiB**；构建按引用清单重建空的 `dist/`，拒绝测试、工具、内部文档和其他非运行文件。入口浏览器覆盖 `/`、`/map-lab/`、`/han/`、跨域导入和本地资源。只读请求再次确认现有 GitHub Pages 的 `/` 和 `/map-lab/` 均返回 HTTP 200；仓库仍为 public。**这只是 GitHub 托管的预备包，不是 Cloudflare 实际部署**；新域名、线上单 beacon 和切换验收仍未进行。
- 草稿 PR #307 的合并提交 `3ebb3444` 已纳入公开 `main` 至 `3a2d8455` 的情报历史翻页，草稿仍未合并。[规则检查](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45072256240)通过 1,341/1,341 项；[Pages 打包与三个入口浏览器](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45072256343)、[36 个月浏览器](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45072256242)、[Poki 打包](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45072256335)及[三组深度浏览器](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45072256232)全部通过。第一组实际点击展开 120 条旧情报行动、派出新任务并验证存读档不丢记录；联盟协防流程也继续通过。`dist/` 仍含 326 个公开运行文件、4.94 MiB 总量、最大单文件 1.06 MiB，三个入口及跨域导入正常。这里仍未创建或验收 Cloudflare 实际站点，也未改变 GitHub Pages 发布设置、仓库可见性或现有部署。
- 草稿 PR #307 的代码提交 `0dc8e7a5` 已合入公开 `main` 至 `0153e3e4`，草稿仍未合并。[规则检查](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45069507917)通过 1,340/1,340 项；[Pages 打包及三个入口浏览器](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45069507916)、[36 个月浏览器](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45069507879)、[Poki 打包](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45069507807)及[三组深度浏览器](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45069507956)全部通过。第一组实际验证联盟求援信送达、玩家二次确认参战、各国军队与领土仍独立且存档保留决定。`dist/` 含 326 个公开运行文件、总计 4.94 MiB、最大单文件 1.06 MiB；公开目录排除内部文件的打包门禁通过。仓库 API 再次确认 public、默认分支 `main`。这仍是 GitHub 托管的迁移准备验证，未创建或测试 Cloudflare 实际站点，也未改动 GitHub Pages 发布设置。
- 草稿 PR #307 的审查提交 `586bad31` 已合入当时最新公开 `main`，但草稿尚未合并。GitHub 托管的[规则检查](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45065181014)通过 1,333/1,333 项；[Pages 打包与入口浏览器](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45065181052)、[36 个月浏览器](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45065181064)、[Poki 打包](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45065181068)及[三组深度浏览器](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45065181170)全部通过。公开包有 325 个文件、总计 4.93 MiB、最大单文件 1.06 MiB；浏览器验证三个入口、存档跨域导入、无站内资源加载失败。第二组深度浏览器明确通过了新城邦互市、使者回信与保存后的成交记录。此处仍是 GitHub 托管的准备验证，并非 Cloudflare 实际地址验收；仓库保持 public，旧 GitHub Pages 未改动。
- 审查提交 `4a7b1ab0` 已合入公开 `main` 至 `b3036943`；[质量检查](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45061848392)通过 1,327/1,327 项，[Pages 打包与入口浏览器](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45061848380)、[36 个月浏览器](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45061848391)、[Poki 打包](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45061848382)和[三组深入浏览器](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45061848376)全部通过。包内 325 个公开文件、总计 4.92 MiB、最大单文件 1.06 MiB；入口浏览器覆盖 `/`、`/map-lab/`、`/han/`、回合、存档、跨域导入和本地资源。地图开场存档读取、村落前哨与失联领袖隐私显示经第二组实际浏览器验证。只读请求确认旧 GitHub Pages 的 `/` 与 `/map-lab/` 都返回 HTTP 200；GitHub 仓库仍为 public。这里尚未创建 Cloudflare 实际部署，也未进行正式域名或单 beacon 线上验收。
- 审查提交 `e78e1eca` 的[质量检查](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45053893380)通过 1,315/1,315 项；[Pages 打包与入口浏览器](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45053893214)、[36 个月战役](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45053893436)、[Poki 打包](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45053893197)及[三组深入浏览器](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45053893301)全部通过。公开包为 325 个文件、4.91 MiB、最大单文件 1.06 MiB；浏览器覆盖主战役、Map Lab、Han、存档跨域导入、村落前哨、跨境继承和禁用存储时的安全提示。该结果是 GitHub 托管的准备验证，并非 Cloudflare 实际部署验收。其后的村落行政官增量仍须复测。
- 审查提交 `557000e2` 的[质量检查](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45042978906)通过 1,302/1,302 项；[Pages 打包与浏览器](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45042978885)、[36 个月战役](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45042978872)、[Poki 打包](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45042978908)和[三组深度浏览器](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45042978891)均通过。`dist/` 为 325 个公开文件、4.89 MiB，总文件最大 1.06 MiB。其后公开 `main` 的指挥官年龄修复已合入，合并提交仍须托管复测。
- 审查提交 `617bbaa7` 的[质量检查](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45040610426)通过 1,298/1,298 项；[Pages 打包与浏览器](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45040610417)、[36 个月战役](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45040610379)、[Poki 打包](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45040610370)和[三组深度浏览器](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45040610406)均通过。公开目录仍为 325 个文件、4.89 MiB、最大 1.06 MiB；第二组实际在地图界面推进回合并验证 AI 付费海路撤回。随后公开 `main` 的兵力核算修复已合入，合并提交仍须复测。
- 审查提交 `9609ec57` 的[质量检查](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45037280184)通过 1,296/1,296 项；[Pages 打包与浏览器](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45037280274)、[36 个月战役](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45037280172)、[Poki 打包](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45037280249)和[三组深度浏览器](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45037280283)均通过。`dist/` 为 325 个公开文件、总计 4.89 MiB、最大 1.06 MiB；三个入口、存档转移和资源加载正常。之后新增的 AI 海路撤回仍待单独托管复测。
- 审查提交 `791308b4` 的[质量检查](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45035099495)、[Pages 打包与浏览器](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45035099545)、[36 个月战役](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45035099511)、[Poki 打包](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45035099537)及[三组深度浏览器](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45035099468)全部通过。公开 `main` 后续已合入更多会面记录修复；新的远征简报和该合并提交仍需单独托管复测。
- 审查提交 `a689f913` 的 [质量检查](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45032976766)通过 1,293/1,293 项；[Pages 打包与浏览器](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45032976754)、[36 个月战役](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45032976731)、[Poki 打包](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45032976769)及[三组深度浏览器](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45032976807)均通过。`dist/` 有 325 个公开文件、总计 4.89 MiB、最大文件 1.06 MiB；第二组深度浏览器明确通过历史马赛城邦开局、主战役与地图切换、保存及角色报告。更晚的公开 `main` 已合入审查分支，其新提交仍需托管复测。
- 审查提交 `f208cb28` 的 [质量检查](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45008544011)通过 1,260/1,260 项 Node 测试；[36 个月战役检查](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45008543987)通过，包含固定种子随机地方政权的重放；[Pages 打包与入口浏览器检查](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45008544063)、[Poki 打包](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45008544120)和[三组深度浏览器回归](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45008544002)全部通过。公开目录共 323 个文件、4.85 MiB，最大单文件 1.06 MiB；三个入口、跨域存档导入、本地资源请求均通过。第二组浏览器流程还覆盖随机地方政权、村落、城邦玩法、游牧与荒野地图操作。
- 同期只读复核：GitHub API 显示仓库可见性为 public、默认分支为 `main`；旧 GitHub Pages 的 `/` 与 `/map-lab/` 均返回 HTTP 200。准备分支没有修改旧站的发布源或部署。
- 审查提交 `774be9f7` 的 GitHub Actions [质量检查](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45002415327)通过 1,253/1,253 项 Node 测试；[Pages 打包](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45002415318)、Poki 打包、[入口浏览器检查](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45002415372)及[三组深度浏览器检查](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/45002415315)均通过。
- `dist/` 共 323 个公开文件，4.84 MiB，最大单文件 1.06 MiB，低于 25 MiB 限制；入口浏览器检查覆盖 `/`、`/map-lab/`、`/han/`、存档、跨域导入和本地资源加载。构建脚本的公开路径审计继续拒绝测试、工具、内部文档和敏感配置。
- 旧 GitHub Pages 的 `/` 与 `/map-lab/` 在只读请求中仍返回 HTTP 200；仓库仍为 public，PR #307 仍为草稿。Cloudflare 真实地址、正式域名及 analytics 单 beacon 仍须在建站后实测，尚无上线或切换批准。

## 准备阶段验证记录（2026-11-14）

- 最终分支 `node --test --test-reporter=dot`：退出码 0，全部本地 Node 测试通过；PR 的 CI 仍需再次确认。
- `npm run build:pages`：211 个文件，总计约 3.96 MiB，最大文件约 1.06 MiB；无超限静态文件。新增的参议员肖像缩略图已包含。
- `dist/` 清单检查：无 `test/`、`tools/`、`scripts/`、`.github/`、环境变量文件、内部 README/审计文档；只保留三份公开来源说明和 MapLibre 许可证。
- 最终分支的本地实际 Chromium：三个入口返回 200，主战役、Map Lab、Han 的推进与存读档、跨域导出导入及未知键拒绝均通过；页面脚本错误和站内资源 404 均为零。
- 仓库原有浏览器长流程测试：最终本地 `dist/` 运行通过，覆盖地图、行军、外交信件、情报、回合及视图切换；CI 和 Cloudflare 真实地址仍需复测。
- 原 GitHub Pages 的 `/` 与 `/map-lab/` 在准备阶段 HTTP HEAD 均返回 200。本分支未修改 GitHub Pages 配置、`main`、仓库可见性或现有部署。Cloudflare 真实部署尚未创建，因此不能把本地验证当作线上验收。

### 11 月 15 日增量验证

- 草稿 PR #242 的 GitHub Actions `Cloudflare Pages package` 在 `94b19751` 上通过：`dist/` 有 293 个公开文件，总计 4.57 MiB，单个最大文件 1.06 MiB，低于 25 MiB 上限。云端 Chromium 验证主战役、Map Lab、Han、存档、跨源导入、未知键拒绝及站内资源请求均通过。
- 同一提交的 `SPQR quality` 和 `Poki release validation` 通过；三组较长的浏览器回归在记录本条时仍运行。此前的独立村落提交已通过三组浏览器回归，包括地图村落标记与建设操作。最新地区化名称与难度数值提交 `8347a782` 仍须完成云端复验。
- 这些均是 GitHub 托管的测试，不是 Cloudflare Pages 实际公网站点验收。GitHub Pages、仓库公开状态和旧部署未改动。
- 11 月 15 日只读复核：GitHub API 报告 `private=false`、默认分支 `main`、`has_pages=true`；旧站 `/` 与 `/map-lab/` 的 HTTP HEAD 均返回 200。这里没有对旧部署执行任何写操作。

### 11 月 22 日增量验证

- 草稿 [PR #307](https://github.com/stepOnO927/spqr-can-you-save-rome/pull/307) 在 `89a0ee75` 上的 [规则检查](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/44991607932)、[Pages 打包](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/44991607895)、[Poki 打包](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/44991607921)、[单浏览器检查](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/44991607985)和[三组浏览器回归](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/44991607893)均通过。可选 extended 作业按配置跳过；Vercel 的另一个外部部署状态因速率限制失败，不是本次 Cloudflare Pages 包的测试结果。
- 同一提交的完整 Node 规则测试 1,245/1,245 通过。Pages 输出有 311 个公开文件、总计 4.77 MiB、最大单文件 1.06 MiB；云端浏览器验证 `/`、`/map-lab/`、`/han/`、主战役与存档、跨域导入、未知存档键拒绝及无页面脚本错误或站内资源加载失败。Map Lab 的地方贸易和紧急粮食请求也经过云端浏览器流程。
- 只读复核：GitHub API 仍报告仓库为 public，默认分支仍是 `main`；旧 GitHub Pages 的 `/` 与 `/map-lab/` HTTP HEAD 均返回 200。没有修改现有发布。Cloudflare 真实部署及其正式域名验收仍未进行，仓库转为 private 和 DNS 切换也未进行。
- 后续 `24c070fc` 的 [规则检查](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/44996298598)、[Pages 打包](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/44996298514)、[Poki 打包](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/44996298550)、[单浏览器检查](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/44996298526)和[三组浏览器回归](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/44996298561)也全部通过。规则检查记录 1,248/1,248 项通过；公开目录 311 个文件、总计 4.78 MiB、最大单文件 1.06 MiB。新加的地图地方保护与人物报告存读档场景在托管浏览器通过。其后的主分支又加入新肖像，合并后的公开包仍须重新验证。

## 切换验收清单

- [ ] 准备分支审查、CI 通过；仅在准备工作获准后合并到 `main`。
- [ ] GitHub 仓库仍为 public，原 GitHub Pages 网站可访问。
- [ ] Cloudflare Pages `main` / `dist` 部署成功；`/`、`/map-lab/`、`/han/` 均通过真实地址浏览器测试。
- [ ] `dist/` 文件清单、单文件大小、分析 beacon 数量、资源请求和浏览器控制台复核通过。
- [ ] 玩家从旧域名导出的存档在新域名成功导入和载入；已有槽位保留、错误文件、Han 存档均验证。
- [ ] 正式域名与分析数据核对通过，且得到明确切换批准。
- [ ] 切换后再次确认全部入口和旧站点状态；只有再次明确批准才把 GitHub 仓库改为 private。

## 回滚

保留最后一个已验证的 GitHub Pages 地址和 DNS 记录。若 Cloudflare 站点或正式域名异常，先在 Cloudflare Pages 回退到最近正常部署；若仍异常，将 DNS/入口恢复到原 GitHub Pages，等缓存和 DNS 生效后复测三个入口。若仓库可见性已在后续独立批准中改为 private，回滚旧 GitHub Pages 前先恢复 public 并确认旧站可用。玩家在新域名产生的存档可导出并在旧域名导入。不要删除任何一侧部署，直到稳定运行并另获批准。
