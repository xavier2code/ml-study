# 调研结果诊断 + 定制路线图

> 基于你提交的 124 题作答生成。

---

## 一、你的画像

| 维度 | 现状 | 含义 |
|---|---|---|
| 工作年限 | 10 年软件开发 | 编程思维、调试能力、阅读源码 **强项** |
| 数学基础 | 9/60（15%）| 线代/微积分有印象，**概率/优化基本为零** —— 最大短板 |
| 编程工程 | 10/30（33%）| Linux/Docker/SQL/Git 熟练；**Python 数据栈、PyTorch 源码、CUDA 没碰过** |
| 经典 ML | 1/66（1.5%）| **几乎为零** —— 不能跳过 |
| DL 基础 | 2/60（3%）| 仅听过感知机/激活函数；**反向传播、训练机制全部 0** |
| Transformer | 0/45（0%）| **完全空白** —— 最关键缺口 |
| LLM 应用 | 6.4 节 6/21（29%）| RAG/Function Calling/Agent/Prompt 都用过；架构/推理/对齐全部 0 |
| 工程实战 | 6/24（25%）| **跑过 ≥1B 模型（3 分）、用过 vLLM 部署、踩过 OOM** —— 已有 LLM 实战经验 |
| **总掌握度** | **34/375（9%）** | 落在"5–15%：可跳过部分 Phase 0"档 |

### 关键洞察

1. **你是"应用层熟手 + 理论层新手"**：用过 vLLM、RAG、Agent 框架，但对模型本身一无所知。这是很多后端转 ML 的人的典型状态——能调 API，不能解释。
2. **你给的回答"学过但没懂：神经网络"**，是这份数据里最重要的一句话。说明你的卡点是 **「整个训练机制为什么 work」**——这是 Phase 2 的核心使命。
3. **目标拆解**：
   - "训练自己的小模型" → 必须吃透 Phase 2、3、4 的训练侧
   - "开发大型分布式 Agent 平台" → 你的工程底子已经够；需要补的是 Agent **架构设计** 和 **LLM 推理原理**（vLLM/KV cache 显存/吞吐）——这是你做"工程决策"的依据
   - "视频分析" → 多模态（ViT / Qwen-VL / 视频理解）
   - "语音转写" → Whisper / Paraformer 体系，理解 encoder-decoder 架构

---

## 二、定制路线图

> 保留原路线图骨架，**删除你已会的 / 弱化你不在意的 / 加粗你目标相关的**。

```
Phase 0  数学与 Python 工具栈        ← 压缩：1 周（线代微积分跳到速通，概率+信息论必学）
Phase 1  经典机器学习                ← 完整保留：3 周（不能跳，是后续所有概念的地基）
Phase 2  深度学习基础                ← 加重：5 周（反向传播 + 训练机制必须打透）
Phase 3  Transformer 与预训练范式     ← 加重：4 周（卡点最多的章节）
Phase 4  大语言模型（LLM）深入        ← 核心：5 周（训练侧 + 推理侧 + 对齐都要）
Phase 5  工程与 Agent 方向            ← 你的主战场：3–4 周
```

按 4 小时/天节奏，**总周期约 4 个月**。

---

## Phase 0 — 速通版（1 周）

**跳过 / 弱化**（你有印象，跳过基础课）：
- 线性代数基础（1.1 拿到 27%，已够用）
- 一元/多元求导（1.2.1 拿到 2）
- 矩阵运算、链式法则直觉

**必须学**（0 分或 1 分）：
- **概率与信息论**（1.3 全部 + 1.4 全部）：**整段重学**
  - 为什么 DPO 的损失是负对数似然？为什么 KL 散度是奖励模型的正则项？
  - 这些概念在 Phase 4 会反复出现
- **凸优化直觉**（1.4.1, 1.4.2, 1.4.4）：**SGD、Adam、凸函数**——必须理解
- **拉格朗日乘子**（1.4.3）：理解 SVM 必需
- **Python 数据栈**（2.2, 2.3）：用 3 天集中学 **numpy 广播 + pandas 基础**——这是后续所有练习的载体

**Python 工程栈你已经会的**（2.4–2.8）：git/Linux/Docker/SQL/多线程，**直接跳过**。

### 0 期里程碑
✅ 用 numpy 实现 softmax + cross-entropy + 标量对矩阵的梯度，**用 PyTorch autograd 对比**。

---

## Phase 1 — 经典机器学习（3 周）

> 这是不能跳的。即使你最终只做 LLM，"梯度下降优化一个分类损失"这件事的训练直觉，必须从经典 ML 里建立。

