FROM node:20-alpine

WORKDIR /usr/src/mims

COPY package*.json ./

RUN npm install

COPY . .

RUN npx prisma generate

RUN npm run build

ARG MIMS_PORT=3000

EXPOSE ${MIMS_PORT}

CMD ["npm", "run", "start:prod"]