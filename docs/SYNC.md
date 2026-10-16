# 同步 GitHub 标准步骤

> 仓库：`Whensunnypassed/tzy`（分支 `main`）
> 适用：任何模型/开发者接手本项目后，按以下流程将本地改动同步到 GitHub。

---

## ① 检查改动与构建验证

```powershell
cd "<仓库根目录>"   # 本机为 D:\tzy\tzy-remote
git status              # 查看改动文件
npm.cmd run build:pages # vite build 验证（必须通过才能提交）
```

## ② 维护版本号（正式版约定，两处必须同步修改）

| 文件 | 位置 |
|---|---|
| `package.json` | `"version": "1.x.x"` |
| `src/pages/BaZiAnalyzerPage/BaZiAnalyzerPage.tsx` | `const APP_VERSION = '1.x.x'`（约 504 行，网页页脚会显示） |

- 功能 / UI 改动 → 递增次版本号（如 `1.1.0 → 1.2.0`）
- 仅修 bug → 递增补丁号（如 `1.1.0 → 1.1.1`）
- 必须与 Git 提交信息中的版本号保持一致。

## ③ 提交（pre-commit 已恢复，正常提交）

```powershell
git add package.json src/pages/BaZiAnalyzerPage/BaZiAnalyzerPage.tsx src/utils/baziAnalyzer.ts
git commit -m "feat: 改动简述（v1.x.x）" -m "- 要点1" -m "- 要点2"
```

> **注意**：pre-commit 已恢复，提交时会自动执行 `npm run precommit`（typecheck + eslint），请勿再加 `--no-verify`。
> 原因（历史记录）：模板遗留的 `src/components/ui/calendar.tsx`、`resizable.tsx` 类型错误与 `eslint.config.mjs` 导出问题曾导致 lint 失败，与本项目业务代码无关。该问题已修复：两个组件已删除、`eslint.config.mjs` 已重写为自包含配置、`core.hooksPath` 已指向 `.githooks`，门禁现可正常通过。
>
> 提交信息风格参考（简体中文，conventional commits）：
> `feat:` 新功能 / `fix:` 修复 / `refactor:` 重构 / `docs:` 文档。

## ④ 推送

```powershell
git push
```

## ⑤ （可选）部署 GitHub Pages 线上

```powershell
npm.cmd run build:pages   # 生成 dist/（含 404.html 复制）
npx gh-pages -d dist      # 推送到 gh-pages 分支
```

- 线上地址：`https://Whensunnypassed.github.io/tzy/`
- base 已配置为 `/tzy/`（见 `vite.config.ts`，可用环境变量 `VITE_PAGES_BASE` 覆盖）。

---

## 约定备忘

- 一次改动完成后统一同步，不要边改边推（避免零碎提交）。
- 版本号变更必须在提交前完成，且 `package.json` 与 `APP_VERSION` 保持一致。
- 部署（步骤⑤）仅在用户明确要求"部署到线上站点"时执行。
