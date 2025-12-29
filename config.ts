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
type STAGE = 'development' | 'staging' | 'production'

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
  staging: {
    streamingApiFrontendOrigin: 'https://streaming.staging.biz:8443',
    streamingBackendApiOrigin: {
      client: 'https://streaming-api.staging.biz:8443',
      server: 'http://streaming-backend-stg:4000',
    },
    signalingOrigin: 'wss://streaming-signaling.staging.biz:8443',
    loggerLevel: 'debug',
    domain: 'staging.biz',
  },
  production: {
    streamingApiFrontendOrigin: 'https://streaming.jounetsism.biz',
    streamingBackendApiOrigin: {
      client: 'https://streaming-api.jounetsism.biz',
      server: 'http://streaming-backend-prod:4000',
    },
    signalingOrigin: 'wss://streaming-signaling.jounetsism.biz',
    loggerLevel: 'debug',
    domain: 'jounetsism.biz',
  },
}
const env = (process.env.NEXT_PUBLIC_APP_ENV || 'development') as STAGE
const envList = ['development', 'staging', 'production']
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
