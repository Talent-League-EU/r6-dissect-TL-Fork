# Use the official Node.js 14 image.
FROM node:14

# Create and change to the app directory.
WORKDIR /usr/src/app

# Copy application dependency manifests to the container image.
COPY package*.json ./

# Install dependencies.
RUN npm install

# Copy local code to the container image.
COPY . .

# Install AWS CLI
RUN apt-get update && \
    apt-get install -y python3-pip && \
    pip3 install awscli

# Expose port 5001 to the outside world
EXPOSE 5001

# Start the server.
CMD ["npm", "start"]
