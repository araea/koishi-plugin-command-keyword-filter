# koishi-plugin-command-keyword-filter

[![npm](https://img.shields.io/npm/v/koishi-plugin-command-keyword-filter?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-command-keyword-filter)

## 🎈 介绍

👋 你好，command-keyword-filter 是一个插件，用于过滤用户在触发指令之前传递的参数，以确定是否包含预设的关键词。它能够让你的机器人有选择性地执行指令。🤖

## 功能介绍

- 📝 你可以设置一些关键词，当用户输入这些关键词时，会触发一些动作，比如封印用户、提示用户、或者既封印又提示用户。
- ⏱️ 你可以设置一个时间限制，当用户触发关键词后，在这个时间内，机器人会忽略用户的指令输入，根据设置条件给出一些提示信息。
- 🎨 你可以自定义触发关键词后的提示信息，让机器人更加有个性和表情。
- 🚀 你可以使用 koishi 的配置界面来方便地设置这些参数，也可以直接联系我来实现更多的功能。

## 📦 安装

```
前往 Koishi 插件市场添加该插件即可
```

## 📝 命令

- `你不乖哦 <arg:user> [customTimeLimit:number]`：手动屏蔽不乖的小朋友（默认未设置权限等级，需要自己设置哦~）。
  - `arg`：必选参数，@某个成员。
  - `customTimeLimit`：可选参数，单位是秒。若未输入该参数，默认为配置项中 timeLimit 的值。

## 🎮 使用

- 🎉 启动 koishi，并享受和机器人的互动吧！

## 🙏 致谢

* [Koishi](https://koishi.chat/)：机器人框架
* [melinoe](https://forum.koishi.xyz/t/topic/4578)：喵 miaO~

## 📄 License

MIT License © 2023