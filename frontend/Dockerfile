FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Command will be overridden in docker-compose.yml for dev
CMD ["npm", "run", "dev"]
