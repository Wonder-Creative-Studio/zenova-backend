
FROM node:24-bullseye
WORKDIR /usr/src/app

# Ensure build tools are available for native modules like sharp
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Install dependencies first to leverage Docker layer caching
COPY package*.json ./
RUN npm install 

# Copy the rest of the application source
COPY . .

EXPOSE 8000

CMD ["npm", "run", "dev"]
