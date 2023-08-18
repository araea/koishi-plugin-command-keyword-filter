import { Context, Schema, capitalize } from 'koishi'

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
  isMentioned: boolean
}

export const Config: Schema<Config> = Schema.object({
  keywords: Schema.array(String).role('table').description('过滤关键词，支持多个关键词，请点击右边的 `添加行` 按钮添加'),
  action: Schema.union(['仅封印无提示', '仅提示', '既封印又提示']).default('既封印又提示').description('触发关键词后做的动作'),
  timeLimit: Schema.number().default(60).description('触发关键词后屏蔽的时间（秒）'),
  triggerMessage: Schema.string().role('textarea', { rows: [1, 4] }).default('你一点都不可爱喵~ 从现在开始我要讨厌你一会儿啦~ 略略略~').description('触发关键词后的提示信息'),
  bannedMessage: Schema.string().role('textarea', { rows: [1, 4] }).default('哼~ 我还在生气呢~ 叫你惹我生气！凶你喵~！《剩余时间》 秒后再来找我玩吧~').description('被屏蔽后的提示信息（文本中的《剩余时间》将会被替换成实际剩余时间的秒数）'),
  reminderMessage: Schema.string().role('textarea', { rows: [1, 4] }).default('我警告你喵~ 别再惹我生气啦~ 否则的话，我会生气的！（拿起小拳头对你挥了挥喵~）').description('触发关键词的提示信息（仅提示不屏蔽）'),
  isMentioned: Schema.boolean().default(false).description('适用于用户无指令直接提及或引用机器人触发机器人响应的情况。例如：davinci-003、rr-su-chat')
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
    isMentioned,
  } = config;

  // ctx.command('t').action(async ({ session }) => {
  //   await session.send('6');
  // });

  if (isMentioned) {
    ctx.middleware(async (session, next) => {
      if (session.parsed?.appel || session.quote?.userId === session.bot.selfId) {
        // 调用 checkArgs 函数，判断 args 是否包含 keywords
        const result = checkArgs(session.content.split(' '), keywords);
        // 获取当前时间戳，单位为毫秒
        const now = Date.now();
  
        // 如果容器中已经有了 session.userId 的记录
        if (container.has(session.userId)) {
          // 获取之前存储的时间戳
          const prev = container.get(session.userId);
          // 计算时间差值，单位为秒
          const diff = (now - prev) / 1000;
  
          // 如果时间差值小于 timeLimit
          if (diff < timeLimit) {
            if (action === '仅封印无提示') {
              return '';
            }
            await session.send(bannedMessage.replace('《剩余时间》', `${Math.floor(timeLimit - diff)}`));
            return;
          } else {
            // 如果时间差值大于 timeLimit，则从容器中删除该用户的记录
            container.delete(session.userId);
          }
        }
  
        // 如果结果为 true
        if (result) {
          if (action === '仅提示') {
            await session.send(reminderMessage);
            return;
          }
  
          container.set(session.userId, now);
  
          await session.send(triggerMessage);
          return;
        }
      }
      return next();
    }, true /* true 表示这是前置中间件 */)
  }

  // ctx.on('message', async (session) => {
 
  // });


  // 监听 command/before-execute 事件
  ctx.on('command/before-execute', async (argv) => {
    if (isMentioned) {
      if (argv.session.parsed?.appel || argv.session.quote?.userId === argv.session.bot.selfId) {
        return ''
      }
    }

    // 调用 checkArgs 函数，判断 args 是否包含 keywords
    const result = checkArgs(argv.args, keywords);
    // 获取当前时间戳，单位为毫秒
    const now = Date.now();

    // 如果容器中已经有了 session.userId 的记录
    if (container.has(argv.session.userId)) {
      // 获取之前存储的时间戳
      const prev = container.get(argv.session.userId);
      // 计算时间差值，单位为秒
      const diff = (now - prev) / 1000;

      // 如果时间差值小于 timeLimit
      if (diff < timeLimit) {
        if (action === '仅封印无提示') {
          return '';
        }
        return bannedMessage.replace('《剩余时间》', `${Math.floor(timeLimit - diff)}`);
      } else {
        // 如果时间差值大于 timeLimit，则从容器中删除该用户的记录
        container.delete(argv.session.userId);
      }
    }

    // 如果结果为 true
    if (result) {
      if (action === '仅提示') {
        return reminderMessage;
      }

      container.set(argv.session.userId, now);

      return triggerMessage;
    }
  });
}

function checkArgs(args: string[], keywords: string[]): boolean {
  return args.some((arg) => typeof arg === 'string' && keywords.some((keyword) => arg.includes(keyword)));
}
