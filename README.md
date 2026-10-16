# ML 学习路线 · 22 周 / 160 天

从经典机器学习到大模型原理的完整自学路线网站。

## 内容

- **160 天**每日学习内容（约 35.6 万字，覆盖 6 个 Phase：数学 → 经典 ML → DL → Transformer → LLM → 工程/Agent/多模态）
- **910 道**掌握测验题（≥80% 判定掌握，成绩本地保存）
- **7 张**互动式原理图（anatomy 风格等距机械隐喻：梯度下降滑道、偏差-方差天平、反向传播齿轮组、CNN 滑窗冲压、自注意力查询滑架、PagedAttention 分页托盘、ReAct 转盘）
- 学习进度 / 连击 / 掌握统计，数据存于浏览器 localStorage，支持**导出/导入备份**（页面右上角按钮）

## 本地预览

```bash
cd 本目录
python3 -m http.server 8765
open http://localhost:8765/index.html
```

> 直接双击 index.html（file://）会因 CORS 无法加载 days.json。

## 更新与发布

push 到 `main` 分支后 GitHub Actions 自动发布到 Pages（`.github/workflows/deploy.yml`），约 1 分钟生效。

## 目录结构

```
index.html            # 单页应用（无构建、无依赖）
days.json             # 160 天计划
content/days/*.json   # 每日内容 + 测验
figures/              # 7 张互动原理图（自包含 HTML）
docs/                 # 学习诊断与规划原文
favicon.svg
```
