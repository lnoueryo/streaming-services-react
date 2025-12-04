type Config = {

}
const config: Config = {

}
type ConfigEnv = {
  streamingApiFrontendOrigin: string
  streamingBackendApiOrigin: string
  signalingOrigin: string
}
type STAGE = 'development' | 'production'

const configEnvs: { [K in STAGE]: ConfigEnv } = {
  development: {
    streamingApiFrontendOrigin: 'http://localhost:3000',
    streamingBackendApiOrigin: 'http://localhost:3001',
    signalingOrigin: 'ws://localhost:8080',
  },
  production: {
    streamingApiFrontendOrigin: 'https://streaming.jounetsism.biz',
    streamingBackendApiOrigin: 'https://streaming-api.jounetsism.biz',
    signalingOrigin: 'wss://streaming-signaling.jounetsism.biz',
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
