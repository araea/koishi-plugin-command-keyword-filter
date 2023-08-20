import { Context, Schema, capitalize } from 'koishi'

export const name = 'command-keyword-filter'
export const usage = `
## 📝 命令

- \`你不乖哦 <arg:user> [customTimeLimit:number]\`：手动屏蔽不乖的小朋友（默认未设置权限等级，需要自己设置哦~）。
  - \`arg\`：必选参数，@某个成员。
  - \`customTimeLimit\`：可选参数，单位是秒。若未输入该参数，默认为配置项中 timeLimit 的值。`

export interface Config {
  keywords: string[]; // 关键词
  action: any; // 触发关键词后做的动作
  timeLimit: number; // 触发关键词后屏蔽的时间（秒）
  triggerMessage: string; // 触发关键词后的提示信息
  bannedMessage: string; // 被屏蔽后的提示信息
  reminderMessage: string; // 触发关键词的提示信息（仅提示不屏蔽）
  naughtyMemberMessage: string; // 手动屏蔽不乖的成员的提示信息
  isMentioned: boolean
}

export const Config: Schema<Config> = Schema.object({
  isMentioned: Schema.boolean().default(false).description('适用于用户无指令直接提及或引用机器人触发机器人响应的情况。例如：davinci-003、rr-su-chat'),
  keywords: Schema.array(String).role('table').description('过滤关键词，支持多个关键词，请点击右边的 `添加行` 按钮添加'),
  action: Schema.union(['仅封印无提示', '仅提示', '既封印又提示']).default('既封印又提示').description('触发关键词后做的动作'),
  timeLimit: Schema.number().default(60).description('触发关键词后屏蔽的时间（秒）'),
  triggerMessage: Schema.string().role('textarea', { rows: [1, 4] }).default('你一点都不可爱喵~ 从现在开始我要讨厌你一会儿啦~ 略略略~').description('触发关键词后的提示信息'),
  bannedMessage: Schema.string().role('textarea', { rows: [1, 4] }).default('哼~ 我还在生气呢~ 叫你惹我生气！凶你喵~！《剩余时间》 秒后再来找我玩吧~').description('被屏蔽后的提示信息（文本中的《剩余时间》将会被替换成实际剩余时间的秒数）'),
  reminderMessage: Schema.string().role('textarea', { rows: [1, 4] }).default('我警告你喵~ 别再惹我生气啦~ 否则的话，我会生气的！（拿起小拳头对你挥了挥喵~）').description('触发关键词的提示信息（仅提示不屏蔽）'),
  naughtyMemberMessage: Schema.string().role('textarea', { rows: [1, 4] }).default('我才不要和不乖的小朋友玩呢~ 哼哼喵~（叉腰）我要讨厌你一会儿啦~ 啦啦啦~').description('手动屏蔽不乖的成员的提示信息'),
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
    naughtyMemberMessage,
    isMentioned,
  } = config;

  // ctx.command('t').action(async ({ session }) => {
  //   await session.send('6');
  // });

  // 如果收到“天王盖地虎”，就回应“宝塔镇河妖”
  // ctx.middleware((session, next) => {
  //   console.log(session.content)
  //   if (session.content.includes('天王盖地虎')) {
  //     return '宝塔镇河妖'
  //   } else {
  //     // 如果去掉这一行，那么不满足上述条件的消息就不会进入下一个中间件了
  //     return next()
  //   }
  // })

  ctx.command("你不乖哦 <arg:user> [customTimeLimit:number]", "手动屏蔽不乖的小朋友")
    .action(async ({ session }, user, customTimeLimit: number = 0) => {
      if (!user) {
        return;
      }
      ctx.user
      const userId = user.split(":")[1];
      // 获取当前时间戳，单位为毫秒
      const now = Date.now();
      if (customTimeLimit <= 0) {
        container.set(userId, now);
      }
      if (customTimeLimit) {
        // 在这里处理手动屏蔽用户自定义的时长
        container.set(userId, now + customTimeLimit * 1000 - timeLimit * 1000); // 将用户自定义的时长转换为毫秒并设置到容器中
      }
      await session.send(naughtyMemberMessage)
    });


  ctx.middleware(async (session, next) => {
    if (!isMentioned) {
      return next()
    }
    if (session.parsed?.appel || session.quote?.userId === capitalize(session.bot.selfId) || containsAtIdString(session.content, session.bot.selfId, session.bot.username)) {
      // if (session.parsed?.appel || session.quote?.userId === session.bot.selfId || containsAtIdString(session.content, session.bot.selfId)) {
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
          return bannedMessage.replace('《剩余时间》', `${Math.floor(timeLimit - diff)}`);
        } else {
          // 如果时间差值大于 timeLimit，则从容器中删除该用户的记录
          container.delete(session.userId);
        }
      }
      // 如果结果为 true
      if (result) {
        if (action === '仅提示') {
          return reminderMessage;
        }

        container.set(session.userId, now);

        return triggerMessage;
        ;
      }
    }
    return next();
  }, true /* true 表示这是前置中间件 */)


  // ctx.on('message', async (session) => {

  // });

  // 监听 command/before-execute 事件
  ctx.on('command/before-execute', async (argv) => {
    if (isMentioned) {
      if (argv.session.parsed?.appel || argv.session.quote?.userId === capitalize(argv.session.bot.selfId) || containsAtIdString(argv.session.content, argv.session.bot.selfId, argv.session.bot.username)) {
        return
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

const containsAtIdString = (input: string, selfId: string, selfName: string): boolean => {
  const regex = new RegExp(`<at id="${selfId}" name="${selfName}"/>|<at id="${selfId}"/>`);
  return regex.test(input);
}
