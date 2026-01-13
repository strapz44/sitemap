module.exports = {
  name: 'prerender-app',
  type: 'vue',
  env: {
    VUE_APP_API_URL: 'https://prerender-api.windsurf.dev',
    NODE_ENV: 'production'
  },
  build: {
    command: 'npm install && npm run build',
    output: 'dist'
  }
}
