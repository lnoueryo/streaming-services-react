import output from '@/config'

type LogLevel = 'debug' | 'log' | 'info' | 'warn' | 'error'

// レベルごとのラベル色
const LEVEL_COLOR: Record<LogLevel, string> = {
  debug: 'color: #9E9E9E',
  log: 'color: #1976D2',
  info: 'color: #0288D1',
  warn: 'color: #FBC02D',
  error: 'color: #D32F2F'
}

// title 用カラー
const TITLE_COLORS = [
  'color: #7B1FA2',
  'color: #388E3C',
  'color: #F57C00',
  'color: #5392ffff',
  'color: #f22879ff'
]

// highlight に使うカラー
const HIGHLIGHT_COLOR = 'color:#81C784; font-weight:bold'

export class Logger {
  static level: LogLevel = output.loggerLevel as LogLevel
  static isProd = process.env.NODE_ENV === 'production'

  private static shouldPrint(level: LogLevel) {
    const order: LogLevel[] = ['debug', 'log', 'info', 'warn', 'error']
    return order.indexOf(level) >= order.indexOf(Logger.level)
  }

  private static getTitleColor(title: string) {
    let hash = 0
    for (let i = 0; i < title.length; i++) {
      hash = (hash << 5) - hash + title.charCodeAt(i)
      hash |= 0
    }
    return TITLE_COLORS[Math.abs(hash) % TITLE_COLORS.length]
  }

  private static baseFormat(level: LogLevel, title: string) {
    return `[%c${level.toUpperCase()}%c] [%c${title}%c] `
  }

  /**
   * highlightText が含まれていた場合、そこだけ色を変える
   */
  private static buildColoredMessage(
    msg: string,
    highlight?: string
  ): { text: string; styles: string[] } {
    if (!highlight || !msg.includes(highlight)) {
      return { text: msg, styles: [] }
    }

    const [before, after] = msg.split(highlight)

    return {
      text: `${before}%c${highlight}%c${after}`,
      styles: [HIGHLIGHT_COLOR, 'color: unset']
    }
  }

  private static assembleArgs(
    level: LogLevel,
    title: string,
    message: any,
    opt: any[]
  ) {
    const levelStyle = LEVEL_COLOR[level]
    const titleStyle = Logger.getTitleColor(title)

    // メッセージ構築（ハイライト対応）
    let msg = ''
    let extraStyles: string[] = []
    let restOptions = opt

    if (typeof message === 'object') {
      // オブジェクトはそのまま出す
      msg = '%o'
      restOptions = [message, ...opt]
    } else {
      const highlight =
        typeof opt[0] === 'object' ? opt[0]?.highlight : undefined
      const colored = this.buildColoredMessage(String(message), highlight)
      msg = colored.text
      extraStyles = colored.styles

      // highlight オプションを外す
      if (typeof opt[0] === 'object' && opt[0]?.highlight) {
        restOptions = opt.slice(1)
      }
    }

    return [
      Logger.baseFormat(level, title) + msg,
      levelStyle,
      'color: unset',
      titleStyle,
      'color: unset',
      ...extraStyles,
      ...restOptions
    ]
  }

  debug(title: string, message?: any, ...opt: any[]) {
    if (!Logger.shouldPrint('debug')) return
    console.debug(...Logger.assembleArgs('debug', title, message, opt))
  }

  log(title: string, message?: any, ...opt: any[]) {
    if (!Logger.shouldPrint('log')) return
    console.log(...Logger.assembleArgs('log', title, message, opt))
  }

  info(title: string, message?: any, ...opt: any[]) {
    if (!Logger.shouldPrint('info')) return
    console.info(...Logger.assembleArgs('info', title, message, opt))
  }

  warn(title: string, message?: any, ...opt: any[]) {
    if (!Logger.shouldPrint('warn')) return
    console.warn(...Logger.assembleArgs('warn', title, message, opt))
  }

  // error だけ title 不要なので特別扱い
  error(message?: any, ...optional: any[]) {
    if (!Logger.shouldPrint('error')) return

    console.error(
      `%c[ERROR]%c`,
      LEVEL_COLOR.error,
      'color: unset',
      message,
      ...optional
    )
  }
}

export const logger = new Logger()
