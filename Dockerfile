FROM node:18

WORKDIR /app
COPY . .
RUN yarn install

EXPOSE 3301


ENTRYPOINT "node"
CMD ["main.js"]
