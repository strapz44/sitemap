module.exports = {
  name: 'prerender-api',
  type: 'node',
  env: {
    MONGODB_URI: 'mongodb+srv://privatjonathan1:<db_password>@cluster0.pmcq9kg.mongodb.net/prerender?retryWrites=true&w=majority&appName=Cluster0',
    NODE_ENV: 'production',
    PORT: '3000'
  },
  build: {
    command: 'npm install && npm run build',
    output: 'dist'
  },
  start: {
    command: 'npm start'
  }
}
