FROM node:22.23.2-trixie

LABEL maintainer="void* <voidp@protonmail.com>"

USER root

ENV APP=/usr/src/app

RUN npm install --global pm2@7.0.4

COPY package.json /tmp/package.json
COPY package-lock.json /tmp/package-lock.json

RUN cd /tmp && npm ci --omit=dev --loglevel=warn \
  && mkdir -p $APP \
  && mv /tmp/node_modules $APP

COPY src $APP/src
COPY data $APP/data
COPY package.json $APP

WORKDIR $APP

CMD [ "pm2-runtime", "src/index.js" ]
