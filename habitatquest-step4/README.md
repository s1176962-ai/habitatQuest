# HabitatQuest · 口语练习 AI 助手（本地可交互原型）

> **演示原型 · 本地运行**。这是一个单机前端原型：没有后端、没有云函数、没有数据库、没有账号体系、没有埋点/分析/错误上报、没有任何 CDN 资源。所有插画、字体栈、图表、音效逻辑都随项目本地打包。

---

## ⚠️ 运行环境约束（务必先读）

**主路径必须走 localhost：**

```bash
npm install
npm run dev
```

然后在浏览器打开 **http://localhost:5173**（或 `http://127.0.0.1:5173`）。

原因：`getUserMedia`（麦克风录音）和 `SpeechRecognition`（浏览器语音识别）只在**安全上下文**下可用，`localhost` 被视为安全上下文，而 `file://` 不是。

**不要直接双击 `index.html` 作为主路径**：`file://` 下拿不到麦克风，浏览器也会拒绝 ES module / stylesheet 的同目录加载。

**兜底不中断**：`npm run build` 会把 CSS 和 JS 内联进 `dist/index.html`，使生产构建成为可直接双击打开的单文件（不发起任何外部资源请求）。当检测到 `file://`、麦克风被拒绝、或系统没有英语语音时，应用会自动提供：

- `<input type="file" accept="audio/*" capture>` 上传录音文件；
- **文字转写兜底**（直接输入英文句子）；
- **「跳过示范 → 录音」** 按钮（无系统 TTS 语音时继续流程）。

但请注意：**`file://` 只是演示降级路径，不是主路径**，完整麦克风体验请用 `npm run dev` + `localhost:5173`。

> 提示：Chrome 的 `webkitSpeechRecognition` 可能由浏览器自身的语音服务实现。**应用在本地通道下不会发起任何 `fetch()`**；右下角「网络请求清单」实时显示 0 条外发请求，这是可由你自己审查的证据。

---

## 快速开始

### 方式一：双击一键启动（推荐）

双击项目根目录的 **`一键启动.bat`**，脚本会自动完成：

1. 检查 Node.js / npm；找不到会提示安装地址，并自动尝试 `C:\Program Files\nodejs`；
2. 首次运行且缺少 `node_modules` 时自动执行 `npm install`；
3. 若发现 5173 端口已有服务在跑，就**只打开浏览器**，不重复启动（Vite 配置了 `strictPort`，重复启动会直接失败）；
4. 启动 Vite，服务就绪后自动打开 `http://localhost:5173`。

**保持那个命令行窗口开着**就表示服务在运行；按 `Ctrl+C` 或直接关闭窗口即停止。

> 脚本正文刻意全部用 ASCII，避免 CMD 代码页导致中文乱码；项目路径含空格或中文也没问题，脚本用 `%~dp0` 定位自身目录。
> 高级用法：设置环境变量 `HQ_NO_OPEN=1` 可禁止自动打开浏览器（用于脚本化 / 无界面运行）。

### 方式二：命令行

| 命令 | 作用 |
|---|---|
| `一键启动.bat` | 双击即可，等价于下面的自动流程 |
| `npm install` | 安装依赖（仅本地，`node_modules/`） |
| `npm run dev` | 开发服务器，绑定 `127.0.0.1:5173`，不自动开浏览器 |
| `npm run start` | 同上，但服务就绪后自动打开浏览器 |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | 类型检查 + 生产构建，输出自包含的 `dist/index.html` |
| `npm run preview` | 预览构建产物，绑定 `127.0.0.1:5173` |
| `npm run proxy` | 启动可选的本机 CORS 转发（见下文） |
| `npm run gen:cards` | 重新生成 12 张本地 SVG 插画（需 Python 3） |

技术栈：Vite 6 + React 18 + TypeScript + Tailwind CSS v4 + GSAP 3 + `lucide-react`。运行时依赖只有 `react / react-dom / gsap / lucide-react`；构建工具全是 devDependencies。无图表库、无 UI 组件库（图表为自绘 SVG）。

**不联网也能上课**：默认即本地通道，断网后 8 轮完整闭环仍然可用。

---

## 中英双语切换（默认英文）

> **默认英文**：首次打开（或清除浏览器数据）后，界面与教学辅助文案全部为英文。选择会写入 `hq4:config` 的 `language` 字段（`en` / `zh`），刷新后保持不变。