**学法**（4h/天）：
- 每天 1.5h 看课（吴恩达 MLS 第一门课 / 跳过第二门）
- 每天 1.5h 写代码 + 1h 复盘
- 第 3 周完成 Kaggle Titanic 完整流程

**重点**（你得分的薄弱区）：
- 偏差-方差、训练/验证/测试集、K 折交叉验证——**Phase 2 直接依赖**
- 线性回归推导 + L1/L2——**理解权重衰减、KL 正则**
- 逻辑回归 + CrossEntropy + Softmax——**Phase 2 损失函数基础**
- 决策树、随机森林、XGBoost——**表格数据/特征工程的工业界 baseline**
- PCA 推导——**理解 embedding 降维、t-SNE**

**可以略过**：
- SVM 核函数推导（理解原理即可）
- 朴素贝叶斯（不重要）
- DBSCAN（不重要）

### 1 期里程碑
✅ Kaggle Titanic：自己写 train/val 切分、特征工程、对比 LR/决策树/XGBoost、解释为什么选 X。

---

## Phase 2 — 深度学习基础（5 周，重点周）

> **这是你的核心卡点。** 你说"神经网络"是学过没懂的——这一阶段要彻底解决它。

### 节奏（4h/天 × 5 周）

| 周 | 主题 | 每天拆分 |
|---|---|---|
| **W1** | MLP + 反向传播 | 1.5h 理论（链式法则矩阵版），2.5h 代码（纯 numpy 写 2 层 MLP 手动反向传播） |
| **W2** | 训练机制 | 1.5h 理论（SGD/Momentum/Adam/AdamW、学习率、初始化），2.5h 代码（用 PyTorch 训 MLP on MNIST） |
| **W3** | 正则化 + CNN | 1.5h 理论（Dropout/BN/LN/数据增强、CNN 架构演进），2.5h 代码（PyTorch 训 ResNet-20 on CIFAR-10） |
| **W4** | RNN + Seq2Seq + 注意力 | 1.5h 理论，2.5h 代码（用 PyTorch 写一个英德翻译小 demo） |
| **W5** | 整合项目 | 完整训练一个文本分类模型，跑通混合精度 + wandb 跟踪 + 简单的 DDP 单机多卡 |

### 重点资源
- **首选**：《Dive into Deep Learning》(D2L) 中文版，**全部章节写代码**
- **视频**：李宏毅《深度学习》作业也做
- **跳过**：3Blue1Brown NN 系列（你已经有基础）

### 2 期里程碑
1. **纯 numpy 手写反向传播**（对 2 层 MLP），对比 PyTorch 误差 < 1e-6
2. **PyTorch 训 ResNet-20 on CIFAR-10 ≥ 88%**
3. **手写 mini Transformer**（用 PyTorch 写一个 6 层 encoder 做文本分类）—— 提前进入 Phase 3

---

## Phase 3 — Transformer 与预训练（4 周）

> 你 6.4 节拿了 29%，说明你用过 LLM 但不知道它怎么来的。这一阶段要打通「为什么 Attention 是分水岭」。

### 节奏（4h/天 × 4 周）

| 周 | 主题 | 重点 |
|---|---|---|
| **W1** | Attention 机制深入 | 公式推导、Multi-Head 动机、Self vs Cross、causal mask |
| **W2** | Transformer Block + 位置编码 | 残差/LN/FFN、Pre-norm vs Post-norm、**RoPE 数学原理**（重要，后面到处用） |
| **W3** | 三大架构 + Tokenizer | Encoder-only/Decoder-only/Enc-Dec 差异；**BPE 算法手写**（Karpathy minbpe） |
| **W4** | 整合：从零实现 mini-GPT | 在 TinyStories 上预训练 50M 参数的 mini-GPT |

### 资源
- **精读论文**：Vaswani 2017 *Attention is All You Need*（边读边实现）
- **精读论文**：Devlin 2018 *BERT* + Radford 2019 *GPT-2*
- **代码**：Karpathy *nanoGPT* + *Let's build GPT* 视频
- **课程**：Stanford CS336 *Language Modeling from Scratch*（前 4 讲）

### 3 期里程碑
1. **用 PyTorch 从零实现 nanoGPT**（500 行内），在 TinyStories 上能生成连贯句子
2. **手写 BPE tokenizer**（不要调包）

---

## Phase 4 — 大语言模型深入（5 周）

> **你的最终目标地**。这一阶段吃透，你就从"调包"变"能设计、能训练、能优化"。

### 4 周安排（5 周 = 4 周核心 + 1 周缓冲）

