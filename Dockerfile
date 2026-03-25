# Build local monorepo image
# docker build --no-cache -t voxscribe .

# Run image
# docker run -d -p 3000:3000 voxscribe

FROM node:20-alpine

# Install system dependencies and build tools
RUN apk update && \
    apk add --no-cache \
        libc6-compat \
        python3 \
        make \
        g++ \
        build-base \
        cairo-dev \
        pango-dev \
        chromium \
        curl && \
    npm install -g pnpm

ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

ENV NODE_OPTIONS=--max-old-space-size=8192

# Clerk publishable key is read from packages/ui/.env during Vite build
# Do NOT set ENV VITE_CLERK_PUBLISHABLE_KEY here — an empty ENV overrides .env files

WORKDIR /usr/src/voxscribe

# Copy app source
COPY . .

# Install dependencies and build
RUN pnpm install && \
    pnpm build

# Give the node user ownership of the application files
RUN chown -R node:node .

# Switch to non-root user (node user already exists in node:20-alpine)
USER node

EXPOSE 3000

CMD [ "pnpm", "start" ]
