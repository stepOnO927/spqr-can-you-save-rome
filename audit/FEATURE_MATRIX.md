# Feature completeness matrix

This matrix is deliberately conservative. `PASS` requires the declared complete gameplay chain, not merely a module or passing unit test. `NOT TESTED` means this audit did not execute the whole required chain; it is not a claim that the feature is broken. The machine-readable declaration is [feature-registry.js](../feature-registry.js).

| Feature | Status | Owning module | Evidence and limit |
|---|---|---|---|
| military | PARTIAL | [engine.js](../engine.js) | 征募成本、首个行军命令和浏览器点选已覆盖；完整攻城/撤退链未在本轮重测。 |
| diplomacy | PARTIAL | [engine.js](../engine.js) | 既有单元与浏览器脚本覆盖部分外交答复；跨阵营全部路径未审完。 |
| government | PARTIAL | [governance.js](../governance.js) | 开局政府状态和税收决策可用；完整任命/选举链未审完。 |
| elections | NOT TESTED | [cursus-honorum.js](../cursus-honorum.js) | 已有对应测试文件；本轮未完成独立的 UI→状态→存档全链验证。 |
| characters | PARTIAL | [character-system.js](../character-system.js) | 既有人物测试运行；身份、关系、死亡全组合未审完。 |
| dynasties | NOT TESTED | [dynasties.js](../dynasties.js) | 已有对应测试文件；本轮未完成独立的 UI→状态→存档全链验证。 |
| economy | PARTIAL | [engine.js](../engine.js) | 收支与资源测试运行；长期市场平衡未审完。 |
| trade | NOT TESTED | [han/silk-road.js](../han/silk-road.js) | 已有对应测试文件；本轮未完成独立的 UI→状态→存档全链验证。 |
| research | NOT TESTED | [inventions.js](../inventions.js) | 已有对应测试文件；本轮未完成独立的 UI→状态→存档全链验证。 |
| focus | NOT TESTED | [imperium-ui.js](../imperium-ui.js) | 已有对应测试文件；本轮未完成独立的 UI→状态→存档全链验证。 |
| map | PARTIAL | [map-lab/lab.js](../map-lab/lab.js) | 三入口触屏选点通过；所有地图模式和视野组合未审完。 |
| espionage | NOT TESTED | [character-system.js](../character-system.js) | 已有对应测试文件；本轮未完成独立的 UI→状态→存档全链验证。 |
| mailbox | PARTIAL | [epistulae.js](../epistulae.js) | 既有来信测试运行；每一种回复未审完。 |
| chronicle | PARTIAL | [chronicle.js](../chronicle.js) | 既有编年史测试运行；所有筛选与归档组合未审完。 |
| construction | NOT TESTED | [engine.js](../engine.js) | 已有对应测试文件；本轮未完成独立的 UI→状态→存档全链验证。 |
| han | PARTIAL | [han/engine.js](../han/engine.js) | 汉朝开局及刘氏正统检查运行；所有继位分支未审完。 |
| central-asia | NOT TESTED | [han/engine.js](../han/engine.js) | 已有对应测试文件；本轮未完成独立的 UI→状态→存档全链验证。 |
| achievements | NOT TESTED | [legacy.js](../legacy.js) | 已有对应测试文件；本轮未完成独立的 UI→状态→存档全链验证。 |
| tutorial | PARTIAL | [map-lab/tutorial.js](../map-lab/tutorial.js) | 开局操作和存档覆盖；全部教学节点未逐个验收。 |
| poki | PARTIAL | [poki-bridge.js](../poki-bridge.js) | 专用包三入口、SDK 模拟事件和外部请求通过；真 Poki Inspector 尚未运行。 |

## Coverage rules

- The baseline fast suite passed 892/892 assertions ([cloud run](https://github.com/stepOnO927/spqr-can-you-save-rome/actions/runs/43668500427)); this does not promote a whole feature to PASS.
- The dedicated [Poki package smoke](../tools/poki-build-smoke.mjs) proved entry, touch and mock SDK order on three entry points, not live platform acceptance.
- [The Inspector](../inspector.html) reports its own selected checks. Its registry badges remain PARTIAL or NOT TESTED until full UI and save/load evidence is available.
- A static import graph can flag candidates but cannot establish UNREACHABLE on its own. No feature was labeled UNREACHABLE without a demonstrated failed player path.
