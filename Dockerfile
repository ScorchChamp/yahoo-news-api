FROM alpine:latest
VOLUME /config

WORKDIR /app

COPY . .

RUN apk add --no-cache nodejs npm && npm install

EXPOSE 3000

CMD ["node", "index.js"]