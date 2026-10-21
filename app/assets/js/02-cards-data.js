/* =========================================================
   02-cards-data.js — 本地塔罗牌库（22 张大阿尔卡那）
   数据与 UI 分离。每张牌的正位 / 逆位有独立解释，
   逆位不是把正位文字前面加一个「不」。
   verdict 权重由牌面规则给出，再叠加主题规则决定结果倾向。
   ========================================================= */
(function (window) {
  'use strict';

  var MO = window.MO || (window.MO = {});

  var TOPICS = [
    { id: 'love',    label: '感情关系' },
    { id: 'study',   label: '学业考试' },
    { id: 'career',  label: '事业选择' },
    { id: 'relation',label: '人际关系' },
    { id: 'growth',  label: '自我成长' },
    { id: 'free',    label: '不设主题' }
  ];

  /* 每个主题的占卜问题示例
     上一版「写下问题」模式的素材：当前形态不收集问题，暂未启用，保留供后续复用。 */
  var TOPIC_EXAMPLES = {
    love: [
      '我和已经冷下来的人，还应该再主动一次吗？',
      '现在的这段关系，是让我变好还是让我变钝？',
      '我是不是把喜欢误当成了将就？'
    ],
    study: [
      '离考试只剩一个月，我该保稳还是冲一把？',
      '我一直在准备，但总觉得哪里没对。',
      '要不要放弃那条一直学不进去的路？'
    ],
    career: [
      '两个机会摆在我面前，怎么才算不后悔？',
      '留在这里等机会，还是先去一个更小的位置？',
      '我想做的事，真的值得我现在的代价吗？'
    ],
    relation: [
      '对方突然变淡了，我该问还是该退？',
      '这段友情让我不舒服的地方，我要说破吗？',
      '我是不是在替别人想得太多？'
    ],
    growth: [
      '我最近在回避的到底是什么？',
      '我想要的松弛，是懒还是累？',
      '如果不为别人的期待，我到底要什么？'
    ],
    free: [
      '最近反复出现的那件小事，意味着什么？',
      '我现在最该放下的，是哪一样？',
      '有没有一件我以为的坏事，其实是别的东西？'
    ]
  };

  /* 主题对结果的轻微偏置：与牌面规则相加后取最大值 */
  var TOPIC_BIAS = {
    love:     { go: 0, wait: 1, reconsider: 1 },
    study:    { go: 1, wait: 1, reconsider: 1 },
    career:   { go: 1, wait: 1, reconsider: 1 },
    relation: { go: 0, wait: 1, reconsider: 1 },
    growth:   { go: 1, wait: 1, reconsider: 1 },
    free:     { go: 1, wait: 1, reconsider: 1 }
  };

  var VERDICTS = {
    go: {
      key: 'go',
      label: '倾向于可以',
      note: '当前的象征更支持你尝试、沟通或往前推一步'
    },
    wait: {
      key: 'wait',
      label: '暂时不要急',
      note: '现在更适合观察、准备，或先把信息补齐'
    },
    reconsider: {
      key: 'reconsider',
      label: '需要重新考虑',
      note: '牌面在提醒你回头看边界、代价和被忽略的地方'
    }
  };

  var CARDS = [
    {
      id: 'fool', num: 0, roman: '0',
      nameCN: '愚人', nameEN: 'The Fool',
      symbol: '悬崖边的一步、头顶的小太阳、脚边的行囊与白花',
      upright: {
        summary: '一段还没被命名、也还没被限制的路。你拥有的更多是可能性，而不是把握。',
        keywords: ['起点', '轻装', '信任直觉', '未知']
      },
      reversed: {
        summary: '不是不能出发，而是出发前你还在反复确认门后的房间。犹豫本身开始消耗你。',
        keywords: ['莽撞', '回避准备', '高估冲动', '原地打转']
      },
      topics: {
        love: '这段关系还没被说清楚，你手上其实握着一张空白牌。',
        study: '方法还没定，但你已经不是当初那个什么都不会的人了。',
        career: '现在走的更像探路，不是定局。',
        relation: '你愿意先开口的那一方，反而更接近答案。',
        growth: '跳出去之前，先承认你怕的是什么。',
        free: '你不需要先看见整条路，才知道第一步往哪里放。'
      },
      verdict: {
        upright: { go: 3, wait: 0, reconsider: 1 },
        reversed: { go: 0, wait: 1, reconsider: 3 }
      },
      prompt: '愚人正位：未命名的起点、可能性大于把握、适合用轻装上路换取真实反馈。愚人逆位：冲动或反复推迟，先分清是想开始还是不敢开始。'
    },
    {
      id: 'magician', num: 1, roman: 'I',
      nameCN: '魔术师', nameEN: 'The Magician',
      symbol: '无限符号悬于杖首，桌上摊着权杖、圣杯、匕首与金币',
      upright: {
        summary: '你要用的东西其实都在手边，缺的只是把它们按顺序摆出来。资源是够的。',
        keywords: ['行动力', '资源就位', '专注', '把话说到位']
      },
      reversed: {
        summary: '能力还在，方向却散了。你在同时做太多件小事，于是每一件都差最后一步。',
        keywords: ['分散', '夸大于实', '话术替代行动', '自我怀疑']
      },
      topics: {
        love: '问题不在对方有没有好感，在你有没有把话说清楚。',
        study: '你不是不会，是没把知识连成一条线。',
        career: '手上的牌比你以为的多，先排序再动手。',
        relation: '主动把话说开，比维持气氛更有用。',
        growth: '别再用「我不够格」解释已经发生的事。',
        free: '答案不在更多信息里，先把已有的资源排成一个动作。'
      },
      verdict: {
        upright: { go: 3, wait: 0, reconsider: 1 },
        reversed: { go: 0, wait: 1, reconsider: 3 }
      },
      prompt: '魔术师正位：资源已经就位，关键是专注与行动、把诉求讲清楚。魔术师逆位：能量分散、承诺大于兑现，需要收窄战线。'
    },
    {
      id: 'priestess', num: 2, roman: 'II',
      nameCN: '女祭司', nameEN: 'The High Priestess',
      symbol: '两根柱子之间垂着帷幕，脚下有新月，背后是流动的水纹',
      upright: {
        summary: '答案已经出现过了，只是它藏在帷幕后面，没有被说出口。你知道的比你以为的多。',
        keywords: ['直觉', '暂不说破', '观察', '保留']
      },
      reversed: {
        summary: '你知道什么，却一直在替对方找理由解释它。该说的话被你自己咽回去了。',
        keywords: ['压抑直觉', '自我怀疑', '信息不对称', '拖延面对']
      },
      topics: {
        love: '对方的态度是有的，只是没有变成语言。',
        study: '你现在缺的不是新资料，是把直觉整理成方法。',
        career: '有人知道一些你还不知道的事，值得安静地问一次。',
        relation: '沉默本身也是一种表态，先分清你选的是哪一种。',
        growth: '你一直在替自己的感受找翻译。',
        free: '先别急着说破，你心里其实已经有一个不易承认的答案。'
      },
      verdict: {
        upright: { go: 1, wait: 3, reconsider: 1 },
        reversed: { go: 0, wait: 2, reconsider: 3 }
      },
      prompt: '女祭司正位：答案已存在于观察与直觉中，需要时间而非行动，不宜急于挑明。女祭司逆位：压抑直觉、信息不对称，需要停止自我说服。'
    },
    {
      id: 'empress', num: 3, roman: 'III',
      nameCN: '皇后', nameEN: 'The Empress',
      symbol: '石座上的金星徽记，裙摆如麦田，脚下是结着果实的枝蔓',
      upright: {
        summary: '这是一段允许你慢下来的时间。滋养、感受和被照顾，比产出更接近你现在需要的。',
        keywords: ['丰盛', '感受力', '被照顾', '让它发生']
      },
      reversed: {
        summary: '你把照顾别人做得很熟练，却把自己的那份省掉了。付出正在变成消耗。',
        keywords: ['过度付出', '忽略自己', '停滞', '关系失衡']
      },
      topics: {
        love: '被好好对待的感觉，值得你认真挑。',
        study: '别靠意志硬撑，恢复本身就是效率。',
        career: '好环境会养人，差的会慢慢吃掉你。',
        relation: '关系不是靠付出换来的。',
        growth: '先把你自己喂饱，再谈要求。',
        free: '先照顾你真实的感受，问题会从紧绷里松开一点。'
      },
      verdict: {
        upright: { go: 3, wait: 1, reconsider: 0 },
        reversed: { go: 0, wait: 1, reconsider: 3 }
      },
      prompt: '皇后正位：丰盛与滋养、允许慢下来、感受先于效率。皇后逆位：付出失衡、忽略自身需求，需要把照顾的方向调回来。'
    },
    {
      id: 'emperor', num: 4, roman: 'IV',
      nameCN: '皇帝', nameEN: 'The Emperor',
      symbol: '方正的石座，头顶公羊角，正面是严整的甲胄与权杖',
      upright: {
        summary: '现在需要的是结构和边界。把范围划清楚，反而比再多一个选项更让人安心。',
        keywords: ['秩序', '边界', '承担', '定规则']
      },
      reversed: {
        summary: '你想立规矩，但用的是强硬而不是清楚。控制感很强，可执行的部分很少。',
        keywords: ['僵化', '控制', '硬撑', '缺少弹性']
      },
      topics: {
        love: '把期待说成规则，关系就变成了考核。',
        study: '定计划不如定每天的最小量。',
        career: '需要的是清晰的所有权，不是更大的野心。',
        relation: '你可以说不，但要说清理由。',
        growth: '自律和苛刻之间，只差一句解释。',
        free: '把边界和优先级写清楚，模糊会自己变小。'
      },
      verdict: {
        upright: { go: 2, wait: 2, reconsider: 2 },
        reversed: { go: 0, wait: 1, reconsider: 3 }
      },
      prompt: '皇帝正位：结构、边界与承担，用清晰规则换取稳定。皇帝逆位：僵化与控制感，硬约束缺少弹性，需要区分明确与强硬。'
    },
    {
      id: 'hierophant', num: 5, roman: 'V',
      nameCN: '教皇', nameEN: 'The Hierophant',
      symbol: '三重冠冕下，两枚交叠的钥匙落在两柱之间',
      upright: {
        summary: '有人走过这条路，他的经验对你有用。规矩里通常藏着省下来的时间。',
        keywords: ['指引', '传统', '请教', '现成的方法']
      },
      reversed: {
        summary: '你在照着一套其实不属于自己的标准活。合适的形式，需要自己重新写。',
        keywords: ['质疑既有标准', '形式主义', '想脱离', '换一套规则']
      },
      topics: {
        love: '关系里的期待，有一半是别人替你定的。',
        study: '模板能用，但别让它替你思考。',
        career: '找个真正做过的人聊一次，胜过读十篇攻略。',
        relation: '你不必用别人的相处标准衡量这段关系。',
        growth: '继承和盲从之间，隔着一道你要自己做的判断。',
        free: '别人的经验可以借，但最后仍要回到你自己的判断。'
      },
      verdict: {
        upright: { go: 2, wait: 3, reconsider: 1 },
        reversed: { go: 1, wait: 1, reconsider: 3 }
      },
      prompt: '教皇正位：可借用的成熟经验与现成方法，节省试错。教皇逆位：对既有标准产生怀疑，需要区分继承与盲从。'
    },
    {
      id: 'lovers', num: 6, roman: 'VI',
      nameCN: '恋人', nameEN: 'The Lovers',
      symbol: '两人立于伊甸园中，上方太阳高悬，身后是结着果实的树',
      upright: {
        summary: '真正的分岔不在选哪个，而在你想成为什么样的人。这个决定比选择本身重要。',
        keywords: ['选择', '价值观', '联结', '坦白']
      },
      reversed: {
        summary: '你在权衡两个都还不错的选项，忘了问问自己真正想要什么。摇摆不等于慎重。',
        keywords: ['摇摆', '回避表态', '外部标准', '失衡']
      },
      topics: {
        love: '关系正把你推向一个需要选择的岔口。',
        study: '别只是因为别人都学这个，你也跟着。',
        career: '与其比较机会，不如确认你要成为哪类人。',
        relation: '你更在意的是他，还是被喜欢的感觉。',
        growth: '诚实回答「我真正要的是什么」。',
        free: '这不是选项题，而是你想用哪种价值做决定。'
      },
      verdict: {
        upright: { go: 3, wait: 0, reconsider: 1 },
        reversed: { go: 0, wait: 2, reconsider: 3 }
      },
      prompt: '恋人正位：以价值观为核心的明确选择，需要坦白与承担后果。恋人逆位：摇摆回避表态，被外部标准牵引，需要回到自身偏好。'
    },
    {
      id: 'chariot', num: 7, roman: 'VII',
      nameCN: '战车', nameEN: 'The Chariot',
      symbol: '缀满星辰的华盖下，两匹斯芬克斯背向而立，车前是失落的城垣',
      upright: {
        summary: '前进靠的是把相反的力量一起用上，而不是先消灭其中一边。你能驾驭它。',
        keywords: ['推进', '掌控', '意志', '两面兼用']
      },
      reversed: {
        summary: '方向和油门正在互相打架。你在用力，但没有用在同一个点上。',
        keywords: ['失控', '方向不清', '硬撑', '内耗']
      },
      topics: {
        love: '别把矛盾当成必须消灭的敌人。',
        study: '保持节奏比突然冲刺更有效。',
        career: '你已经具备条件，缺的是不松手。',
        relation: '两边的立场都需要被承认。',
        growth: '你不需要二选一，你需要排顺序。',
        free: '方向一旦统一，眼前的阻力会变成可驾驭的部分。'
      },
      verdict: {
        upright: { go: 3, wait: 0, reconsider: 1 },
        reversed: { go: 0, wait: 1, reconsider: 3 }
      },
      prompt: '战车正位：以意志驾驭相反的力量，方向统一即可推进。战车逆位：方向与动力互相拉扯，出现内耗，需要先确定优先项。'
    },
    {
      id: 'strength', num: 8, roman: 'VIII',
      nameCN: '力量', nameEN: 'Strength',
      symbol: '女子轻抚狮子的额头，空中悬着花与无限符号',
      upright: {
        summary: '真正难的不是压住它，是和它共处。耐心和温柔在这里比用力更有效。',
        keywords: ['柔韧', '耐心', '安抚', '与自己和解']
      },
      reversed: {
        summary: '你正在和自己较劲，把力气全用在了对抗上，被消耗的其实是自己。',
        keywords: ['自我消耗', '硬压', '不信自己', '疲惫']
      },
      topics: {
        love: '先安抚自己，再去谈关系。',
        study: '跟自己的节奏谈判，而不是跟它硬碰。',
        career: '与难缠的人打交道，软比硬有效。',
        relation: '你在替所有人维持情绪，包括你自己的。',
        growth: '你不需要变得更狠，才配得到想要的。',
        free: '不必更强硬，先停止用对抗的方式对待自己。'
      },
      verdict: {
        upright: { go: 2, wait: 2, reconsider: 1 },
        reversed: { go: 0, wait: 1, reconsider: 3 }
      },
      prompt: '力量正位：以柔韧和耐心共处张力，温和比强硬有效。力量逆位：自我消耗式的硬撑，需要停止与自己的对抗。'
    },
    {
      id: 'hermit', num: 9, roman: 'IX',
      nameCN: '隐士', nameEN: 'The Hermit',
      symbol: '斗篷下的老人提着一盏藏六芒星的灯，杖立于雪峰之上',
      upright: {
        summary: '需要的是关掉外界的音量，而不是加大自己的。答案要自己提出来。',
        keywords: ['独处', '内省', '自寻答案', '拉开距离']
      },
      reversed: {
        summary: '独处开始变成躲避。你在保护一个其实已经不存在的风险。',
        keywords: ['孤立', '拒人千里', '钻牛角尖', '该求助']
      },
      topics: {
        love: '先弄清楚自己要什么，再谈对方。',
        study: '沉下去补基础，比横向扩张更值。',
        career: '现在不是抢位子的时候。',
        relation: '你需要的是距离，不是消失。',
        growth: '找到属于自己的那一束光。',
        free: '暂时离开人群的噪音，你会听见更准确的那句话。'
      },
      verdict: {
        upright: { go: 0, wait: 3, reconsider: 2 },
        reversed: { go: 1, wait: 0, reconsider: 3 }
      },
      prompt: '隐士正位：以独处换取清醒，需要向内寻找答案并拉开外部噪音。隐士逆位：独处退化为躲避，过度孤立，需要重新接触他人。'
    },
    {
      id: 'wheel', num: 10, roman: 'X',
      nameCN: '命运之轮', nameEN: 'Wheel of Fortune',
      symbol: '三重轮盘悬于云间，外圈嵌着古字母与四只生物的标记',
      upright: {
        summary: '这一段不由你决定。变化正在发生，你能做的是趁窗口还开着的时候站稳。',
        keywords: ['转机', '周期', '顺势', '时机']
      },
      reversed: {
        summary: '你抓着的是一个已经转过去的轮子。运气不来的时候，你只能调整姿势。',
        keywords: ['低潮', '时机未到', '抗拒变化', '错位']
      },
      topics: {
        love: '这不是你用力就能推进的关系。',
        study: '现在不是冲刺窗口，是打底窗口。',
        career: '风向会变，先保证自己不脱水。',
        relation: '有人来有人走，先留好你的位置。',
        growth: '接受这段时间你做不了太多。',
        free: '有些变化不由你控制，先把力气留给可以调整的部分。'
      },
      verdict: {
        upright: { go: 2, wait: 2, reconsider: 1 },
        reversed: { go: 0, wait: 3, reconsider: 2 }
      },
      prompt: '命运之轮正位：外来的转机与周期性变化，宜顺势并把握窗口。命运之轮逆位：时机不在此处，逆势用力收效甚微，宜调整姿态等待。'
    },
    {
      id: 'justice', num: 11, roman: 'XI',
      nameCN: '正义', nameEN: 'Justice',
      symbol: '端坐的天平与竖立的剑，头顶是小小的圆冠',
      upright: {
        summary: '把事实摆出来再判断。因果是清楚的，你真正在躲的是那个清楚之后的动作。',
        keywords: ['权衡', '因果', '客观', '承担后果']
      },
      reversed: {
        summary: '标准在你手里被挪动过。你不是不知道答案，是不想承担那个答案带来的结果。',
        keywords: ['双重标准', '回避责任', '偏心', '不甘心']
      },
      topics: {
        love: '你们之间的账，你自己最清楚。',
        study: '别用「我尽力了」代替「我完成了」。',
        career: '功过要分开看，评价不公就别急着认。',
        relation: '谁在替你承担后果，这件事要摊开。',
        growth: '对自己和对别人用同一把尺子。',
        free: '把事实和期待分开，答案会比情绪更早出现。'
      },
      verdict: {
        upright: { go: 1, wait: 3, reconsider: 2 },
        reversed: { go: 0, wait: 1, reconsider: 3 }
      },
      prompt: '正义正位：以事实和因果做权衡，需要承担选择的后果。正义逆位：标准偏移、回避责任，需要恢复一致的衡量方式。'
    },
    {
      id: 'hangedman', num: 12, roman: 'XII',
      nameCN: '倒吊人', nameEN: 'The Hanged Man',
      symbol: '倒悬于 T 形架上，头顶泛着金光，脚边是一株鲜活的枝叶',
      upright: {
        summary: '停在这里不是失败，是主动换一个角度。暂时不动的这段时间，会给你新的看法。',
        keywords: ['换位', '暂停', '放下', '看见反面']
      },
      reversed: {
        summary: '你名义上在暂停，其实一直在等一个不会来的结果。卡住比你自己承认的更久。',
        keywords: ['无效牺牲', '拖延', '不肯放手', '白白消耗']
      },
      topics: {
        love: '倒过来看，这段关系要求的是先安顿自己。',
        study: '换一种学法，比再熬一小时有用。',
        career: '停一停不是退，是重新对准。',
        relation: '你在一个已经无效的位置上坚持。',
        growth: '放手的那一刻，才看得见新的路。',
        free: '换个位置看，你一直以为的卡住可能是主动的停顿。'
      },
      verdict: {
        upright: { go: 0, wait: 3, reconsider: 1 },
        reversed: { go: 0, wait: 1, reconsider: 3 }
      },
      prompt: '倒吊人正位：主动的暂停与视角转换，牺牲局部换取整体视角。倒吊人逆位：无效的坚持与拖延，停在一个不会改变的位置上。'
    },
    {
      id: 'death', num: 13, roman: 'XIII',
      nameCN: '死神', nameEN: 'Death',
      symbol: '执镰者驱马而过，白玫瑰在车轮下，前方是缓缓降下的门',
      upright: {
        summary: '有一个阶段确实结束了。放下的过程会难受，但腾出来的位置只有清空之后才存在。',
        keywords: ['结束', '转化', '清空', '不可逆']
      },
      reversed: {
        summary: '明知道该结束，你还在维持一个已经完成的形态。拖得越久，损失越大。',
        keywords: ['拖泥带水', '拒绝结束', '反复回头', '损耗']
      },
      topics: {
        love: '这段关系的形态已经结束了，不等于感情全部作废。',
        study: '死磕一门不再适合你的课，是纯粹的时间损耗。',
        career: '不体面地离开，也好过体面地被落下。',
        relation: '有一方一直在替这段关系续命。',
        growth: '结束本身就是转化的前提。',
        free: '有些东西已经结束，承认它反而让下一步变得清楚。'
      },
      verdict: {
        upright: { go: 2, wait: 0, reconsider: 2 },
        reversed: { go: 0, wait: 1, reconsider: 3 }
      },
      prompt: '死神正位：阶段性的结束与转化，清空之后才有新的空间。死神逆位：拒绝承认结束导致的拖延损耗，需要尽早做决定。'
    },
    {
      id: 'temperance', num: 14, roman: 'XIV',
      nameCN: '节制', nameEN: 'Temperance',
      symbol: '天使一足踏水一足踏地，两只圣杯之间有水流缓缓注入',
      upright: {
        summary: '不用做大决定。找到一个能长期执行的中间值，让它跑起来，比一次到位更现实。',
        keywords: ['调和', '适度', '持续', '找到中间值']
      },
      reversed: {
        summary: '你在两个极端之间来回，或者配比出了问题。失衡通常先表现在情绪上。',
        keywords: ['失衡', '极端化', '急功近利', '难以持续']
      },
      topics: {
        love: '关系需要的是节奏，不是强度。',
        study: '每天两小时的高质量，胜过周末的十小时。',
        career: '找一个你三个月后还愿意做的配比。',
        relation: '你给每个人的时间比例需要调整。',
        growth: '别指望一次性把习惯改掉。',
        free: '不用一步到位，先找到你能持续走下去的比例。'
      },
      verdict: {
        upright: { go: 2, wait: 2, reconsider: 0 },
        reversed: { go: 0, wait: 1, reconsider: 3 }
      },
      prompt: '节制正位：调和与适度，用可持续的中间值代替极端方案。节制逆位：配比失衡、方案难以持续，需要找回稳定节奏。'
    },
    {
      id: 'devil', num: 15, roman: 'XV',
      nameCN: '恶魔', nameEN: 'The Devil',
      symbol: '倒悬的五芒星下，两人颈上套着松开的锁链，脚下压着荆棘',
      upright: {
        summary: '真正困住你的锁链是松的。你知道怎么走，只是这个「知道」目前不太值钱。',
        keywords: ['依赖', '欲望', '束缚', '看清锁链']
      },
      reversed: {
        summary: '你正在解开它，只是动作很慢、也会痛。松绑不是一次完成的，是一点点松的。',
        keywords: ['松动', '戒断', '看清代价', '缓慢脱身']
      },
      topics: {
        love: '你舍不得的可能不是这个人，是这段投入本身。',
        study: '刷手机带来的即时反馈，正在吃掉你真正想要的。',
        career: '你在为一笔早就不划算的付出加注。',
        relation: '有段关系是靠你不舍得不正常。',
        growth: '锁链是松的，你只是还没松手。',
        free: '看清你舍不得的究竟是什么，锁链才会开始松开。'
      },
      verdict: {
        upright: { go: 0, wait: 1, reconsider: 3 },
        reversed: { go: 2, wait: 1, reconsider: 1 }
      },
      prompt: '恶魔正位：看得见的束缚与依赖，锁链其实是松的，问题在于不愿松手。恶魔逆位：束缚正在松动，脱离需要时间与疼痛，但方向是松开的。'
    },
    {
      id: 'tower', num: 16, roman: 'XVI',
      nameCN: '高塔', nameEN: 'The Tower',
      symbol: '塔顶被闪电劈开，两枚人偶坠落，脚下是错落的方块',
      upright: {
        summary: '某个你搭了很久的结构被击穿了。难受是真的，但塌掉的通常是本来就不稳的部分。',
        keywords: ['突变', '瓦解', '真相', '重建']
      },
      reversed: {
        summary: '你已经在避开那个引爆点，明知会塌，先一步的自我修整可以减少损失。',
        keywords: ['勉强维持', '压抑消息', '局部松动', '提前应对']
      },
      topics: {
        love: '需要一次摊开说清的谈话，拖着只会更难看。',
        study: '一次考砸暴露的是方法问题，不是天赋问题。',
        career: '硬撑的结构会塌，早点调整损失最小。',
        relation: '有件事大家都在假装没看见。',
        growth: '痛苦来自拆掉错误的部分，不是来自你不够好。',
        free: '不再维持原来的样子，未必是坏事，可能是必要的腾空。'
      },
      verdict: {
        upright: { go: 0, wait: 0, reconsider: 3 },
        reversed: { go: 1, wait: 1, reconsider: 3 }
      },
      prompt: '高塔正位：外力打破既有结构，突变带来真相与重建的起点。高塔逆位：在崩塌前被察觉与局部松动，需要主动修整而非硬撑。'
    },
    {
      id: 'star', num: 17, roman: 'XVII',
      nameCN: '星星', nameEN: 'The Star',
      symbol: '八芒星高悬，一膝跪地的人将水倒入河与池，水面泛起小鸟',
      upright: {
        summary: '在修复期里，安静地给自己补充，比急着证明什么更有用。你正在回到正轨。',
        keywords: ['修复', '希望', '坦诚', '缓慢恢复']
      },
      reversed: {
        summary: '你暂时看不到方向，于是把希望寄托在某个结果上。信可以留，力气要先放回自己身上。',
        keywords: ['信心动摇', '依赖外力', '硬撑乐观', '方向模糊']
      },
      topics: {
        love: '这段关系现在适合修，不适合判。',
        study: '基础补回来，成绩是后面的事。',
        career: '先做能让自己睡着安稳的事。',
        relation: '真诚比得体更容易被接受。',
        growth: '把注意力收回到自己身上。',
        free: '先恢复，再回答；你不需要在疲惫里逼出结论。'
      },
      verdict: {
        upright: { go: 2, wait: 2, reconsider: 0 },
        reversed: { go: 0, wait: 2, reconsider: 2 }
      },
      prompt: '星星正位：修复期与坦诚的希望，在安静中恢复内在秩序。星星逆位：信心受挫、方向模糊，需要把注意力收回自身而非外求。'
    },
    {
      id: 'moon', num: 18, roman: 'XVIII',
      nameCN: '月亮', nameEN: 'The Moon',
      symbol: '月轮与双塔之间，狗与狼抬头张望，脚下是蜿蜒的路与两只螯虾',
      upright: {
        summary: '现在看不清楚，而且这是正常的。不确定时不要下结论，走慢一点。',
        keywords: ['迷雾', '不安', '潜意识', '看不清']
      },
      reversed: {
        summary: '迷雾正在散，但被放大的恐惧还在。你会重新拿回判断，只是需要再等一小段。',
        keywords: ['渐明', '误会松动', '焦虑残留', '恢复判断']
      },
      topics: {
        love: '你看到的冷淡，可能是你自己的想象。',
        study: '别用最坏的一次模拟定义结果。',
        career: '信息不全的时候，决策成本最高的动作是先不动。',
        relation: '有猜测在替事实说话。',
        growth: '区分直觉的提醒和恐惧的编造。',
        free: '看不清的时候，慢一点比急着判断更接近真实。'
      },
      verdict: {
        upright: { go: 0, wait: 3, reconsider: 1 },
        reversed: { go: 1, wait: 2, reconsider: 1 }
      },
      prompt: '月亮正位：信息不足导致的迷雾与放大化的焦虑，不确定期不宜下结论。月亮逆位：迷雾逐渐散去，认知恢复中，残留焦虑需要时间平复。'
    },
    {
      id: 'sun', num: 19, roman: 'XIX',
      nameCN: '太阳', nameEN: 'The Sun',
      symbol: '辉煌的日轮悬于围墙之上，下方是向日葵与一匹白牝马',
      upright: {
        summary: '现在是最顺的一段。你做的努力和得到的回应对得上，适合往前走一步。',
        keywords: ['明朗', '顺利', '被看见', '确认']
      },
      reversed: {
        summary: '好事有，只是你自己把它压低了。别用内部的阴影否定外部的进展。',
        keywords: ['乐观不足', '低估自己', '延迟满足', '阴翳未散']
      },
      topics: {
        love: '回应是真实的，别再替对方找退路。',
        study: '方法对了，现在需要的是重复。',
        career: '这是可以主动争取的时间窗。',
        relation: '你愿意承认「我挺好的」，关系就松动了。',
        growth: '好事也值得被认真记下来。',
        free: '已经有回应和亮处，允许自己承认事情正在变好。'
      },
      verdict: {
        upright: { go: 3, wait: 0, reconsider: 0 },
        reversed: { go: 2, wait: 1, reconsider: 1 }
      },
      prompt: '太阳正位：明朗顺利、付出得到回应，适合明确推进。太阳逆位：外部向好而内部低估，需要停止自我否定。'
    },
    {
      id: 'judgement', num: 20, roman: 'XX',
      nameCN: '审判', nameEN: 'Judgement',
      symbol: '天使自云中吹响号角，下方是自水中起身的人形',
      upright: {
        summary: '是一个可以回头清算的时刻。把旧账翻出来看清楚，然后决定还要不要继续。',
        keywords: ['复盘', '召唤', '清算', '重新选择']
      },
      reversed: {
        summary: '你听见了，但没有回头。反复回想同样的事，其实已经是一种回答了。',
        keywords: ['回避清算', '反刍', '听不见召唤', '自我怀疑']
      },
      topics: {
        love: '把之前没说清楚的拿出来说一次。',
        study: '看看自己这一年真正学会了什么。',
        career: '回看哪一步让你走得最快。',
        relation: '该道歉的那次，现在还来得及。',
        growth: '给过去的自己一个交代。',
        free: '回头看清这段经历，然后重新决定你要带着什么往前走。'
      },
      verdict: {
        upright: { go: 2, wait: 2, reconsider: 1 },
        reversed: { go: 0, wait: 2, reconsider: 2 }
      },
      prompt: '审判正位：复盘与清算，可据此重新做出选择。审判逆位：回避清算与反复反刍，需要停止无回应的内耗。'
    },
    {
      id: 'world', num: 21, roman: 'XXI',
      nameCN: '世界', nameEN: 'The World',
      symbol: '月桂花环中，一个人舞动四肢，四角各有一枚徽记',
      upright: {
        summary: '一个周期闭合了。你完成的东西比你以为的更完整，接下来可以看更远处。',
        keywords: ['完成', '整合', '远方', '阶段落幕']
      },
      reversed: {
        summary: '就差最后一步，而你反复把它往后推。收尾比开始更消耗人，但它是必要的。',
        keywords: ['难以收尾', '差最后一步', '未整合', '拖延结束']
      },
      topics: {
        love: '这一段可以先好好收尾，再谈下一段。',
        study: '离目标只差收尾，别在这里停下。',
        career: '完成一个项目，比开始十个更有用。',
        relation: '有些关系值得一个正式的结束。',
        growth: '你已经走完的路，值得认领。',
        free: '这一段落可以收尾了，完成本身就是答案的一部分。'
      },
      verdict: {
        upright: { go: 3, wait: 0, reconsider: 0 },
        reversed: { go: 0, wait: 1, reconsider: 3 }
      },
      prompt: '世界正位：周期完成与自我整合，可以看向更大的图景。世界逆位：难以收尾、完成度停在最后一步，需要收尾而非另起炉灶。'
    }
  ];

  /* 按 id 索引 */
  var BY_ID = {};
  for (var i = 0; i < CARDS.length; i++) {
    BY_ID[CARDS[i].id] = CARDS[i];
  }

  MO.cards = {
    list: CARDS,
    byId: function (id) { return BY_ID[id] || null; },
    topics: TOPICS,
    topicById: function (id) {
      for (var j = 0; j < TOPICS.length; j++) {
        if (TOPICS[j].id === id) return TOPICS[j];
      }
      return null;
    },
    topicExamples: TOPIC_EXAMPLES,
    topicBias: TOPIC_BIAS,
    verdicts: VERDICTS,
    count: CARDS.length
  };

})(window);
