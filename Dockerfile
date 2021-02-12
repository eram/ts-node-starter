FROM keymetrics/pm2:14-alpine

## installing  curl + bash
RUN apk update && apk add --no-cache curl bash;

# Create App directory
ENV WORK_DIR_PATH /usr/src/app
RUN mkdir -p $WORK_DIR_PATH
RUN chown -R root:$USER $WORK_DIR_PATH
WORKDIR $WORK_DIR_PATH

# Install App dependencies
# A wildcard is used to copy both package.json and package-lock.json.
ADD package*.json ./
ADD tsconfig.json ./
COPY ./.env ./.env
COPY ./src ./src
COPY ./public ./public
COPY ./cluster.config.js ./

# Run code compilation
RUN npm install --production

# Show current folder structure in logs
RUN ls -al -R
ENTRYPOINT ["pm2-runtime", "start", "pm2.config.js", "--env", "production"]