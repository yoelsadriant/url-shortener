FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . ./
RUN npm run build

FROM node:24-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache wget
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY --from=build /app/dist ./dist
COPY --from=build /app/scripts ./scripts
EXPOSE 3000
USER node
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "dist/main.js"]

# `render-poc` bundles DynamoDB Local in the same container so the whole stack
# fits in a single Render free Web Service. Not for real production.
FROM prod AS render-poc
USER root
RUN apk add --no-cache openjdk21-jre-headless tar curl && \
    mkdir -p /opt/ddb && \
    curl -fsSL https://s3.us-east-1.amazonaws.com/dynamodb-local/dynamodb_local_latest.tar.gz \
      | tar -xz -C /opt/ddb && \
    chown -R node:node /opt/ddb
USER node
ENV AWS_ENDPOINT=http://localhost:8000
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["sh", "-c", "java -Xmx128m -Djava.library.path=/opt/ddb/DynamoDBLocal_lib -jar /opt/ddb/DynamoDBLocal.jar -port 8000 -inMemory -sharedDb & node scripts/init-tables.mjs && exec node dist/main.js"]