**两处入口，状态实时同步：**

| 入口 | 控件 | 说明 |
|---|---|---|
| 顶栏 | `中 / EN` | 一键切换，练习过程中随时可用 |
| 设置抽屉 | `中文 / English` | 与顶栏双向同步 |

切换时同步更新 `<html lang>`（`en` ⇄ `zh-CN`）与浏览器标题（英文 ⇄ 中文），并同步 `aria-label` / `title` 等无障碍标签。

**会切换的内容（界面 + 教学辅助文案）**

- 顶栏、侧栏、常驻步骤条与「下一步」提示、卡片操作按钮、录音器、评分面板、逐词诊断、音标口型提示、Pip 对话区标签、小结、成长报告、设置抽屉、网络请求清单、提示条；
- **动态生成的内容**：本地评分建议、跟读完成提示气泡、开放式回答评价、配额拦截原因、请求日志的用途 / 状态 / 备注、用量明细标签；
- 动物中文名与栖息地中文名（仅中文模式显示，英文模式恢复英文，如 `北极狐 · 极地苔原` ⇄ `Arctic Fox · Polar Tundra`）。

**始终保持英文的内容（学习材料）**

- 目标句与逐词高亮文本；
- Pip 的 Why / How 因果追问、伙伴英文回应、句型支架；
- 学生输入的英文转写与口头回答。

这样切换语言只改变辅助理解所用的语种，不改变练习难度，也不会把英语口语练习变成中文练习。

**实现方式**：`src/i18n/` 是一个零依赖的轻量 i18n store，基于 `useSyncExternalStore` 而非 React Context —— 因为 `quota.ts`、`network.ts`、providers、评分等非 React 模块同样要产出文案。`locales/en.ts` 是默认字典，`locales/zh.ts` 声明为 `Record<keyof typeof en, string>`，由 TypeScript 强制两套键完全对齐。对外 API：`getLang()` / `setLang()` / `subscribeLang()` / `t(key, vars)` / `tr(value, vars)` / `renderPieces(pieces)` / `useI18n()`，字典支持 `{name}` 占位符插值。

关键约定：**动态文案一律存 i18n key，不存成品字符串**（`I18nPiece[]`、`ScoreResult.adviceI18n`、`CheckResult.reasonKey`、`PhonemeHint.tipKey`、`RequestLogEntry.noteVars`）。因此在练习中途切换语言时，已经生成好的气泡、评分建议、回答评价和日志状态都会立即重译，无需重跑流程；中文动物名、栖息地名等展示辅助也由 `habitatName()` / `animalName()` 按当前语言取值。

**一个诚实边界**：API 通道由 LLM 返回的 `advice` 是生成那一刻的成品文本，切换语言后**不会**重译（重新提交评分才会按新语言生成）；本地通道的建议则实时跟随切换。判分 JSON 的字段名与判分逻辑在两种语言下完全一致。

**不受影响**：本地优先、零外发请求、隐私约束、三层配额、8 轮闭环等设计全部不变；配置里只多存一个 `language` 字段。

---

## 语音识别兜底与界面命名

**语音识别不再丢失转写**：浏览器 `SpeechRecognition` 在慢速 / 受限网络下经常只给出 interim（临时）结果，不把它提升为 final。旧实现只收集 final 结果，并且在 `stop()` 的瞬间就冻结转写，于是会出现「屏幕上明明显示 `Recognising: This is an arctic fox…`，提交时却变成 `Didn't catch that`」的情况。现在 `src/lib/speech.ts`：

- 每次 `onresult` 都从**完整结果列表**重建转写（已定稿的 final + 尚未定稿的 interim），并实时写入待读取的转写；
- `stop()` 不再提前冻结，允许引擎在 `stop()` 之后补发 final 结果（Chrome 的常见行为）；
- `Recorder` 在 `MediaRecorder.onstop` 里 `await handle.finish()` 后才生成 take，最多等 900ms 兜底，避免引擎不发 `onend` 时卡住；
- 确实一个字都没拿到时，自动展开「上传 / 输入兜底」并给出提示，不再让学生卡在空转写上；
- `Recognising: ` / `Transcript: ` / `Current: ` 等英文前缀补齐空格。

练习句始终按 `rec.lang = 'en-US'` 识别，与界面语言无关。

