FROM node:lts-alpine

WORKDIR /app


COPY package*.json ./


RUN npm install

COPY src/ ./src/
copy .env ./
EXPOSE 5000

CMD [ "npm", "start" ]