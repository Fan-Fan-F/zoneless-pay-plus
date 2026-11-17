# Zoneless Pay Plus

<p align="center">
  <strong>支持 Solana USDC 的开源跨境支付与卖家结算平台（增强版）</strong><br>
  <strong>Open-Source Cross-Border Payments & Seller Settlement Platform on Solana USDC (Enhanced Edition)</strong>
</p>

<p align="center">
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-Apache%202.0-blue.svg" alt="License: Apache 2.0"></a>
  <img src="https://img.shields.io/badge/Node-%3E%3D20-green.svg" alt="Node >=20">
  <img src="https://img.shields.io/badge/Solana-USDC-blueviolet.svg" alt="Solana USDC">
  <img src="https://img.shields.io/badge/TypeScript-Nx_Monorepo-3178c6.svg" alt="TypeScript Nx Monorepo">
</p>

---

## 中文说明

Zoneless Pay Plus 是一个基于 Solana 链上 USDC 稳定币的开源跨境支付平台与卖家资金结算系统，提供与 Stripe 高度兼容的 REST API、Angular 卖家与平台控制台、以及全功能的 Node.js SDK。

本项目在原项目 `zonelessdev/zoneless` 基础上完成深度二次开发，重点补强了跨境电商/Marketplace 卖家后台对账体系、结账会话超时失效状态闭环、链上部分到账异常容错与追溯机制，并修复了多处幂等与生产环境打包缺陷。

### 主要功能与改进点

本版本包含以下 4 项核心实质改进（完整变更及测试用例请参见 [CHANGES.md](./CHANGES.md)）：

1. **结账超时异常自动失效与生命周期闭环（Timeout Auto-Expiration & Resource Cleanup）**
   - **改进背景**：原系统中，超时的结账会话仅在客户端访问时做只读拒绝，数据库中长期滞留为 `open` 状态，关联的 `PaymentIntent` 无法被自动释放，亦无法触发超时事件。
   - **实现方案**：在支付准备与准入核对逻辑中增加自动状态流转机制，超时自动将会话置为 `expired`，级联取消 `PaymentIntent`（原因标记为 `abandoned`），并触发 `checkout.session.expired` Webhook 事件；同时新增 `ExpireStaleCheckoutSessions` 批量清理接口。

2. **跨境收款流程异常处理：部分到账与金额偏差核算（Partial Payment & Discrepancy Handling）**
   - **改进背景**：跨国链上转账容易因手续费扣减、跨链代币滑点或精度转换导致实收金额小于应收金额。原系统直接判定支付失败，但未记录实际到账差额，易导致掉单纠纷。
   - **实现方案**：在数据模型与状态机中新增 `partially_paid` 支付状态与 `amount_received`、`amount_expected`、`partial_payment` 明细；支付确认流程中记录实际收款金额并记录对应账本（Ledger），触发部分到账通知，便于商家人工核实补缴或自动追溯。

3. **卖家后台与对账功能（Seller Portal & Reconciliation Reporting）**
   - **改进背景**：原系统缺少面向 Marketplace 跨境连结账户（Connected / Express Accounts）的独立财务对账中心。
   - **实现方案**：在后端实现 `GET /v1/reporting/reconciliation` 聚合对账接口，按时间范围汇总总流水（Gross Volume）、平台抽成手续费（Fees）、已结算提现（Settled Payouts）、期末结余（Ending Balance）与账目异常标识；在 Node SDK 中新增 `Reporting` 资源与 `reconciliation` 调用；在 Angular 卖家中心（Express Balance）新增「对账报表（Reconciliation）」可视化卡片面板。

4. **系统健壮性与生产构建修复（Build Robustness & Idempotency Safeguards）**
   - **改进背景**：原 Angular 客户端生产构建缺少 `environment.prod.ts` 导致构建报错；结账确认在重复提交签名校验时存在自身 ID 误判冲突隐患。
   - **实现方案**：构建脚本增加自动化生产配置同步（`environment.prod.example.ts` 自动部署）；优化 `CheckoutPayment.ts` 幂等签名匹配排除自身会话 ID，保证高并发重试时的幂等安全性。

---

### 快速开始

#### 1. 环境准备
- Node.js >= 20.0.0
- npm >= 10.0.0
- MongoDB >= 6.0（本地运行或远程连接，使用 Docker 时可一键拉起）

#### 2. 安装依赖
```bash
git clone https://github.com/your-username/zoneless-pay-plus.git
cd zoneless-pay-plus
npm ci
```

#### 3. 配置环境变量
在各子应用下创建对应 `.env` 配置文件（仓库中已提供示例文件）：

