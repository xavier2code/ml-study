# ML 学习路线 · 22 周 / 160 天

从经典机器学习到大模型原理的完整自学路线网站。

[![Deploy to GitHub Pages](https://github.com/xavier2code/ml-study/actions/workflows/deploy.yml/badge.svg)](https://github.com/xavier2code/ml-study/actions/workflows/deploy.yml)
[![Website](https://img.shields.io/website?url=https%3A%2F%2Fxavier2code.github.io%2Fml-study%2Findex.html&label=GitHub%20Pages&up_message=online&up_color=%2362d48f)](https://xavier2code.github.io/ml-study/)
[![Last Commit](https://img.shields.io/github/last-commit/xavier2code/ml-study)](https://github.com/xavier2code/ml-study/commits/main)
[![Stars](https://img.shields.io/github/stars/xavier2code/ml-study?style=social)](https://github.com/xavier2code/ml-study/stargazers)
[![License](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

![Days](https://img.shields.io/badge/天数-160-%234c8dff)
![Hours](https://img.shields.io/badge/总学时-640h-%234c8dff)
![Content](https://img.shields.io/badge/正文-35.6%20万字-%23ffb454)
![Quiz](https://img.shields.io/badge/测验题-910-%23ffb454)
![Figures](https://img.shields.io/badge/互动原理图-7-%2362d48f)

![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)
![No Build](https://img.shields.io/badge/构建-零依赖%20零构建-success)

> 🔗 **在线访问**:https://xavier2code.github.io/ml-study/

## 内容

| | |
| --- | --- |
| **160 天**每日学习内容 | 约 35.6 万字,总学时 640h,覆盖 6 个 Phase:数学 → 经典 ML → DL → Transformer → LLM → 工程/Agent/多模态 |
| **910 道**掌握测验题 | 每日 4–8 题,≥80% 判定掌握,成绩本地保存 |
| **7 张**互动式原理图 | anatomy 风格等距机械隐喻(见下表),自包含 HTML,深/浅双主题 |
| 学习进度 / 连击 / 掌握统计 | 数据存于浏览器 localStorage,支持**导出/导入备份**(页面右上角按钮) |

### 互动原理图

| 图 | 主题 | 在线体验 |
| --- | --- | --- |
| 梯度下降滑道 | 优化:学习率、损失曲面 | [grad-descent](https://xavier2code.github.io/ml-study/figures/grad-descent/grad-descent.html) |
| 偏差-方差天平 | 泛化:欠拟合 / 过拟合 | [bias-variance](https://xavier2code.github.io/ml-study/figures/bias-variance/bias-variance.html) |
| 反向传播齿轮组 | 求导链式法则的机械传动 | [backprop-gears](https://xavier2code.github.io/ml-study/figures/backprop-gears/backprop-gears.html) |
| CNN 滑窗冲压 | 卷积:感受野、特征图 | [cnn-sliding](https://xavier2code.github.io/ml-study/figures/cnn-sliding/cnn-sliding.html) |
| 自注意力查询滑架 | QKV 注意力机制 | [self-attention](https://xavier2code.github.io/ml-study/figures/self-attention/self-attention.html) |
| PagedAttention 分页托盘 | KV Cache 分页管理 | [paged-attention](https://xavier2code.github.io/ml-study/figures/paged-attention/paged-attention.html) |
| ReAct 转盘 | 思考-行动-观察循环 | [react-loop](https://xavier2code.github.io/ml-study/figures/react-loop/react-loop.html) |

## 本地预览

```bash
cd 本目录
python3 -m http.server 8765
open http://localhost:8765/index.html
```

> 直接双击 index.html(file://)会因 CORS 无法加载 days.json。

## 内容校验

每日内容有 schema 检查脚本(节数、正文长度、keyPoints、测验完整性):

```bash
node scripts/check-content.mjs          # 全部 160 天
node scripts/check-content.mjs 1 42 99  # 指定某几天
```

## 更新与发布

push 到 `main` 分支后 GitHub Actions 自动发布到 Pages(`.github/workflows/deploy.yml`),约 1 分钟生效。

## 目录结构

```text
index.html            # 单页应用(无构建、无依赖)
days.json             # 160 天计划
content/days/*.json   # 每日内容 + 测验
figures/              # 7 张互动原理图(自包含 HTML + 构建脚本)
scripts/check-content.mjs  # 内容 schema 校验
docs/                 # 学习诊断与规划原文
favicon.svg
```
