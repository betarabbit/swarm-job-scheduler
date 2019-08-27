FROM node:12

ENV APP_HOME=/opt/scheduler
ENV NODE_ENV=production

WORKDIR ${APP_HOME}

COPY . .

RUN mkdir -p ${APP_HOME} && \
    npm install && \
    npm cache clean --force

CMD [ "node", "src/index.js" ]
