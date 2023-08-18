import { Context, Schema } from 'koishi'

export const name = 'command-keyword-filter'
export const usage = `## ⚠️ 注意事项

- 本插件只能过滤用户输入的命令参数（args）。
- 本插件只能过滤文本类型的参数。`

export interface Config {
  keywords: string[]; // 关键词
  action: any; // 触发关键词后做的动作
  timeLimit: number; // 触发时间限制（秒）
  triggerMessage: string; // 触发关键词后的提示信息
  bannedMessage: string; // 被屏蔽后的提示信息
  reminderMessage: string; // 触发关键词的提示信息（仅提示不屏蔽）
}

export const Config: Schema<Config> = Schema.object({
  keywords: Schema.array(String).role('table').description('过滤关键词'),
  action: Schema.union(['仅封印无提示', '仅提示', '既封印又提示']).default('既封印又提示').description('触发关键词后做的动作'),
  timeLimit: Schema.number().default(60).description('触发关键词后屏蔽的时间（秒）'),
  triggerMessage: Schema.string().role('textarea', { rows: [1, 4] }).default('你一点都不可爱喵~ 从现在开始我要讨厌你一会儿啦~ 略略略~').description('触发关键词后的提示信息'),
  bannedMessage: Schema.string().role('textarea', { rows: [1, 4] }).default('哼~ 我还在生气呢~ 叫你惹我生气！凶你喵~！《剩余时间》 秒后再来找我玩吧~').description('被屏蔽后的提示信息（文本中的《剩余时间》将会被替换成实际剩余时间的秒数）'),
  reminderMessage: Schema.string().role('textarea', { rows: [1, 4] }).default('我警告你喵~ 别再惹我生气啦~ 否则的话，我会生气的！（拿起小拳头对你挥了挥喵~）').description('触发关键词的提示信息（仅提示不屏蔽）'),
})

// 定义一个 Map 类型的容器，用来存储 session.userId 和触发的时间
const container = new Map<string, number>();

export function apply(ctx: Context, config: Config) {
  const {
    keywords,
    action,
    timeLimit,
    triggerMessage,
    bannedMessage,
    reminderMessage,
  } = config;

  // ctx.command('t').action(async ({ session }) => {
  //   await session.send('6');
  // });

  // 监听 command/before-execute 事件
  ctx.on('command/before-execute', async (argv) => {
    // 调用 checkArgs 函数，判断 args 是否包含 keywords
    const result = checkArgs(argv.args, keywords);
    // 获取当前时间戳，单位为毫秒
    const now = Date.now();

    // 如果容器中已经有了 session.userId 的记录
    if (container.has(argv.session.userId)) {
      // 获取之前存储的时间戳
      const prev = container.get(argv.session.userId);
      // 计算时间差值，单位为秒
      const diff = calculateTimeDifference(now, prev);

      // 如果时间差值小于 time
      if (diff < timeLimit) {
        if (action === '仅封印无提示') {
          return '';
        }
        return bannedMessage.replace('《剩余时间》', `${Math.floor(timeLimit - diff)}`);
      }
    }

    // 如果结果为 true
    if (result) {
      if (action === '仅提示') {
        return reminderMessage;
      }

      // 如果容器中没有 session.userId 的记录，或者时间差值大于等于 time
      // 将 session.userId 和当前时间戳存入容器中
      container.set(argv.session.userId, now);

      // if (action === '仅封印无提示') {
      //   return '';
      // }

      return triggerMessage;
    }
  });

  // 定义一个函数，用来检查 args 是否包含 keywords
  function checkArgs(args: any[], keywords: string[]): boolean {
    // 使用 some 方法，检查 args 数组是否有至少一个元素满足条件
    return args.some((arg) => {
      // 使用 some 方法，检查 keywords 数组是否有至少一个元素包含在 arg 中
      return keywords.some((keyword) => {
        // 判断 arg 是否是字符串类型
        if (typeof arg === 'string') {
          // 使用 includes 方法，检查 arg 是否包含 keyword
          return arg.includes(keyword);
        } else {
          // 如果不是字符串类型，可以转换为字符串或者直接返回 false
          // return String(arg).includes(keyword); // 转换为字符串
          return false; // 直接返回 false
        }
      });
    });
  }




  // 定义一个函数，用来计算时间差值（单位：秒）
  function calculateTimeDifference(current: number, previous: number): number {
    return Math.floor((current - previous) / 1000);
  }
}