import { Context, Dict, Quester } from 'koishi'
import { ImageData } from './types'

export function arrayBufferToBase64(buffer: ArrayBuffer) {
  if (process.env.KOISHI_ENV === 'browser') {
    let result = ''
    const chunk = 8192
    for (let index = 0; index < buffer.byteLength; index += chunk) {
      result += String.fromCharCode.apply(null, buffer.slice(index, index + chunk))
    }
    return btoa(result)
  } else {
    return Buffer.from(buffer).toString('base64')
  }
}
const MAX_CONTENT_SIZE = 10485760
const ALLOWED_TYPES = ['image/jpeg', 'image/png']
export async function download(ctx: Context, url: string, headers = {}): Promise<ImageData> {
  if (url.startsWith('data:')) {
    const [, type, base64] = url.match(/^data:(image\/\w+);base64,(.*)$/)
    if (!ALLOWED_TYPES.includes(type)) {
      throw new NetworkError('.unsupported-file-type')
    }
    const binary = atob(base64)
    const result = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      result[i] = binary.charCodeAt(i)
    }
    return { buffer: result, base64, dataUrl: url }
  } else {
    const head = await ctx.http.head(url, { headers })
    if (+head['content-length'] > MAX_CONTENT_SIZE) {
      throw new NetworkError('.file-too-large')
    }
    const mimetype = head['content-type']
    if (!ALLOWED_TYPES.includes(mimetype)) {
      throw new NetworkError('.unsupported-file-type')
    }
    const buffer = await ctx.http.get(url, { responseType: 'arraybuffer', headers })
    const base64 = arrayBufferToBase64(buffer)
    return { buffer, base64, dataUrl: `data:${mimetype};base64,${base64}` }
  }
}
export class NetworkError extends Error {
  constructor(message: string, public params = {}) {
    super(message)
  }

  static catch = (mapping: Dict<string>) => (e: any) => {
    if (Quester.isAxiosError(e)) {
      const code = e.response?.status
      for (const key in mapping) {
        if (code === +key) {
          throw new NetworkError(mapping[key])
        }
      }
    }
    throw e
  }
}
export interface Size {
  width: number
  height: number
}
export function stripDataPrefix(base64: string) {
  // workaround for different gradio versions
  // https://github.com/koishijs/novelai-bot/issues/90
  return base64.replace(/^data:image\/[\w-]+;base64,/, '')
}