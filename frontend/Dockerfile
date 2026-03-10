FROM node:20-alpine

WORKDIR /app

# Copy only package.json (not the lock file) so npm resolves
# the correct platform-native bindings inside the container
COPY package.json ./

# Install dependencies — resolves correct rollup bindings for the container's OS/arch
RUN npm install

# Copy application
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Command will be overridden in docker-compose.yml for dev
CMD ["npm", "run", "dev"]
