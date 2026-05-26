# java-tutor
<img width="829" height="542" alt="image" src="https://github.com/user-attachments/assets/0a593066-9215-4752-8e8d-73e3957f1326" />

A step-by-step Java execution visualizer, modified for CS2110 diagramming conventions. Shows the runtime stack and memory heap as a program runs. Adapted from the Java backend in [pathrise-python-tutor](https://github.com/pathrise-eng/pathrise-python-tutor), which is a fork of [Python Tutor](https://pythontutor.com) by Philip Guo.

**Deployed site:** https://java-tutor.pages.dev

## Architecture

- **Frontend** — static HTML/CSS/JS, deployed on Cloudflare Pages (`public/`)
- **Backend** — Python (`bottle`) HTTP server that runs Java code through `traceprinter.InMemory` and returns a JSON execution trace
- **Sandbox** — each execution runs in an isolated Docker container with `--network=none`, `--read-only`, and resource limits

## API Endpoints

```
GET /exec_java?user_script=<code>&options_json=<json>
GET /exec_java_jsonp?user_script=<code>&options_json=<json>&callback=<fn>
```

## Running locally

Requires Python 3, `bottle`, and a JDK.

```bash
pip install bottle
JAVA_JAIL_CP=./java_jail_cp python3 server.py
```

Server listens on port `4003` by default. Set `PORT` to change it.

## Deployment

Each execution is sandboxed in a throw-away Docker container. Build the executor image and run the server on the host:

```bash
# Build the executor image
docker build -f Dockerfile.executor -t java-tutor-executor .

# Install dependencies
pip3 install bottle

# Run the server
EXECUTOR_IMAGE=java-tutor-executor PORT=4003 python3 server.py
```

The `EXECUTOR_IMAGE` env var enables per-execution container sandboxing. This is to prevent Java code from directly running on the VM. 

### Executor container security flags

```
--network=none      no outbound network access
--read-only         no filesystem writes
--memory=256m       memory cap
--cpus=0.5          CPU cap
--pids-limit=64     process limit
```
