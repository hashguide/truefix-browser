import pino from 'pino'
import config from '@config/index'

const isProduction = config.env === 'production'

const logger = pino({
  level: config.logLevel,
  transport: isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
          singleLine: false,
        },
      },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    pid: process.pid,
    env: config.env,
  },
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
})

export default logger
