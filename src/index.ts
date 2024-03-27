import {Context, Schema, capitalize} from 'koishi'

export const name = 'command-keyword-filter'
export const usage = `
## 📝 命令

- \`commandKeywordFilter.你不乖哦 <arg:user> [customTimeLimit:number]\`：手动屏蔽不乖的小朋友（默认未设置权限等级，需要自己设置哦~）。
  - \`arg\`：必选参数，@某个成员。
  - \`customTimeLimit\`：可选参数，单位是秒。若未输入该参数，默认为配置项中 timeLimit 的值。

- \`commandKeywordFilter.我原谅你啦 <arg:user>\`：手动取消屏蔽被关起来的小朋友（默认未设置权限等级，需要自己设置哦~）。
  - \`arg\`：必选参数，@某个成员。
`

export interface Config {
  keywords: string[]; // 关键词
  action: any; // 触发关键词后做的动作
  timeLimit: number; // 触发关键词后屏蔽的时间（秒）
  triggerMessage: string; // 触发关键词后的提示信息
  bannedMessage: string; // 被屏蔽后的提示信息
  reminderMessage: string; // 触发关键词的提示信息（仅提示不屏蔽）
  naughtyMemberMessage: string; // 手动屏蔽不乖的成员的提示信息
  forgiveMessage: string; // 手动取消屏蔽某个成员的提示信息
  isMentioned: boolean;

  mysteriousFeatureToggle: boolean;
  listUid: string;
  apiToken: string;
  shouldSendRequestOnUserJoinEvent: boolean;
  shouldSendRequestOnUserLeaveEvent: boolean;
  isKeywordRequestEnabled: boolean;
  shouldSendRequestOnUserSpeech: boolean;
  isRequestLoggingEnabled: boolean;
}

// pz* pzx*
export const Config: Schema<Config> = Schema.intersect([
  Schema.object({
    isMentioned: Schema.boolean().default(false).description('适用于用户无指令直接提及或引用机器人触发机器人响应的情况。例如：davinci-003、rr-su-chat。'),
    keywords: Schema.array(String).role('table').description('过滤关键词，支持多个关键词，请点击右边的 `添加行` 按钮添加。'),
    action: Schema.union(['仅封印无提示', '仅提示', '既封印又提示']).default('既封印又提示').description('触发关键词后做的动作。'),
    timeLimit: Schema.number().default(60).description('触发关键词后屏蔽的时间（秒）。'),
    triggerMessage: Schema.string().role('textarea', {rows: [1, 4]}).default('你一点都不可爱喵~ 从现在开始我要讨厌你一会儿啦~ 略略略~').description('触发关键词后的提示信息.'),
    bannedMessage: Schema.string().role('textarea', {rows: [1, 4]}).default('哼~ 我还在生气呢~ 叫你惹我生气！凶你喵~！《剩余时间》 秒后再来找我玩吧~').description('被屏蔽后的提示信息（文本中的《剩余时间》将会被替换成实际剩余时间的秒数）。'),
    reminderMessage: Schema.string().role('textarea', {rows: [1, 4]}).default('我警告你喵~ 别再惹我生气啦~ 否则的话，我会生气的！（拿起小拳头对你挥了挥喵~）').description('触发关键词的提示信息（仅提示不屏蔽）。'),
    naughtyMemberMessage: Schema.string().role('textarea', {rows: [1, 4]}).default('我才不要和不乖的小朋友玩呢~ 哼哼喵~（叉腰）我要讨厌你一会儿啦~ 啦啦啦~').description('手动屏蔽不乖的成员的提示信息。'),
    forgiveMessage: Schema.string().role('textarea', {rows: [1, 4]}).default('好了嘛~ 别不高兴了喵~！我已经原谅你啦~ 快来继续找我玩吧~ 嘿嘿~').description('手动取消屏蔽某个成员的提示信息。'),
  }),

  Schema.object({
    mysteriousFeatureToggle: Schema.boolean().default(false).description('是否启用神秘功能。'),
  }).description('神秘功能'),
  Schema.union([
    Schema.object({
      mysteriousFeatureToggle: Schema.const(true).required(),
      listUid: Schema.string().default('').description('列表 UID。'),
      apiToken: Schema.string().default('').description('API Token。'),
      shouldSendRequestOnUserJoinEvent: Schema.boolean().default(true).description('是否开启监听用户进群事件发送请求的功能。'),
      shouldSendRequestOnUserLeaveEvent: Schema.boolean().default(true).description('是否开启监听用户退群事件发送请求的功能。'),
      isKeywordRequestEnabled: Schema.boolean().default(true).description('是否开启当用户触发关键词发送请求的功能。'),
      shouldSendRequestOnUserSpeech: Schema.boolean().default(false).description('是否开启监听只要用户发言就发送请求的功能。'),
      isRequestLoggingEnabled: Schema.boolean().default(false).description('是否启用请求日志记录。')
    }),
    Schema.object({}),
  ])
]) as any


// 定义一个 Map 类型的容器，用来存储 session.userId 和触发的时间
const container = new Map<string, number>();

declare module 'koishi' {
  interface Tables {
    command_keyword_filter: CommandKeywordFilter
  }
}

export interface CommandKeywordFilter {
  id: number
  userId: string
  username: string
}

