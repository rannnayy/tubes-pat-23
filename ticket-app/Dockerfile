FROM node:lts-alpine
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install
RUN npx prisma generate
COPY src/ ./src/
COPY .env ./
EXPOSE 4000
CMD [ "npm", "start" ]