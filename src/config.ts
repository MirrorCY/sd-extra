import { Dict, Schema, Time } from 'koishi'

export interface Config {
  upscalers: Array<string>
  endpoint: string
  headers?: Dict<string>
  maxRetryCount?: number
  requestTimeout?: number
  recallTimeout?: number
  maxConcurrency?: number
}

export const Config = Schema.intersect([
  Schema.object({
    endpoint: Schema.string().description('API 服务器地址。例如 http://127.0.0.1:7860').default('http://127.0.0.1:7860'),
    headers: Schema.dict(String).description('要附加的额外请求头。如无必要，此项不填写。'),
  }).description('接入设置'),

  Schema.object({
    upscalers: Schema.array(String).description('允许使用的超分辨率模型，默认使用第一个。部分模型第一次调用需要下载模型文件，可能会导致超时。')
      .default([
        'SwinIR_4x',
        'ScuNET PSNR',
        'ScuNET',
        'R-ESRGAN 4x+ Anime6B',
        'R-ESRGAN 4x+',
        'LDSR',
        'ESRGAN_4x',
        'BSRGAN',
        'Nearest',
        'Lanczos',
        'None'
      ]),
  }).description('模型设置'),

  Schema.object({
    maxRetryCount: Schema.natural().description('连接失败时最大的重试次数。').default(1),
    requestTimeout: Schema.number().role('time').description('当请求超过这个时间时会中止并提示超时。').default(Time.minute),
    recallTimeout: Schema.number().role('time').description('图片发送后自动撤回的时间 (设置为 0 以禁用此功能)。').default(0),
    maxConcurrency: Schema.number().description('单个频道下的最大并发数量 (设置为 0 以禁用此功能)。').default(0),
  }).description('高级设置'),
]) as Schema<Config>
