FROM node:current-alpine AS base
LABEL "net.archean.type"="Micro"
WORKDIR /app
COPY package.json /app
RUN npm install

FROM base AS release
COPY . /app
CMD npm start
EXPOSE 3000


