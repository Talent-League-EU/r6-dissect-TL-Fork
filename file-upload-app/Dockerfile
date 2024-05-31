# Stage 1: Build the React app
FROM node:18 as build

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . ./
RUN npm run build

# Stage 2: Serve the React app with Node.js
FROM node:18

WORKDIR /app

# Install AWS CLI
RUN apt-get update && \
    apt-get install -y curl unzip && \
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && \
    unzip awscliv2.zip && \
    ./aws/install && \
    rm -rf awscliv2.zip aws

COPY --from=build /app/build /app/build
COPY server.js ./

RUN npm install express file-upload unzipper

EXPOSE 5001

CMD ["node", "server.js"]
