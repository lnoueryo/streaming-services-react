type Config = {

}
const config: Config = {

}
type ConfigEnv = {
  httpApiOrigin: string
  websocketApiOrigin: string
}
type STAGE = 'development' | 'production'

const configEnvs: { [K in STAGE]: ConfigEnv } = {
  development: {
    httpApiOrigin: 'http://localhost:3001',
    websocketApiOrigin: 'wss://localhost:8080',
  },
  production: {
    httpApiOrigin: 'https://streaming-api.jounetsism.biz',
    websocketApiOrigin: 'wss://streaming-signaling.jounetsism.biz',
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
