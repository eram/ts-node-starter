FROM keymetrics/pm2:14-alpine

## install  curl + bash
RUN apk update && apk add --no-cache curl bash;

# create app directory
ENV WORK_DIR_PATH /usr/src/app
RUN mkdir -p $WORK_DIR_PATH
RUN chown -R root:$USER $WORK_DIR_PATH
WORKDIR $WORK_DIR_PATH

# copy in
ADD package*.json ./
ADD tsconfig.json ./
COPY ./.env ./
COPY ./src ./src
COPY ./public ./public
COPY ./cluster.config.js ./

# install dependencies and print resulting docker structure
RUN npm install --production
RUN ls -al -R

# default docker entry point
ENTRYPOINT ["npm", "start", "cluster" "cluster.config.js", "--env", "production"]