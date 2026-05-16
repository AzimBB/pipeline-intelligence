# =========================================================
# STAGE 1: SYSTEM ENVIRONMENT & FRONTEND COMPILATION MATRIX
# =========================================================
FROM ubuntu:22.04

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install core build dependencies, Git, Nginx, and Python 3.11 pre-requisites
RUN apt-get update && apt-get install -y \
    git \
    curl \
    nginx \
    supervisor \
    build-essential \
    libssl-dev \
    zlib1g-dev \
    libbz2-dev \
    libreadline-dev \
    libsqlite3-dev \
    wget \
    llvm \
    libncurses5-dev \
    libncursesw5-dev \
    xz-utils \
    tk-dev \
    libffi-dev \
    liblzma-dev \
    software-properties-common \
    && rm -rf /var/lib/apt/lists/*

# Install Python 3.11.0 exactly from official source distribution binaries
WORKDIR /tmp/python
RUN wget https://www.python.org/ftp/python/3.11.0/Python-3.11.0.tar.xz \
    && tar -xf Python-3.11.0.tar.xz \
    && cd Python-3.11.0 \
    && ./configure --enable-optimizations \
    && make -j$(nproc) \
    && make altinstall \
    && rm -rf /tmp/python

# Install Node.js runtime and upgrade globally to the exact requested NPM v10.9.2
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g npm@10.9.2

# 1) Clone the repository to its natural folder name
WORKDIR /pipeline-intelligence
RUN git clone https://github.com/AzimBB/pipeline-intelligence.git .

# 4) Navigate into opt/frontend inside the repo and install dependencies
WORKDIR /pipeline-intelligence/opt/frontend
RUN npm install

# 5) Compile and generate production asset bundles inside opt/frontend/dist
RUN npm run build

# 9) Move into opt/backend inside the repo to handle python dependencies
WORKDIR /pipeline-intelligence/opt/backend

# Initialize Python virtual environment inside the repo's opt/backend folder
RUN python3.11 -m venv venv
ENV PATH="/pipeline-intelligence/opt/backend/venv/bin:$PATH"

# 10) Update Pip package controller and download repository dependencies
RUN pip install --upgrade pip \
    && if [ -f "requirements.txt" ]; then pip install --no-cache-dir -r requirements.txt; \
       else pip install --no-cache-dir fastapi uvicorn; fi

# =========================================================
# STAGE 2: PROCESS MANAGEMENT & SERVER ORCHESTRATION LAYER
# =========================================================

# 6) Apply Nginx configuration directly from your repository root
RUN rm /etc/nginx/sites-enabled/default \
    && cp /pipeline-intelligence/nginx.conf /etc/nginx/sites-available/pipeline \
    && ln -s /etc/nginx/sites-available/pipeline /etc/nginx/sites-enabled/

# 7) Apply Supervisor configuration directly from your repository root
RUN cp /pipeline-intelligence/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Nginx operates directly on standard port 80 
EXPOSE 80

# Launch Supervisor process control layer
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]