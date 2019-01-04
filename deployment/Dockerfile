FROM node:8
ARG GIT_COMMIT=unspecified
LABEL git_commit=$GIT_COMMIT
ARG NPM_TOKEN

RUN mkdir -p /app
WORKDIR /app

RUN echo "$GIT_COMMIT" > ./version

# Install dependencies
COPY yarn.lock package.json ./
RUN yarn install --frozen-lockfile

# Build
COPY tsconfig.json ./
COPY solidity-out/ ./solidity-out
COPY src/ ./src
RUN yarn build

EXPOSE 8000
CMD [ "node", "dist/scripts/app-start.js"]
