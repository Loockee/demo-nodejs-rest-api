# Build image
FROM node:17 as builder

WORKDIR /usr/src/app
RUN npm i -g npm
COPY . .
RUN npm ci

ENTRYPOINT ["sbin/tini", "--"]

FROM node:17.4.0-stretch-slim as AppRunner

ENV PORT '3000'
ENV HOST '0.0.0.0'
ENV REDIS_HOST '127.0.0.1'
ENV REDIS_PORT '6379'
WORKDIR /usr/src/app
User node
EXPOSE $PORT
COPY --from=builder /usr/src/app .
CMD ["node", "src/server.js"]