| 周 | 主题 | 每天拆分 |
|---|---|---|
| **W1** | LLaMA 架构 + RoPE/GQA/RMSNorm | 2h 精读 Llama 2 paper，2h 用 PyTorch 实现 mini-LLaMA（130M） |
| **W2** | 预训练 pipeline | 2h 数据流水线、2h 训练 mini-LLaMA on TinyStories（半天跑通） |
| **W3** | 对齐：SFT + DPO/GRPO | 1.5h 理论（RLHF→DPO→GRPO 演进），2.5h 代码（用 TRL 做 SFT+DPO） |
| **W4** | 推理与加速 | 2h 理论（KV cache、PagedAttention、FlashAttention），2h 实操（vLLM 部署 + benchmark） |
| **W5** | 整合项目 + 量化 | 1.5h 量化理论（GGUF/AWQ/INT4），2.5h 用 llama.cpp 量化部署自己的模型 |

### 重点资源
- **必读论文**：Llama 2、DeepSeek-V2/V3（MoE 实践典范）、FlashAttention、PagedAttention(vLLM)
- **课程**：Stanford CS336 后半段
- **代码**：
  - Karpathy *nanoGPT*（完整 pipeline）→ *llm.c*（CUDA 视角）
  - Hugging Face TRL（DPO/GRPO）
  - vLLM、llama.cpp（部署）

### 4 期里程碑
1. **实现 mini-LLaMA 130M**（含 RMSNorm + RoPE + SwiGLU + GQA），在 TinyStories 上预训练
2. **端到端对齐**：用 TRL 对上面模型做 DPO，附 loss 曲线 + 生成样例
3. **vLLM 部署 + benchmark**：对比 KV cache 显存 vs 吞吐量

---

## Phase 5 — 工程与 Agent 方向（3–4 周，目标驱动）

> 你目标是"企业级分布式 Agent 平台 + 视频分析 + 语音转写"。这一阶段按你的目标**选方向**。

### 推荐分配

**1. Agent 平台方向**（2 周，必学）
- **RAG 深入**（1 周）：
  - 稠密检索 + BM25 + Rerank + HyDE + GraphRAG
  - 实战：搭一个能跑通 100 万文档的 RAG 服务
- **Agent 架构**（1 周）：
  - ReAct、Reflexion、Plan-and-Execute
  - Multi-Agent 编排（LangGraph / CrewAI / AutoGen）
  - 工具调用协议、Function Calling 标准
  - 实战：搭建一个能调度 5+ 工具的 Agent，**带观测**（Langfuse / Arize Phoenix）

**2. 多模态与语音**（1 周，按需）
- 视频分析：**Qwen2.5-VL / InternVL**（开源 SOTA）
- 语音转写：**Whisper / Paraformer**（理解 encoder-decoder 架构 + 音频特征）
- 实战：搭一个「上传视频 → 抽关键帧 + 转写音轨 → 总结」的服务

**3. 工程化**（贯穿，持续）
- 你已经有 7.1/7.5/7.6 基础；补 7.2/7.3/7.4
- 重点：**生产级 LLM 服务**（限流、灰度、A/B 评估、可观测性）

### 5 期里程碑
✅ 一个可上线的端到端项目（**任选其一**）：
- 企业级 RAG 知识库（含权限、审计、评估）
- 分布式 Agent 平台（多租户、工具市场、可观测）
- 视频理解 + 语音转写 Agent（一站式）

---

## 三、针对你目标的关键建议

### "训练自己的小模型"
- 这是 Phase 2–4 的核心成果
- 重点里程碑：**自己训练一个 1B 参数的中文小模型**（用 Qwen/Llama 架构 + 公开数据如 SkyPile/TigerBot 数据）
- 工具栈：Hugging Face transformers + TRL + DeepSpeed Zero-3

### "开发大型分布式 Agent 平台"
- 你的工程底子已经够，**不要花太多时间在分布式技术上**（你已经会 Docker，会部署 vLLM）
- 重点补的是 **Agent 架构设计 + LLM 推理原理**（这决定你的 API 设计、限流策略、成本控制）
- 推荐工具栈：**LangGraph（编排）+ vLLM（推理）+ Milvus/Qdrant（向量）+ Langfuse（可观测）+ FastAPI（服务层）**

### "视频分析 + 语音转写"
- 不要从头训！直接用开源 SOTA：
  - 视频：Qwen2.5-VL-7B（API 或自部署）
  - 语音：Whisper-large-v3（多语言）或 Paraformer（中文）
- 重点学：多模态架构（Vision Encoder + LLM）、音频特征工程、ASR/TTS pipeline
- **不要在 Phase 1–4 之外再为多模态投入太多时间**，它们是应用层

---

