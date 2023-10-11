var SDK3DVerse
var initialized = false

export function init(sdk) {
    SDK3DVerse = sdk
    initialized = true;
}

export function onMouseDown(x, y) {
    if (!initialized) return;
}