**命名**：界面上原有的 `Step 4` 全部换成 `Speaking Practice`（中文 `口语练习`）或 `Voice Practice`（中文 `语音练习`）——顶栏标题、侧栏与顶栏徽标、成长报告徽标、浏览器标题、README 与一键启动脚本。保留的只有内部包名 `habitatquest-step4`、五步教学步骤中的 `guide.step4`（它就是真实的第 4 步「回答 Why/How」）以及两份历史 UI 快照 `hq-*.yml`，它们都不是用户可见文案。

---

## 双通道架构

设置面板里两条通道并列展示，切换时明确提示 `本地通道：不产生任何网络请求` / `API 通道：只向你填写的 Base URL 发请求`。

| | 需要 Key | 实现 | 特点 |
|---|---|---|---|
| **A · 本地通道（默认）** | 否 | TTS = `SpeechSynthesis`；STT = `SpeechRecognition` + 文字兜底；评分 = 本地对齐算法；追问 = 内置 Why/How 题库按规则抽题 | 零成本、零网络、开机即演示 |
| **B · API 通道（增强）** | 是（你自己填） | TTS / STT / LLM 判分与追问 / 可选图像生成 | 打分更准、追问更自然，消耗配额 |

`ProviderAdapter` 抽象位于 `src/providers/`，四个实现：

- `local` — 本地通道
- `openai-compatible` — OpenAI 兼容 `/audio/speech`、`/audio/transcriptions`、`/chat/completions`、`/images/generations`
- `gemini` — Gemini REST `models/{model}:generateContent`，用 `x-goog-api-key` 请求头（**绝不把 key 放进 URL query**）
- `custom` — 自定义 OpenAI 兼容地址

LLM **只做 refinement，不推翻本地结果**：返回必须是严格 JSON，前端做字段校验，解析失败或字段非法即**静默降级**到本地评分/内置题库，不把解析错误抛给用户；本地与 API 分数相差 > 25 分时做 50/50 漂移保护。追问强制校验为 `Why/How ... ?`，否则回落到题库，避免出成 Yes/No 题或语法选择题。

### 可选的本机 CORS 转发

浏览器直连部分 API 供应商会遇到 CORS 限制。项目附一个**只监听 `127.0.0.1:8787`** 的极简转发脚本：密钥由进程内存注入，不写日志、不落盘、不缓存，且校验目标 origin 只能等于你填的 Base URL。

Windows（CMD）：

```bat
set HQ_TARGET_BASE_URL=https://api.openai.com/v1
set HQ_API_KEY=<你的密钥>
node scripts/local-proxy.mjs
```

macOS / Linux / Git Bash：

```bash
HQ_TARGET_BASE_URL=https://api.openai.com/v1 HQ_API_KEY='<你的密钥>' node scripts/local-proxy.mjs
```

然后在设置里勾选「使用本机转发」。设置面板的「复制一键启动命令」会按当前配置生成可直接粘贴的命令。不使用 API 通道时完全不需要启动它。

---

## 交互闭环（8 个阶段 · 8 轮）

`card → listening → recording → scoring → feedback → question → answering → wrap`

**怎么进入下一关**：中间区域顶部常驻一条「第 N / 8 关」步骤条，列出 5 步（听示范 → 跟读录音 → 看发音分 → 回答 Why/How → 小结·下一关），当前步高亮、已完成步打勾，下方还有一句「下一步：…」的具体指引。卡片阶段有一个醒目的主按钮 **「① 听英语示范，开始这一关」**；没有英语语音时点旁边 **「跳过示范，直接录音 →」**。每轮小结后点 **「下一张卡」** 进入下一关，第 8 张卡结束后弹出成长报告。

**界面不挡视线**：

- 右下角「网络请求清单」默认**收成一个小胶囊**（只显示条数），点击才展开完整表格，展开后可点 × 收起。设置里可彻底隐藏，隐藏后仍能通过顶栏的网络按钮随时唤出。
- 顶栏新增 **「收起左右侧栏」** 专注模式按钮（设置里也有同名开关，会持久化）：收起后只保留中间的练习卡片与步骤引导。
- 窄屏下小胶囊自动缩成只显示条数，提示条上移，两个浮层不会互相遮挡。

