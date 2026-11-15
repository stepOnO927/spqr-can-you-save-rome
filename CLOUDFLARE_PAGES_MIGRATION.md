# SPQR → Cloudflare Pages 迁移准备

状态：**仅准备；尚未部署、切换域名或更改 GitHub 仓库可见性。** 在 Cloudflare 公网站点完整测试并获得明确切换批准前，仓库必须保持公开，现有 GitHub Pages 保持运行。

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
5. 在正式域名上再次测试、确认原 GitHub Pages 可访问，并获得**明确切换批准**后，才切换 DNS/入口。确认公开 Cloudflare 站点稳定，再单独申请更改仓库为 private 的批准。不要重命名仓库或删除旧部署。

Cloudflare Pages 文档：[Git 集成](https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/)、[构建配置](https://developers.cloudflare.com/pages/configuration/build-configuration/)、[静态 HTML 设置](https://developers.cloudflare.com/pages/framework-guides/deploy-anything/)、[平台限制](https://developers.cloudflare.com/pages/platform/limits/)、[Web Analytics](https://developers.cloudflare.com/pages/how-to/web-analytics/)。当前官方限制包括单个静态文件最多 25 MiB、Free 项目最多 20,000 文件、构建最多 20 分钟；每次部署前应复核。

## 准备阶段验证记录（2026-11-14）

- 最终分支 `node --test --test-reporter=dot`：退出码 0，全部本地 Node 测试通过；PR 的 CI 仍需再次确认。
- `npm run build:pages`：211 个文件，总计约 3.96 MiB，最大文件约 1.06 MiB；无超限静态文件。新增的参议员肖像缩略图已包含。
- `dist/` 清单检查：无 `test/`、`tools/`、`scripts/`、`.github/`、环境变量文件、内部 README/审计文档；只保留三份公开来源说明和 MapLibre 许可证。
- 最终分支的本地实际 Chromium：三个入口返回 200，主战役、Map Lab、Han 的推进与存读档、跨域导出导入及未知键拒绝均通过；页面脚本错误和站内资源 404 均为零。
- 仓库原有浏览器长流程测试：最终本地 `dist/` 运行通过，覆盖地图、行军、外交信件、情报、回合及视图切换；CI 和 Cloudflare 真实地址仍需复测。
- 原 GitHub Pages 的 `/` 与 `/map-lab/` 在准备阶段 HTTP HEAD 均返回 200。本分支未修改 GitHub Pages 配置、`main`、仓库可见性或现有部署。Cloudflare 真实部署尚未创建，因此不能把本地验证当作线上验收。

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