## 四、前 2 周行动清单

> 今天开始。

### Week 1：数学速通 + Python 工具栈（4h/天）

| 天 | 内容 | 时长 |
|---|---|---|
| Day 1 | 信息论：熵、KL 散度、互信息（3Blue1Brown *Information Theory*）| 1.5h |
| Day 1 | numpy 基础：数组、广播、矩阵乘法 | 1h |
| Day 1 | 概率基础：常见分布、贝叶斯（StatQuest *Statistics Fundamentals* 第 1–4 集）| 1.5h |
| Day 2 | 信息论 + numpy 练习：用 numpy 计算 KL 散度、熵 | 4h |
| Day 3 | 优化基础：SGD、Momentum、Adam 直觉（李宏毅《机器学习》第 1–2 讲）| 2h |
| Day 3 | pandas 基础：DataFrame、groupby、merge（Kaggle Learn）| 2h |
| Day 4 | 凸优化直觉：凸集、凸函数、局部/全局最优 | 1.5h |
| Day 4 | 用 numpy 实现 softmax + 矩阵乘法 + cross-entropy | 2.5h |
| Day 5 | MLE 推导 + 信息论综合 | 2h |
| Day 5 | 写一个完整的 numpy MLP 前向 + 交叉熵损失 | 2h |
| Day 6 | 拉格朗日乘子直觉（SVM 章节）| 1.5h |
| Day 6 | 写一个对比：numpy 实现 vs PyTorch autograd 梯度差 < 1e-6 | 2.5h |
| Day 7 | 复盘 + 写 blog：把"梯度"这件事讲给别人听 | 4h |

### Week 2：经典 ML 启动（4h/天）

| 天 | 内容 | 时长 |
|---|---|---|
| Day 8 | 吴恩达 MLS 第一门课 Week 1（监督学习 + 回归）| 2h |
| Day 8 | numpy 实现线性回归 + 最小二乘 + 解析梯度 | 2h |
| Day 9 | Week 2（梯度下降 + 学习率）| 2h |
| Day 9 | sklearn LinearRegression + 数值梯度对比 | 2h |
| Day 10 | Week 3（分类 + 逻辑回归）| 2h |
| Day 10 | numpy 实现逻辑回归 + cross-entropy | 2h |
| Day 11 | L1/L2 正则化（理论 + sklearn 实验）| 2h |
| Day 11 | 偏差-方差诊断（学习曲线绘制）| 2h |
| Day 12 | 决策树 + 随机森林（理论）| 2h |
| Day 12 | 用 sklearn 训 Titanic，对比 LR / RF | 2h |
| Day 13 | XGBoost / LightGBM（理论 + Titanic 调优）| 2h |
| Day 13 | 评估指标：accuracy / precision / recall / F1 / ROC-AUC 手算 | 2h |
| Day 14 | 完整跑通 Titanic：特征工程 + 模型对比 + README | 4h |

---

## 五、关键时间节点

| 节点 | 时间 | 检验标准 |
|---|---|---|
| Phase 0 完成 | Day 7 | numpy 梯度对比 PyTorch 误差 < 1e-6 |
| Phase 1 完成 | Day 35 | Kaggle Titanic top 30%（公开榜）|
| Phase 2 完成 | Day 70 | PyTorch 训 ResNet-20 on CIFAR-10 ≥ 88% |
| Phase 3 完成 | Day 98 | mini-GPT 在 TinyStories 上 loss 平稳下降 + 生成连贯 |
| Phase 4 完成 | Day 133 | mini-LLaMA 130M 预训练 + DPO + vLLM 部署完成 |
| Phase 5 完成 | Day 160 | 端到端可上线的项目跑通 |

按 4h/天节奏，**总周期约 5.5 个月**（含缓冲）。

---

## 六、给你的 3 条具体建议

1. **别再学 vLLM 怎么用了**——你会用。**学 vLLM 为什么这样设计**（PagedAttention、连续批处理）。这就是你从"应用"到"原理"的转换点。
2. **回答你"没突然想通过"**——这是正常状态。深度学习的学习曲线是「平 → 突然上 → 再平」，你目前的"平"是打基础阶段。Phase 2 中段（手写反向传播）会是你的"上"。
3. **针对"训练自己的小模型"**——目标锁定 **1B 参数的 LLaMA 架构中文小模型**，在 H100/A100 集群上微调（用 LLaMA-Factory 或 TRL），这是企业里 LLM 工程师的"作品集标配"。

需要我帮你把这份计划**拆成每日任务**同步进你的笔记系统（Notion / Obsidian / Apple Reminders）吗？或者你想先调整哪个 Phase 的深度？
