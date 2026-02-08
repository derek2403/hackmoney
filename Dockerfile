FROM node:24-alpine

WORKDIR /app

# Install dependencies first (cache layer)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code
COPY . .

# Create data directory for JSON persistence
RUN mkdir -p data

# Expose ports: 3000 (Next.js), 3001 (CLOB server)
EXPOSE 3000 3001

# Bind Next.js dev server to all interfaces so it's reachable from outside container
ENV HOSTNAME=0.0.0.0

# Run both Next.js dev + CLOB server via concurrently
CMD ["npm", "run", "dev"]