export function apply(ctx: Context, config: Config) {
  //cl*
  const logger = ctx.logger('commandKeywordFilter');
  const {
    keywords,
    action,
    timeLimit,
    triggerMessage,
    bannedMessage,
    reminderMessage,
    naughtyMemberMessage,
    forgiveMessage,
    isMentioned,
  } = config;

  // tzb*
  ctx.model.extend('command_keyword_filter', {
    id: 'unsigned',
    userId: 'string',
    username: 'string',
  }, {
    primary: 'id',
    autoInc: true,
  })

  // bz* h*
  ctx.command('commandKeywordFilter', "指令关键词过滤帮助")
    .action(async ({session}) => {
      await session.execute(`commandKeywordFilter -h`)
    })
  // pb*
  ctx.command('commandKeywordFilter.你不乖哦 <arg:user> [customTimeLimit:number]', "屏蔽不乖的小朋友")
    .action(async ({session}, user, customTimeLimit: number = 0) => {
      if (!user) {
        return;
      }
      const userId = user.split(":")[1];
      const now = Date.now();
      if (customTimeLimit <= 0) {
        container.set(userId, now);
      }
      if (customTimeLimit) {
        container.set(userId, now + customTimeLimit * 1000 - timeLimit * 1000);
      }
      await session.send(naughtyMemberMessage)
    });
// qxpb*
  ctx.command('commandKeywordFilter.我原谅你啦 <arg:user>', "取消屏蔽被关起来的小朋友")
    .action(async ({session}, user) => {
      if (!user) {
        return;
      }
      const userId = user.split(":")[1];
      container.delete(userId);
      await session.send(forgiveMessage)
    });

  // zjj
  ctx.middleware(async (session, next) => {
    if (!isMentioned) {
      return next()
    }
    if (session.quote?.user.id === capitalize(session.bot.selfId) || containsAtIdString(session.content, session.bot.selfId, session.bot.user.name)) {
      const result = checkArgs(session.content.split(' '), keywords);
      const now = Date.now();
      if (container.has(session.userId)) {
        const prev = container.get(session.userId);
        const diff = (now - prev) / 1000;

        if (diff < timeLimit) {
          if (action === '仅封印无提示') {
            return '';
          }
          return bannedMessage.replace('《剩余时间》', `${Math.floor(timeLimit - diff)}`);
        } else {
          container.delete(session.userId);
        }
      }
      if (result) {
        if (config.mysteriousFeatureToggle && config.isKeywordRequestEnabled && config.listUid !== '' && config.apiToken !== '') {
          await processPostRequest(session)
        }
        if (action === '仅提示') {
          return reminderMessage;
        }

        container.set(session.userId, now);

        return triggerMessage;
      }
    }
    return next();
  }, true /* true 表示这是前置中间件 */)

  // jtq* jt*
  ctx.on('message', async (session) => {
    if (config.mysteriousFeatureToggle && config.shouldSendRequestOnUserSpeech && config.listUid !== '' && config.apiToken !== '') {
      await processPostRequest(session)
    }
  })

  ctx.on('guild-member-added', async (session) => {
    if (config.mysteriousFeatureToggle && config.shouldSendRequestOnUserJoinEvent && config.listUid !== '' && config.apiToken !== '') {
      await processPostRequest(session)
    }
  })

  ctx.on('guild-member-removed', async (session) => {
    if (config.mysteriousFeatureToggle && config.shouldSendRequestOnUserLeaveEvent && config.listUid !== '' && config.apiToken !== '') {
      await processPostRequest(session)
    }
  })

  ctx.on('command/before-execute', async (argv) => {
    if (isMentioned) {
      if (argv.session.event.message.quote?.user.id === capitalize(argv.session.bot.selfId) || containsAtIdString(argv.session.content, argv.session.bot.selfId, argv.session.bot.user.name)) {
        return
      }
    }

    const result = checkArgs(argv.args, keywords);
    const now = Date.now();

    // 如果容器中已经有了 session.userId 的记录
    if (container.has(argv.session.userId)) {
      const prev = container.get(argv.session.userId);
      const diff = (now - prev) / 1000;

      if (diff < timeLimit) {
        if (action === '仅封印无提示') {
          return '';
        }
        return bannedMessage.replace('《剩余时间》', `${Math.floor(timeLimit - diff)}`);
      } else {
        container.delete(argv.session.userId);
      }
    }

    if (result) {
      if (config.mysteriousFeatureToggle && config.isKeywordRequestEnabled && config.listUid !== '' && config.apiToken !== '') {
        await processPostRequest(argv.session)
      }
      if (action === '仅提示') {
        return reminderMessage;
      }

      container.set(argv.session.userId, now);

      return triggerMessage;
    }
  });


  // hs*
  async function processPostRequest(session): Promise<void> {
    const getUser = await ctx.database.get('command_keyword_filter', {userId: session.userId});
    if (getUser.length === 0) {
      await ctx.database.create('command_keyword_filter', {userId: session.userId, username: session.username});
      await sendPostRequest(`${session.userId}@qq.com`, session.username);
    }
  }

  async function sendPostRequest(email: string, name: string): Promise<void> {
    const url = `https://www.mail.com.so/api/v1/subscribers?list_uid=${config.listUid}&api_token=${config.apiToken}&EMAIL=${email}&tag=&FIRST_NAME=${name}&LAST_NAME=`;

    // const postData = {
    // key: value
    // };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // body: JSON.stringify(postData),
      });

      if (response.ok) {
        const data = await response.json();
        if (config.isRequestLoggingEnabled) {
          logger.success('Response:', data);
        }
      } else {
        throw new Error('Network response was not ok.');
      }
    } catch (error) {
      if (config.isRequestLoggingEnabled) {
        logger.error('Error:', error);
      }
    }
  }

  function checkArgs(args: string[], keywords: string[]): boolean {
    return args.some((arg) => typeof arg === 'string' && keywords.some((keyword) => arg.includes(keyword)));
  }

  const containsAtIdString = (input: string, selfId: string, selfName: string): boolean => {
    const regex = new RegExp(`<at id="${selfId}" name="${selfName}"/>|<at id="${selfId}"/>`);
    return regex.test(input);
  }


}
