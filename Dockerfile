FROM node:12.13.0-alpine

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --no-optional
COPY . .

EXPOSE 3000

CMD ["pm2-runtime", "config/ecosystem.config.js", "--env", "production"]