```bash
# 复制后端环境变量示例
cp apps/api/.env.example apps/api/.env
```

配置项参考（所有密钥和敏感凭证请使用占位符或自行生成的强随机串，**请勿提交真实密钥**）：
```ini
# API 基础配置
API_PORT=3333
PORT=3333
NODE_ENV=development

# 数据库连接（生产请填写真实集群地址与鉴权）
MONGODB_URI=mongodb://localhost:27017/zoneless

# 平台安全密钥（至少 32 字符的强随机字符串）
APP_SECRET=your_app_secret_at_least_32_characters_here

# 前端应用地址
DASHBOARD_URL=http://localhost:4203
CHECKOUT_URL=http://localhost:4203
PAYMENT_LINK_URL=http://localhost:4203

# 结算轨道配置 (simulated: 测试模拟 | solana: 链上真实)
SETTLEMENT_RAIL=simulated
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_NETWORK=devnet
USDC_MINT_ADDRESS=your_usdc_mint_address_placeholder
TRANSACTION_FEE_PAYER_KEY=your_fee_payer_private_key_placeholder
```

#### 4. 编译与打包
```bash
# 构建 Node.js SDK
npm run build:node

# 构建 API 服务端
npx nx build api

# 构建 Web 前端
npm run build:web
```

#### 5. 启动服务
```bash
# 方式 A：单独启动 API 服务 (http://localhost:3333)
npx nx serve api

# 方式 B：单独启动 Web 控制台 (http://localhost:4203)
npx nx serve web

# 方式 C：启动生产打包产物
node dist/apps/api/main.js
```

#### 6. 运行自动化测试
```bash
# 运行后端核心模块与新增对账/异常流程测试
npx jest apps/api/src/__tests__/Reporting.spec.ts
npx jest apps/api/src/__tests__/CheckoutPayment.spec.ts
npx jest apps/api/src/__tests__/CheckoutSession.spec.ts

# 运行 Node SDK 测试
npx jest sdks/node
```

---

## English Documentation

Zoneless Pay Plus is an open-source cross-border payments platform and seller settlement stack powered by USDC on Solana. It offers a Stripe-compatible REST API, an Angular merchant and platform dashboard, and a full-featured Node.js SDK.

This repository is an enhanced secondary development fork of `zonelessdev/zoneless`. It provides substantial improvements in marketplace reconciliation, checkout timeout lifecycle cleanup, partial payment resilience for cross-border crypto transactions, and build pipeline stability.

### Key Enhancements

1. **Timeout Auto-Expiration & Resource Cleanup**:
   Checkout sessions past `expires_at` automatically transition to `expired` status, cancel linked `PaymentIntent` records with reason `abandoned`, and emit `checkout.session.expired` webhook events. Includes bulk stale session sweeping via `ExpireStaleCheckoutSessions`.
2. **Cross-Border Partial Payment & Discrepancy Handling**:
   Introduced `partially_paid` state along with `amount_received`, `amount_expected`, and discrepancy tracking. Realized payments with slippage or partial wallet balances are recorded on ledger and reported instead of causing silent fund discrepancies.
3. **Seller Portal & Reconciliation Reporting**:
   Implemented `GET /v1/reporting/reconciliation` API, SDK `reporting.reconciliation` method, and Express Dashboard UI reconciliation cards calculating gross volume, platform fees, settled payouts, and ending ledger balances.
4. **Build Robustness & Idempotency Safeguards**:
   Resolved missing `environment.prod.ts` compilation issues in Angular web build, and refined transaction signature idempotency checks to avoid self-collision.

### Quick Start

```bash
# Install dependencies
npm ci

# Build SDK and services
npm run build:node
npx nx build api
npm run build:web

# Run tests
npx jest apps/api/src/__tests__/Reporting.spec.ts apps/api/src/__tests__/CheckoutPayment.spec.ts apps/api/src/__tests__/CheckoutSession.spec.ts sdks/node/src/__tests__/Reporting.spec.ts
```

---

## 来源与致谢 (Sources & Acknowledgements)

本项目基于 zoneless 二次开发，原项目由 zonelessdev 以 Apache-2.0 许可证开源。原项目仓库链接：https://github.com/zonelessdev/zoneless

This project is a rework based on zoneless, originally open-sourced by zonelessdev under the Apache-2.0 license: https://github.com/zonelessdev/zoneless.

---

## 许可证 (License)

本项目沿用原项目的开源许可证，基于 [Apache License 2.0](./LICENSE) 协议发布。完整许可证文本见根目录 [LICENSE](./LICENSE)。
