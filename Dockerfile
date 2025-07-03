FROM node:20-bookworm

RUN mkdir -p /usr/src/garie-plugin
RUN mkdir -p /usr/src/garie-plugin/reports

WORKDIR /usr/src/garie-plugin

COPY package.json .

RUN cd /usr/src/garie-plugin && npm install

# Install Chromium and dumb-init
RUN apt-get update && \
    apt-get install -y chromium dumb-init && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

ENV CHROMIUM_PATH=/usr/bin/chromium

COPY . .

EXPOSE 3000

VOLUME ["/usr/src/garie-plugin/reports"]

ENTRYPOINT ["/usr/src/garie-plugin/docker-entrypoint.sh"]

CMD ["/usr/bin/dumb-init", "npm", "start"]
