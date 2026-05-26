# java-tutor
<img width="829" height="542" alt="image" src="https://github.com/user-attachments/assets/0a593066-9215-4752-8e8d-73e3957f1326" />

A tool for step-by-step Java execution traces, modified for CS2110 diagramming conventions (WIP). Adapted from the Java backend in [pathrise-python-tutor](https://github.com/pathrise-eng/pathrise-python-tutor), which is a fork of [Python Tutor](https://pythontutor.com) by Philip Guo. Accepts Java code via HTTP, and returns a JSON execution trace.

## Endpoints

```
GET /exec_java?user_script=<code>&options_json=<json>
GET /exec_java_jsonp?user_script=<code>&options_json=<json>&callback=<fn>
```

## Running with Docker

```bash
docker build -t java-tutor .
docker run -p 4003:4003 java-tutor
```

## Running locally

Requires Python 3, `bottle`, and a JDK.

```bash
pip install bottle
JAVA_JAIL_CP=./java_jail_cp python3 server.py
```

Server listens on port `3000` by default. Set the `PORT` environment variable to change it.
