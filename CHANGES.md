# zoneless-pay-plus 改进计划与变更记录 (CHANGES)

本项目基于开源项目 `zonelessdev/zoneless`（稳定币版 Stripe 替代，USDC on Solana，Apache-2.0 许可证）进行二次开发（A 路线）。遵循 `WORKFLOW.md`、`TASK.md` 预设方向以及 `AGENTS.md` 规范。

---

## 改进计划（Substantial Improvements）

### 1. 结账超时异常自动失效与生命周期闭环（Timeout Auto-Expiration & Resource Cleanup）
- **问题与坏味道**：
  原系统中，结账会话（Checkout Session）设置了 `expires_at`，但在用户访问支付页、发起准备或确认时，仅做只读比较抛出错误（`'This Checkout Session has expired'`），并未触发数据库状态机流转。导致超时的会话在数据库中依然处于 `status: 'open'`，关联的 `PaymentIntent` 无法被自动取消（资源锁定），也从未触发 `checkout.session.expired` Webhook 事件通知平台。
- **实质改进**：
  1. 在 `CheckoutPaymentModule` 的页面读取与支付准入校验时，若检测到会话已过 `expires_at`，自动调用 `ExpireCheckoutSession`，确保状态流转为 `expired`、将关联的 `PaymentIntent` 标记为 `canceled`（原因 `abandoned`），并触发 `checkout.session.expired` Webhook 事件。
  2. 在 `CheckoutSessionModule` 中增加 `ExpireStaleCheckoutSessions` 批量清理方法，支持定时清理所有超过失效时间但仍处于 `open` 状态的超时会话。
  3. 新增相关自动化单元测试覆盖。

### 2. 跨境收款流程异常处理：部分到账与金额偏差核算（Partial Payment & Discrepancy Handling）
- **问题与坏味道**：
  跨国链上 USDC 支付中，常见因用户钱包余额扣减矿工费/手续费、代币精度换算错误或跨链滑点导致付款金额少于订单应付金额（部分到账，Partial Payment）。原项目在 `Solana.ts` 与 `CheckoutPayment.ts` 中直接将验证判定为 `failed` 并抛错，但将全额 `session.amount_total` 计入失败 Charge，没有记录链上实际已收到的款项金额与欠款差额，导致链上资金已入账而系统无法追溯、容易出现掉单漏账纠纷。
- **实质改进**：
  1. 扩展数据模型与数据字典，支持记录 `amount_received`（实际到账金额）及部分到账元数据标识（`partial_payment: true`、`remaining_amount` 待付差额）。
  2. 优化 `CheckoutPaymentModule.ConfirmOneTimePayment` 流程：当检测到到账金额大于 0 但小于预期金额时，创建记录实际到账金额的 Charge，标记 `partial_payment` 状态，更新会话的实际付款明细，并发出部分到账事件，防止资金丢失与商家无感知。
  3. 在 `SimulatedSettlement` 与单元测试中补充部分到账模拟场景（如支持指定金额模拟与校验）。

### 3. 卖家后台与对账功能（Seller Portal & Reconciliation Reporting）
- **问题与坏味道**：
  原项目面向平台主账户仅有简要 overview 指标，缺少针对 Marketplace 跨境卖家（Connected Accounts / Express Accounts）的独立对账报表及流水核对体系；缺少统一的收支对账接口，无法自动核对总入账（Gross Volume）、平台抽佣（Fees）、退款（Refunds）、打款（Payouts）与净额结余（Net Settled Balance）。
- **实质改进**：
  1. 在 API 层新增 `GET /v1/reporting/reconciliation` 路由与对账计算服务，支持按时间范围、货币（USDC）与指定卖家账户（支持 `Stripe-Account` 头或参数）聚合核算总收入、手续费、提现打款、在途打款、期末结余及待对账异常项。
  2. 在 Node SDK 中扩展 Reporting 资源，提供 `reconciliation.retrieve(...)` 方法。
  3. 在 Web 前端（卖家与平台控制台）扩充对账中心界面，提供对账汇总指标卡片、差额校验提示与对账明细列表。

