FROM node:18-slim
WORKDIR /usr/src/app
COPY package*.json ./
COPY node_modules ./node_modules
COPY . .
CMD [ "npm", "start" ]
