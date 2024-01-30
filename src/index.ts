import { Context, Dict, Logger, Quester, h, Session, trimSlash } from 'koishi'
import { Config } from './config'
import { ImageData, StableDiffusionWebUI } from './types'
import { download, NetworkError, stripDataPrefix } from './utils'
import { } from '@koishijs/plugin-help'

export * from './config'
export const reactive = true
export const name = 'extra'

const logger = new Logger('extra')

function handleError(session: Session, err: Error) {
  if (Quester.isAxiosError(err)) {
    if (err.response?.status === 402) {
      return session.text('.unauthorized')
    } else if (err.response?.status) {
      return session.text('.response-error', [err.response.status])
    } else if (err.code === 'ETIMEDOUT') {
      return session.text('.request-timeout')
    } else if (err.code) {
      return session.text('.request-failed', [err.code])
    }
  }
  logger.error(err)
  return session.text('.unknown-error')
}

export function apply(ctx: Context, config: Config) {
  ctx.i18n.define('zh', require('./locales/zh'))
  const tasks: Dict<Set<string>> = Object.create(null)
  const globalTasks = new Set<string>()
    const cmd = ctx.command('extra <prompts:text>')
    .alias('ext')
    .userFields(['authority'])
    .option('resize', '-r <resize:number>')
    .option('upscaler', '-s <upscaler:string>')
    .option('upscalerIndex', '-i <upscalerIndex:number>')
    .action(async ({ session, options }, input) => {
      //空输入的处理
      if (!input?.trim()) {
        return session.execute('help extra')
      }
      //图像？
      let imgUrl: string, image: ImageData
      imgUrl = h.select(input, 'img')[0].attrs.src
      //存参数的地方
      const parameters: Dict = {
        resize: 2,
        upscalerIndex: 0,
        upscaler: undefined
      }
      Object.assign(parameters, {
        resize: options.resize ?? 2,
        upscalerIndex: options.upscalerIndex ?? 0
      })
      //下载图像
      if (imgUrl) {
        try {
          image = await download(ctx, imgUrl)
        } catch (err) {
          if (err instanceof NetworkError) {
            return session.text(err.message, err.params)
          }
          logger.error(err)
          return session.text('.download-error')
        }
      }
      //处理队列
      const id = Math.random().toString(36).slice(2)
      if (config.maxConcurrency) {
        const store = tasks[session.cid] ||= new Set()
        if (store.size >= config.maxConcurrency) {
          return session.text('.concurrent-jobs')
        } else {
          store.add(id)
        }
      }
      session.send(globalTasks.size
        ? session.text('.pending', [globalTasks.size])
        : session.text('.waiting'))
      globalTasks.add(id)
      const cleanUp = () => {
        tasks[session.cid]?.delete(id)
        globalTasks.delete(id)
      }

      // TODO：
      // resize_mode: Literal[0, 1] = Field(default=0, title="Resize Mode", description="Sets the resize mode: 0 to upscale by upscaling_resize amount, 1 to upscale up to upscaling_resize_h x upscaling_resize_w.")
      // show_extras_results: bool = Field(default=True, title="Show results", description="Should the backend return the generated image?")
      // gfpgan_visibility: float = Field(default=0, title="GFPGAN Visibility", ge=0, le=1, allow_inf_nan=False, description="Sets the visibility of GFPGAN, values should be between 0 and 1.")
      // codeformer_visibility: float = Field(default=0, title="CodeFormer Visibility", ge=0, le=1, allow_inf_nan=False, description="Sets the visibility of CodeFormer, values should be between 0 and 1.")
      // codeformer_weight: float = Field(default=0, title="CodeFormer Weight", ge=0, le=1, allow_inf_nan=False, description="Sets the weight of CodeFormer, values should be between 0 and 1.")
      // upscaling_resize: float = Field(default=2, title="Upscaling Factor", ge=1, le=4, description="By how much to upscale the image, only used when resize_mode=0.")
      // upscaling_resize_w: int = Field(default=512, title="Target Width", ge=1, description="Target width for the upscaler to hit. Only used when resize_mode=1.")
      // upscaling_resize_h: int = Field(default=512, title="Target Height", ge=1, description="Target height for the upscaler to hit. Only used when resize_mode=1.")
      // upscaling_crop: bool = Field(default=True, title="Crop to fit", description="Should the upscaler crop the image to fit in the choosen size?")
      // upscaler_1: str = Field(default="None", title="Main upscaler", description=f"The name of the main upscaler to use, it has to be one of this list: {' , '.join([x.name for x in sd_upscalers])}")
      // upscaler_2: str = Field(default="None", title="Secondary upscaler", description=f"The name of the secondary upscaler to use, it has to be one of this list: {' , '.join([x.name for x in sd_upscalers])}")
      // extras_upscaler_2_visibility: float = Field(default=0, title="Secondary upscaler visibility", ge=0, le=1, allow_inf_nan=False, description="Sets the visibility of secondary upscaler, values should be between 0 and 1.")
      // upscale_first: bool = Field(default=False, title="Upscale first", description="Should the upscaler run before restoring faces?")

      const data = (() => {
        return {
          image: image && image.dataUrl, // sd-webui accepts data URLs with base64 encoded image
          upscaling_resize: parameters.resize,
          upscaler_1: parameters.upscaler ?? config.upscalers[parameters.upscalerIndex ?? 0]
        }
      })()

      const request = () => ctx.http.axios(trimSlash(config.endpoint) + '/sdapi/v1/extra-single-image', {
        method: 'POST',
        timeout: config.requestTimeout,
        headers: {
          ...config.headers,
        },
        data,
      }).then((res) => {
        return stripDataPrefix((res.data as StableDiffusionWebUI.Response).image)
      })

      let base64: string, count = 0
      while (true) {
        try {
          base64 = await request()
          cleanUp()
          break
        } catch (err) {
          if (Quester.isAxiosError(err)) {
            if (err.code && err.code !== 'ETIMEDOUT' && ++count < config.maxRetryCount) {
              continue
            }
          }
          cleanUp()
          return handleError(session, err)
        }
      }

      if (!base64.trim()) return session.text('.empty-response')

      function getContent() {
        return h.image('base64://' + base64)
      }

      const ids = await session.send(getContent())

      if (config.recallTimeout) {
        ctx.setTimeout(() => {
          for (const id of ids) {
            session.bot.deleteMessage(session.channelId, id)
          }
        }, config.recallTimeout)
      }
    })
}