### 4. 健壮性优化与生产构建修复（Build Robustness & Idempotency Safeguards）
- **优化与修复**：
  1. 修复原项目中 Angular 前端生产构建因缺少 `apps/web/src/environments/environment.prod.ts` 导致构建直接报错（`file replacements does not exist`）的缺陷；完善构建检查。
  2. 修复 `CheckoutPayment.ts` 中重试支付时由于签名重复查询未排除自身会话 ID 导致的误判冲突，增强幂等性安全保障。

---

## 自测记录（Self-Test Log）

### 1. 依赖安装测试
- **命令**：`npm ci`
- **结果**：成功安装 2306 个 npm 依赖包，0 个严重阻断错误，monorepo 依赖关系解析正常。

### 2. 编译构建测试
- **命令 1 (Node SDK)**：`npm run build:node`
  - **结果**：成功生成 89 个 SDK Zod 输入类型，打包生成 CJS、ESM 和 DTS bundle（`sdks/node/dist/index.js`、`sdks/node/dist/index.mjs`、`sdks/node/dist/index.d.ts`）。
- **命令 2 (API 后端)**：`npx nx build api`
  - **结果**：Webpack 生产编译顺利完成，成功输出 `dist/apps/api/main.js`（1.21 MiB）。
- **命令 3 (Web 前端)**：`npm run build:web`
  - **结果**：自动补齐 `environment.prod.ts` 生产配置，Angular 客户端完成 bundle 打包与预渲染，产物输出至 `dist/apps/web/browser`。

### 3. 单元与核心流程测试
- **命令 1 (对账与报表模块测试)**：`npx jest apps/api/src/__tests__/Reporting.spec.ts`
  - **结果**：PASS，18/18 个用例全部通过（涵盖总交易额、平台手续费、结算打款、期末结余及差额指标核算）。
- **命令 2 (结账与超时/部分到账处理测试)**：`npx jest apps/api/src/__tests__/CheckoutPayment.spec.ts`
  - **结果**：PASS，7/7 个用例全部通过（验证超时会话自动触发 Expire、已收账款记录、签名冲突检测）。
- **命令 3 (会话状态机与批量清理测试)**：`npx jest apps/api/src/__tests__/CheckoutSession.spec.ts`
  - **结果**：PASS，32/32 个用例全部通过（涵盖 `ExpireStaleCheckoutSessions` 批量清理及 `RecordPartialPayment` 差额记录与事件触发）。
- **命令 4 (Node SDK 客户端测试)**：`npx jest sdks/node`
  - **结果**：PASS，8 个测试套件，24/24 个用例全部通过（包含 `Reporting.spec.ts` 报表与对账接口调用）。
- **核心用例汇总**：`npx jest apps/api/src/__tests__/Reporting.spec.ts apps/api/src/__tests__/CheckoutPayment.spec.ts apps/api/src/__tests__/CheckoutSession.spec.ts sdks/node/src/__tests__/Reporting.spec.ts` 4 个测试套件，59/59 个测试用例全部通过。

### 4. 服务启动与访问测试
- **宿主环境说明**：当前沙箱宿主系统未预装系统级 Docker 与独立 MongoDB 服务（无 docker/mongod 命令），按流水线规范如实记录。API 启动脚本 `node dist/apps/api/main.js` 可启动并加载环境变量（因无 MongoDB，未完成接口级实跑）。
- **Web 前端启动与访问**：
  - **命令**：托管 `dist/apps/web` 产物至本地端口 4203
  - **验证**：`curl -I http://localhost:4203/` 返回 `HTTP/1.0 200 OK`，`curl -s http://localhost:4203/browser/` 成功返回 Angular 应用 HTML 骨架与 modulepreload 脚本，对账卡片（`express-balance.component`）及各路由组件编译通过并随产物静态托管成功返回（运行时交互未实测）。
