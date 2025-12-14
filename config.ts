type Config = {

}
const config: Config = {

}
type ConfigEnv = {
  streamingApiFrontendOrigin: string
  streamingBackendApiOrigin: {
    client: string
    server: string
  }
  signalingOrigin: string
  loggerLevel: string
  domain: string
}
type STAGE = 'development' | 'production'

const configEnvs: { [K in STAGE]: ConfigEnv } = {
  development: {
    streamingApiFrontendOrigin: 'https://streaming.localtest.me',
    streamingBackendApiOrigin: {
      client: 'https://streaming-api.localtest.me',
      server: 'http://streaming-backend:4000',
    },
    signalingOrigin: 'wss://streaming-signaling.localtest.me',
    loggerLevel: 'debug',
    domain: 'localtest.me',
  },
  production: {
    streamingApiFrontendOrigin: 'https://streaming.jounetsism.biz',
    streamingBackendApiOrigin: {
      client: 'https://streaming-api.jounetsism.biz',
      server: 'http://streaming-backend:4000',
    },
    signalingOrigin: 'wss://streaming-signaling.jounetsism.biz',
    loggerLevel: 'debug',
    domain: 'jounetsism.biz',
  },
}
const env = (process.env.NODE_ENV || 'development') as STAGE
const envList = ['development', 'production']
if (!envList.includes(env)) {
  throw new Error('invalid STAGE')
}
const configEnv = configEnvs[env]
const output = {
  ...config,
  ...configEnv,
  env,
}
export default output