1. 展示动物 + 栖息地图片卡（内置 12 张本地 SVG：6 类栖息地 × 2 只动物）。
2. 点击卡面听英文示范，逐词卡拉 OK 高亮，可 `0.75×` 慢速 / 重听 / 隐藏字幕。
3. 按住录音复述并描述（`Space` 按住、`Enter` 提交、`Esc` 取消；触屏可点按），10 秒上限、静音自动截断、32 柱实时波形。
4. 逐词判分：绿=读准 / 黄=轻微偏差 / 红=漏读错读 / 灰删除线=多余词；给出 `准确度 50% + 流利度 25% + 完整度 25%` 的总分与一句具体建议。
5. 点击红/黄单词弹出音标 `/θ/` + 一句中文口型提示 + `0.75×` 慢速示范。
6. AI 伙伴 **Pip** 提一个 Why/How 因果追问（CLT 信息差：Pip 看不到卡，学生必须描述）；只问推理题，不问 Yes/No。
7. 开放式回答**不按目标句判分发音**，改评「是否切题 / 是否用了 because、so that / 长度 ≥ 5 词 / 流利度」，伙伴给自然回应而非纠错轰炸。
8. 本轮小结 → 下一张卡；8 轮结束生成会话成长报告（自绘 SVG 折线图、最高分、进步幅度、Top 5 错词、最佳栖息地）。

另含：双人练习（同桌轮流说同一张卡）、明暗主题、成长报告、响应式布局、键盘操作、`prefers-reduced-motion` 支持、教学法说明（CLT / 社会建构主义 / Bloom 高层思维 / 儿童安全）。

---

## 隐私与「网络请求清单」

- **统一网络出口**：所有对外请求只能经过 `src/lib/network.ts` 的 `networkRequest()`；其它源码里没有 `fetch(`。它负责校验目标域名 === 用户填的 Base URL、配额预扣、写入请求清单、剥离日志里的 `Authorization` / `x-goog-api-key`。
- **每次会话列出会访问的外部域名**：本地通道 0 个；API 通道仅 1 个（你填的 Base URL），显示在设置面板顶部。
- **右下角「网络请求清单」**：逐条列出 `# / 时间 / 目标域名 / 用途 / token 入出 / 状态`，底部显示本地通道请求数与累计 tokens；一键清空。绿色状态条显示 `本地模式 · 未发起任何外部请求` 或 `仅连接至 <域名>`。
- **密钥**：密码框 + 显示/隐藏 + 掩码展示，默认 `sessionStorage`（关标签页即清除），可选 `localStorage`；与其它配置、学习记录、请求日志**分开存储**；绝不进入 URL query、`console.log`、错误文本、学习记录或导出的 JSON。
- **录音不落盘**：audio blob 只留内存，打分完成后 `URL.revokeObjectURL` 并置空；`本次会话不保存录音` 默认开启。
- **学习记录**（分数、错词、轮次）只存 `localStorage`，可一键导出 / 清空。
- 阶段切换与卸载时清理 `MediaStream.getTracks().stop()`、`AudioContext.close()`、`speechSynthesis.cancel()`、blob URL、`AbortController.abort()`、RAF/interval 与 GSAP tween。

---

## 三层用量限制

| 层级 | 主要上限 |
|---|---|
| 单次调用 | TTS 240 字符、录音 10 秒、判分 250 tokens、追问 120 tokens、超时 15 秒、图像 ≤ 1024px |
| 每轮 / 每会话 | 重录 3 次、重听 2 次、每轮 1 次 API 判分/1 次追问/1 次回答评分、8 轮、20 次 LLM 调用、3000 TTS 字符、12000 tokens、2 张图 |
| 每日（本机日期键，本地零点重置） | 60 次 API 调用 / 估算 ¥5.00 |

每次调用前预扣、调用后按 API 返回的真实 `usage` 校正；超限硬拦截并弹友好提示，不静默失败。顶栏常驻用量仪表，80% 变琥珀、100% 变红并禁用相关按钮，提示可切回本地通道继续练习。单价可在设置里手填，只做本地估算、不联网查价。

> **诚实说明**：以上是**客户端成本护栏**，用于课堂演示和防止误操作，**不是安全边界**。计数存在浏览器本地，可被清除或绕过；真正硬的额度必须在 API 供应商控制台设置（并给专用密钥设消费上限）。

---

## 能力边界（诚实标注）

