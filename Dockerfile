FROM mcr.microsoft.com/playwright:v1.64.1-noble

WORKDIR /workspace
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

ENV PORT=4173
ENV SEEKFRAME_HOST=0.0.0.0
EXPOSE 4173
CMD ["node", "bin/seekframe.js", "editor", "--port", "4173"]
