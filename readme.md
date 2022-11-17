# [koishi-plugin-sd-extra](https://github.com/MirrorCY/sd-extra)

[![downloads](https://img.shields.io/npm/dm/koishi-plugin-sd-extra?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-sd-extra) 

本插件基于 [novelai-bot](https://github.com/koishijs/novelai-bot) 修改完成，使用 [SD-WebUI](https://github.com/AUTOMATIC1111/stable-diffusion-webui) 进行图像超分辨率。已实现功能：

- 放大倍数设定
- 放大模型选择

得益于 Koishi 的插件化机制，只需配合其他插件即可实现更多功能：

- 多平台支持 (QQ、Discord、Telegram、开黑啦等)
- 速率限制 (限制每个用户每天可以调用的次数和每次调用的间隔)
- 上下文管理 (限制在哪些群聊中哪些用户可以访问)

**所以所以快去给 [Koishi](https://github.com/koishijs/koishi) 点个 star 吧！**

## 使用教程

- 首先你需要有一个搭建好的 [SD-WebUI](https://github.com/AUTOMATIC1111/stable-diffusion-webui)，可以在网上找找相关教程
- 确认 SD-WebUI 的启动参数包含 `--api` 
- 安装并配置本插件
- 在沙盒里输入 `extra` 即可看到此插件的帮助啦

有任何问题都可以提 issue 我会尽快回复~

![ext](https://user-images.githubusercontent.com/37006258/202367863-435645bf-b651-4909-b280-0bbfc05d7e8d.png)


TODO：

- 分辨率限制
- 放大模型列表展示
