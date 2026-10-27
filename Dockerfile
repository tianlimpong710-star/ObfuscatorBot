FROM node:20-bookworm

ENV DEBIAN_FRONTEND=noninteractive
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    git python3 python3-pip python3-venv build-essential cmake curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json ./
RUN npm install --omit=dev

COPY . .

# Fetch the upstream engines at image-build time, not on every bot startup.
RUN mkdir -p backends \
 && git clone --depth 1 https://github.com/prostone4/Prometheus-Deobfuscator.git backends/prometheus \
 && npm --prefix backends/prometheus install --omit=dev \
 && git clone --depth 1 https://github.com/luaprojects/moonsec-js-deobf.git backends/moonsec \
 && npm --prefix backends/moonsec install --omit=dev \
 && git clone --depth 1 https://github.com/KryptIT/luraph-v15-v14.x-deobfuscator.git backends/luraph

# The Luraph repository bundles Windows Luau executables. On Linux, those tools may
# need a Linux-compatible Luau build before its backend can run successfully.
CMD ["npm", "start"]
