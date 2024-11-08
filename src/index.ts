import { Context, Schema, h, trimSlash } from 'koishi'

export const name = 'sd-extra'

export interface Config {
  endpoint?: string
  upscaler?: string
  resize?: number
}

export const Config: Schema<Config> = Schema.object({
  endpoint: Schema.string().default('http://127.0.0.1:7860').description('sd-webui 的地址'),
  upscaler: Schema.string().default('SwinIR_4x').description('默认采样器'),
  resize: Schema.number().default(2).min(0).max(4).description('默认放大倍数'),
})

export function apply(ctx: Context, config: Config) {
  // write your plugin here
  const endpoint = trimSlash(config.endpoint)
  const resize = (value: string) => {
    const num = parseInt(value)
    if (isNaN(num) || num < 1 || num > 4) {
      throw Error('放大倍数必须是 1-4 的整数')
    }
    return num
  }

  const getUpscalers = async () => {
    const upscalers = await ctx.http.get<Upscaler[]>(endpoint + '/sdapi/v1/upscalers')
    return upscalers.map(upscaler => upscaler.name)
  }

  ctx.command(name, 'sd-extra')
    .alias('放大')
    .option('resize', '-r <resize:number> 放大倍数', { type: resize })
    .option('upscaler', '-u <upscaler:text> 手动选择采样器')
    .option('switch', '-x <switch:boolean> 切换默认采样器')
    .option('show', '-s <show:boolean> 显示可用采样器')
    .action(async ({ session, options }, input) => {
      options.resize ??= config.resize
      options.upscaler ??= config.upscaler
      if (options.switch) {
        const upscalers = await getUpscalers()
        const upscalerList = upscalers.map((upscaler, index) => `${index + 1}. ${upscaler}`).join('\n')
        session.send(`当前采样器为：${options.upscaler}\n可用的采样器有：\n${upscalerList}\n请输入要切换的采样器序号：`)
        const index = parseInt(await session.prompt())
        if (isNaN(index) || index < 1 || index > upscalers.length) return '输入错误'
        config.upscaler = upscalers[index - 1]
        ctx.scope.update(config, false)
        return `已将默认采样器切换为 ${upscalers[index - 1]}`
      }
      if (options.show) return `当前采样器为：${options.upscaler}\n可用的采样器有：\n${(await getUpscalers()).join('\n')}`
      const imgUrl = h.select(input, 'img')[0]?.attrs.src
      if (!imgUrl) return session.execute(`help ${name}`)
      const img = await ctx.http.get(imgUrl, { responseType: 'arraybuffer' })
      const res = await ctx.http.post<ImageUpscaleResult>(
        endpoint + '/sdapi/v1/extra-single-image', {
        image: `data:image/png;base64,${Buffer.from(img).toString('base64')}`,
        upscaling_resize: options.resize,
        upscaler_1: options.upscaler,
      })
      return h.img(`data:image/png;base64,${res.image}`)
    })
}

interface Upscaler {
  name: string
  model_name: string
  model_path: string
  model_url: string
  scale: number
}

interface ImageUpscaleResult {
  html_info: string
  image: string
}