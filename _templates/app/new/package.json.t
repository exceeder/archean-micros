---
to: <%= name %>/package.json
unless_exists: true
---
{
  "name": "<%= name %>",
  "version": "0.0.1",
  "description": "",
  "main": "app.js",
  "scripts": {
    "start": "node src/app.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "author": "",
  "license": "ISC",
  "dependencies": {
    "express": "^4.17.1",
    "redis": "^2.8.0"
  }
}
