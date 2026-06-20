# Build context: repo root (workspace-aware)

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json yarn.lock ./
COPY services/backend/package.json ./services/backend/
COPY services/frontend/package.json ./services/frontend/
RUN yarn install --frozen-lockfile

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/services ./services
COPY services/backend ./services/backend
RUN yarn workspace backend build

FROM node:22-alpine AS dev
WORKDIR /app/services/backend
ENV NODE_ENV=development
COPY --from=deps /app/node_modules /app/node_modules
COPY --from=deps /app/services /app/services
COPY services/backend /app/services/backend
EXPOSE 3000
CMD ["yarn", "start:dev"]

FROM node:22-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production
COPY services/backend/package.json ./
RUN yarn install --production --ignore-scripts --prefer-offline
COPY --from=build /app/services/backend/dist ./dist
EXPOSE 3000
USER node
CMD ["node", "dist/main.js"]
