FROM node:18

WORKDIR /app
COPY package.* .
RUN yarn install
COPY . .

EXPOSE 3301


ENTRYPOINT ["node"]
CMD ["main.js"]
