const BACKEND_URL = window.BACKEND_URL ?? "http://localhost:4003";

let trace = [];
let currentStep = 0;

function drawArrows() {
    const svg = document.getElementById("arrows");
    [...svg.children].forEach(c => { if (c.tagName !== "defs") c.remove(); });

    const vizRect = document.getElementById("diagram").getBoundingClientRect();

    document.querySelectorAll("[data-ref-id]").forEach(valBox => {
        const heapObj = document.querySelector(`[data-heap-id="${valBox.dataset.refId}"]`);
        if (!heapObj) return;

        const from = valBox.getBoundingClientRect();
        const to   = heapObj.getBoundingClientRect();

        const x1 = from.left + from.width / 2 - vizRect.left;
        const y1 = from.top  + from.height / 2 - vizRect.top;
        const x2 = to.left   - vizRect.left;
        const y2 = to.top    + to.height / 2 - vizRect.top;

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", `M ${x1} ${y1} L ${x2} ${y2}`);
        path.setAttribute("stroke", "black");
        path.setAttribute("stroke-width", "2");
        path.setAttribute("fill", "none");
        path.setAttribute("marker-end", "url(#arrowhead)");
        svg.appendChild(path);
    });
}

function renderStep(i) {
    const step = trace[i];
const stack_record = [...step['stack_to_render']].reverse();
    const heap = step['heap'];

    const containerEl = document.getElementById("stack-container");
    const heapEl = document.getElementById("heap-container");
    containerEl.innerHTML = "";
    heapEl.innerHTML = "";


    for (const [key, value] of Object.entries(heap)) {
        const entry = document.createElement("div");
        entry.className = "heap-entry";

        const typeLabel = document.createElement("div");
        typeLabel.className = "heap-type";
        const rawTypeName = String(value[1] ?? value[0]);
        typeLabel.textContent = rawTypeName.includes(".") ? rawTypeName.split(".").pop() : rawTypeName;

        const heapObj = document.createElement("div");
        heapObj.className = "heap-object";
        heapObj.dataset.heapId = String(key);

        if (value[0] === "LIST") {
            const row = document.createElement("div");
            row.className = "array-row";
            if (value.length === 1) {
                const empty = document.createElement("div");
                empty.className = "array-empty";
                empty.textContent = "empty";
                row.appendChild(empty);
            } else {
                for (let j = 1; j < value.length; j++) {
                    const cell = document.createElement("div");
                    cell.className = "array-cell";
                    cell.textContent = Array.isArray(value[j]) ? value[j][value[j].length - 1] : value[j];
                    row.appendChild(cell);
                }
            }
            heapObj.appendChild(row);
        } else if (value[0] === "HEAP_PRIMITIVE") {
            const val = document.createElement("div");
            const isString = (value[1] ?? "").includes("String");
            val.textContent = isString ? `"${value[2]}"` : value[2];
            heapObj.appendChild(val);
        } else if (value[0] === "INSTANCE") {
            for (let j = 2; j < value.length; j++) {
                const field = document.createElement("div");
                field.className = "var-row";
                const nameEl = document.createElement("span");
                nameEl.className = "var-label";
                nameEl.textContent = value[j][0];
                const valBox = document.createElement("div");
                valBox.className = "var-value-box";
                const fieldVal = value[j][1];
                if (Array.isArray(fieldVal) && fieldVal[0] === "REF") {
                    valBox.dataset.refId = String(fieldVal[1]);
                } else {
                    valBox.textContent = Array.isArray(fieldVal) ? fieldVal[fieldVal.length - 1] : fieldVal;
                }
                field.appendChild(nameEl);
                field.appendChild(valBox);
                heapObj.appendChild(field);
            }
        }

        entry.appendChild(typeLabel);
        entry.appendChild(heapObj);
        heapEl.appendChild(entry);
    }

    for (const frame of stack_record) {
        const stackRow = document.createElement("div");
        stackRow.className = "stack-row";

        const method_name_box = document.createElement("div");
        method_name_box.className = "side-text";
        const rawName = frame['func_name'].split(":")[0];
        const simpleName = rawName.split(".").pop().split("$").pop();
        method_name_box.textContent = simpleName + "()";

        const stackFrame = document.createElement("div");
        stackFrame.className = "inner-box";

        const locals = frame['encoded_locals'] ?? {};
        const localTypes = frame['local_types'] ?? {};
        const isConstructor = frame['is_constructor'] ?? false;
        const varNames = (frame['ordered_varnames'] ?? Object.keys(locals))
            .filter(n => isConstructor ? n === "this" : n !== "this");
        for (const name of varNames) {
            const row = document.createElement("div");
            row.className = "var-row";

            const label = document.createElement("span");
            label.className = "var-label";
            const val = locals[name];
            let rawType = localTypes[name] ?? (Array.isArray(val) ? val[0] : typeof val);
            if (rawType === "REF" && Array.isArray(val) && val[0] === "REF") {
                const heapObj = heap[String(val[1])];
                if (heapObj) rawType = String(heapObj[1] ?? heapObj[0]);
            }
            const type = rawType.split(".").pop().split("$").pop();
            label.textContent = `${name} : ${type}`;

            const valBox = document.createElement("div");
            valBox.className = "var-value-box";
            if (Array.isArray(val) && val[0] === "REF") {
                valBox.textContent = "";
                valBox.dataset.refId = String(val[1]);
            } else {
                valBox.textContent = Array.isArray(val) ? val[val.length - 1] : val;
            }

            row.appendChild(label);
            row.appendChild(valBox);
            stackFrame.appendChild(row);
        }

        stackRow.appendChild(method_name_box);
        stackRow.appendChild(stackFrame);
        containerEl.appendChild(stackRow);
    }


    document.getElementById("stdout-output").textContent = step['stdout'] ?? "";

    drawArrows();

    currentStep = i;
    document.getElementById("step-counter").textContent = `Step ${i + 1} / ${trace.length} (${step['event']})`;
    document.getElementById("btn-prev").disabled = i === 0;
    document.getElementById("btn-next").disabled = i === trace.length - 1;
}

function step(dir) {
    const next = currentStep + dir;
    if (next >= 0 && next < trace.length) renderStep(next);
}

async function run() {
    const code = document.getElementById("code-input").value.trim();
    if (!code) return;

    try {
        const params = new URLSearchParams({
            user_script: code,
            options_json: JSON.stringify({ cumulative_mode: false, heap_primitives: false }),
        });
        const res = await fetch(`${BACKEND_URL}/exec_java?` + params);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        trace = data['trace'].filter(s => s['event'] !== 'return' && s['event'] !== 'call');
        let lastNonEmptyStackDepth = 0;
        trace = trace.filter(s => {
            const heapSize = Object.keys(s['heap']).length;
            const stackDepth = s['stack_to_render'].length;
            if (heapSize > 0) {
                lastNonEmptyStackDepth = stackDepth;
                return true;
            }
            return lastNonEmptyStackDepth <= stackDepth;
        });
        currentStep = 0;

        document.getElementById("btn-prev").disabled = true;
        document.getElementById("btn-next").disabled = trace.length <= 1;

        renderStep(0);
    } catch (e) {
        console.error(e);
    }
}