> **本原型的发音评分是基于文本对齐 + 识别置信度的「可懂度与跟读准确度」评估，不是音素级声学评分，不能宣称「专业发音测评」。**

具体来说：

- 本地评分把识别转写与目标句做归一化（缩写展开、英美拼写、数字/单词等价）、模糊编辑距离对齐，再按 `准确度 50% + 流利度 25% + 完整度 25%` 计算；逐词着色反映的是**转写文本与目标文本的差异**，不是对声学音素的直接测量。
- 流利度基于 WPM（理想 90–150）、长停顿、填充词 `um/uh/er` 的近似估计；浏览器 STT 不总是返回词级时间戳，此时使用近似时值。
- 音标与口型提示来自内置 30 条常见易错音素规则表，是**教学提示**而非声学诊断结果。
- 识别准确率受浏览器、麦克风、环境噪声、口音影响；同一句话换浏览器可能得到不同分数。
- API 通道即使启用，LLM 也只依据**转写文本**做 refinement，同样不是音素级评测。
- 因此本原型适合**课堂演示、形成性鼓励与练习流程验证**，不适合作为考试评分、诊断结论或升学依据。

其它已知限制：

- 追问与伙伴回应的质量取决于所选模型；本地通道使用固定题库与模板，语言变化有限，但保证闭环可用。
- `SpeechSynthesis` 的可用英语语音取决于操作系统；无语音时请用「跳过示范 → 录音」和文字兜底。
- 无账号、无跨设备同步、无服务端；清除浏览器数据即清除本机记录。
- `file://` 下不能录音，只能上传音频文件或输入文字。
- 图片生成是可选增强，失败自动回落到本地 SVG 插画。

---

## 目录结构

```
scripts/gen_cards.py          生成 12 张本地 SVG 插画
scripts/local-proxy.mjs       可选本机 CORS 转发（127.0.0.1:8787）
src/assets/cards/*.svg        6 栖息地 × 2 动物的本地插画
src/i18n/                     index.ts（store / t / tr / renderPieces / useI18n）+ locales/en.ts、zh.ts
src/mock/                     cards.ts / questionBank.ts / phonemeHints.ts / partner.ts
src/lib/
  storage.ts                  密钥 / 配置 / 学习记录 / 请求日志（分离存储 + clearAll）
  quota.ts                    三层配额（内存计数 + localStorage 日键）
  network.ts                  唯一 fetch 出口：域名校验 + 记账 + 日志脱敏
  audio.ts / speech.ts        TTS、Web Audio、SpeechRecognition 封装
  scoring/local.ts            纯本地文本对齐评分
  scoring/refine.ts           严格 JSON 校验 + 漂移保护 + 静默降级
src/providers/                 local / openai-compatible / gemini / custom
src/components/                TopBar / SettingsDrawer / NetworkPanel / CardStage /
                               Recorder / WordLine / ScorePanel / Conversation /
                               GrowthReport / Charts / LeftRail / Toasts
src/App.tsx                    8 阶段状态机与编排
vite.config.ts                 本地 dev 配置 + 生产 HTML 自包含内联插件
```

---

## 验收自检（已逐项验证）

- `npm run typecheck` 与 `npm run build` 通过，构建产物 `dist/index.html` 自包含、无外部资源引用。
- `http://localhost:5173` 与 `file:///.../dist/index.html` 均能加载，控制台 **0 error / 0 warning**。
- 本地通道完整跑通 **8 轮 × 8 阶段**（card → … → wrap，全程文字兜底），第 8 轮后成长报告正常弹出；网络请求清单全程保持 **0 条**，状态条显示 `本地模式 · 未发起任何外部请求`。
- `file://` 下自动出现「麦克风不可用？功能不中断」及上传 / 文字兜底；`dist/index.html` 内联 CSS/JS，无任何外部资源引用。
- 设置抽屉、教学法说明、用量明细、网络请求清单、明暗主题、双人模式、`Esc` 关闭均正常。重复提示会去重、提示条固定在左下角，不遮挡成长报告弹窗。
- 网络清单的「收起 ⇄ 展开」、设置里的隐藏开关（隐藏后顶栏仍能唤出）、顶栏与设置两处的专注模式开关均通过；第 N/8 关步骤条与主 CTA 能推进到下一关；375px 下提示条与网络小胶囊的包围盒不重叠。
- 密钥框为 `type=password`；默认仅存在于 `sessionStorage`，`localStorage`（含学习记录）中搜不到完整 key；「清除密钥」后立即消失。
- 375px 宽无横向滚动，`documentElement.scrollWidth === innerWidth`。

