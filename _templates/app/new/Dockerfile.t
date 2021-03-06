---
to: <%= name %>/Dockerfile
unless_exists: true
---
FROM node:current-alpine AS base
WORKDIR /app
COPY package.json /app
RUN npm install

FROM base AS release
COPY . /app
CMD npm start
EXPOSE 3000


