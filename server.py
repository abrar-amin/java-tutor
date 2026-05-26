"""
Standalone Java execution backend for Python Tutor / CS2110.

Accepts Java code via GET requests, runs it through traceprinter.InMemory,
and returns a step-by-step execution trace as JSON or JSONP.

Usage:
    python server.py

Endpoints:
    GET /exec_java?user_script=<code>&options_json=<json>
    GET /exec_java_jsonp?user_script=<code>&options_json=<json>&callback=<fn>

Environment variables:
    JAVA_JAIL_CP  - path to the compiled java_jail/cp directory
                    (default: ../pathrise-python-tutor/v4-cokapi/backends/java/java_jail/cp)
    PORT          - port to listen on (default: 3000)
"""

import os
import json
import subprocess
from bottle import route, request, response, run

HERE = os.path.dirname(os.path.abspath(__file__))

JAVA_JAIL_CP = os.environ.get(
    "JAVA_JAIL_CP",
    os.path.join(HERE, "java_jail_cp")
)
JAVA_JAIL_CP = os.path.realpath(JAVA_JAIL_CP)

CLASSPATH = ":".join([
    JAVA_JAIL_CP,
    os.path.join(JAVA_JAIL_CP, "javax.json-1.0.jar"),
    os.path.join(JAVA_JAIL_CP, "visualizer-stdlib"),
])

TIMEOUT_SECS = 15


def run_java(user_script, options_json_str):
    options = {}
    try:
        options = json.loads(options_json_str or "{}")
    except Exception:
        pass

    input_obj = {
        "usercode": user_script,
        "options": {},
        "args": [],
        "stdin": "",
    }
    # In Java, String is always a reference type (heap object), never a stack primitive
    input_obj["options"]["showStringsAsValues"] = False

    try:
        result = subprocess.run(
            ["java", "-cp", CLASSPATH, "traceprinter.InMemory"],
            input=json.dumps(input_obj),
            capture_output=True,
            text=True,
            timeout=TIMEOUT_SECS,
        )
        return result.stdout
    except subprocess.TimeoutExpired:
        err = {"code": "", "trace": [{"event": "uncaught_exception",
               "exception_msg": f"Error: Your code ran for more than {TIMEOUT_SECS} seconds. It may have an INFINITE LOOP."}]}
        return json.dumps(err)
    except Exception as e:
        err = {"code": "", "trace": [{"event": "uncaught_exception",
               "exception_msg": f"Server error: {e}"}]}
        return json.dumps(err)


@route("/exec_java")
def exec_java():
    response.set_header("Access-Control-Allow-Origin", "*")
    response.content_type = "application/json"
    return run_java(request.query.user_script, request.query.options_json)


@route("/exec_java_jsonp")
def exec_java_jsonp():
    response.set_header("Access-Control-Allow-Origin", "*")
    callback = request.query.callback or "callback"
    trace_json = run_java(request.query.user_script, request.query.options_json)
    response.content_type = "application/javascript"
    return f"{callback}({trace_json});"


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 4003))
    print(f"Java backend listening on http://localhost:{port}")
    print(f"Using classpath: {JAVA_JAIL_CP}")
    run(host="0.0.0.0", port=port, reloader=False)