### 中英双语（本轮新增，已逐项回归）

- 全部改造完成后重新执行 `npm run typecheck` / `npm run build`，均通过（`✓ 1624 modules transformed`）；`dist/index.html` 仍是自包含单文件（约 469 KB，无外部 `src` / `href`），默认 `<html lang="en">` 与英文标题。
- 清除 `hq4:config` 后刷新：顶栏 `EN` 为 pressed、`<html lang="en">`、英文标题；点 `中` → `zh-CN` + 中文标题 + `language: "zh"`；刷新后仍为中文；点 `EN` 恢复英文。
- 顶栏与设置抽屉两处开关双向同步（在抽屉里点 `中文` 后，顶栏 `中` 同步为 pressed，`hq4:config.language === "zh"`）；`Esc` 正常关闭抽屉。
- 界面与教学辅助文案全部随语言切换；目标句 `This is an arctic fox...`、Pip 的 `Why is white a useful colour for this animal?`、伙伴英文回应、句型支架在两种语言下均保持英文。
- **动态内容跟随中途切换**：在 `feedback` / `question` / `wrap` 阶段切换语言，评分建议 `读得很完整！…` ⇄ `Very complete!…`、气泡 `跟读完成 · 98 分 · 本地评分` ⇄ `Read-aloud complete · 98 pts · Local scoring`、回答评价 `回答切题 · 用了因果连接词 · 长度 22 词 · 表达流畅` ⇄ `On topic · used a causal connector · 22 words · fluent delivery`、小结与栖息地名 `极地苔原` ⇄ `Polar Tundra` 均即时重译，无需重跑流程。
- 本地通道全程 **0 条外发请求**（请求日志为空、状态条显示本地模式）；`375px` 下 `scrollWidth === innerWidth`（375 = 375），无横向滚动；控制台 **0 error / 0 warning**。
- 生产构建产物单独通过本机 HTTP 服务回归：默认 `en`、页面内无外部 `script[src]` / `link[href]`、切到 `zh` 后标题与文案变为中文、刷新后仍为中文，控制台 **0 error / 0 warning**。
- `card → listening → recording → scoring → feedback → question → answering → wrap` 八个阶段在中文与英文下均以文字兜底回归通过。

> 本轮自动化浏览器禁止 `file:` 协议，因此 `file:///.../dist/index.html` 未在本轮重复打开（此前已验证过）；改用本机 HTTP 服务加载**同一份**自包含构建产物完成回归，结论一致。

### 语音识别与命名（本轮新增，已逐项回归）

- 用模拟的 `SpeechRecognition` 覆盖四个场景：**只有 interim 结果** → 仍能拿到完整转写；final 结果在 `stop()` **之后**才到达 → 正常收下（置信度 0.85）；`abort()` → 清空且不泄漏到下一次录音；引擎不发 `onend` → 903ms 后由兜底定时器返回，流程不卡死。
- `npm run typecheck` / `npm run build` 通过（`✓ 1624 modules transformed`），`dist/index.html` 标题为 `HabitatQuest · Speaking Practice (Local Prototype)`。
- 默认英文：顶栏 `HabitatQuest · Speaking Practice`、徽标 `Voice Practice`，页面文本已无 `Step 4`；切中文后为 `HabitatQuest · 口语练习` / `语音练习`，标题与 `<html lang>` 同步切换。
- 英文 CTA 较长，曾导致 375px 下 2px 横向滚动；已让 `.cta-row .btn-lg` 在窄屏换行。现 375px / 320px 下 `scrollWidth === innerWidth`，1440px 下按钮仍为单行。
- 文字兜底全流程回归通过（`Transcript: This is an arctic fox…` → 评分面板），控制台 **0 error / 0 warning**。

未做（按设计）：真实 API Key 的联网调用验证 —— 原型以本地优先，联网行为由使用者自行在「网络请求清单」中审查；API 通道下 `advice` 的语言跟随与静默降级逻辑未做真实联网回归。真实浏览器麦克风 + 云识别的端到端联调依赖本机硬件与网络，本轮以模拟引擎 + 文字兜底路径覆盖。
