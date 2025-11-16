// ==UserScript==
// @name         Barcode Drop Type Text
// @namespace    http://tampermonkey.net/
// @version      2025-11-14
// @description  try to take over the world!
// @author       You
// @match        *://*/*
// @exclude      https://www.barcodedrop.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @noframes
// @require      https://cdnjs.cloudflare.com/ajax/libs/reconnecting-websocket/1.0.0/reconnecting-websocket.min.js
// ==/UserScript==
(function () {
    "use strict";
    if (window.top !== window.self) {
        return; // prevent running in iframes
    }
    const USERNAME_KEY = "username";
    let USER = GM_getValue(USERNAME_KEY);
    if (!USER) {
        const username = prompt("Enter your BarcodeDrop username");
        if (username) {
            USER = username;
            GM_setValue(USERNAME_KEY, USER);
        }
        else {
            console.warn("No BarcodeDrop username provided; aborting script.");
            return;
        }
    }
    const WEBSOCKET_URL = "wss://api.barcodedrop.com/watch/" + USER;
    function isFormAssociatedElement(el) {
        return "form" in el;
    }
    function pageIsActive() {
        // document.hasFocus() -> tab is focused (not in background, not hidden
        // behind other window)
        // document.visibilityState === "visible" -> tab is not in a background
        // window
        return document.hasFocus() && document.visibilityState === "visible";
    }
    function submit(el) {
        // simulate Enter key events (for JS listeners)
        const down = new KeyboardEvent("keydown", {
            bubbles: true,
            cancelable: true,
            key: "Enter",
            code: "Enter",
        });
        el.dispatchEvent(down);
        const up = new KeyboardEvent("keyup", {
            bubbles: true,
            cancelable: true,
            key: "Enter",
            code: "Enter"
        });
        el.dispatchEvent(up);
        if (isFormAssociatedElement(el)) {
            const form = el.form;
            if (form) {
                try {
                    form.requestSubmit();
                }
                catch (e) {
                    form.dispatchEvent(new Event("submit", {
                        bubbles: true, cancelable: true
                    }));
                }
            }
        }
    }
    function setFrameworkAwareInputValue(el, value) {
        const proto = Object.getPrototypeOf(el);
        const desc = Object.getOwnPropertyDescriptor(proto, "value");
        if (desc && typeof desc.set === "function") {
            // use the native setter so React (and others) see it properly
            desc.set.call(el, value);
        }
        else {
            // fallback: direct assignment
            el.value = value;
        }
        // most frameworks (including Vue, Svelte, Angular, React) listen to
        // this
        el.dispatchEvent(new Event("input", { bubbles: true }));
    }
    /**
     * Appends a string to the active element and simulates pressing Enter.
     * Works whether or not the element is inside a form.
     */
    function appendToActiveElement(text) {
        const el = document.activeElement;
        console.log("appendToActiveElement: will try appending to:", el);
        // append text
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
            const newValue = el.value + text;
            setFrameworkAwareInputValue(el, newValue);
            console.log("appended to value:", el.value);
        }
        else if (el instanceof HTMLElement && el.isContentEditable) {
            el.insertAdjacentText("beforeend", text);
            el.dispatchEvent(new Event("input", { bubbles: true }));
        }
        else {
            console.warn("Active element is not editable:", el);
            return;
        }
        // just to be safe, wait until the next event loop in case this is
        // necessary for frameworks to process the input event until submitting
        setTimeout(() => {
            submit(el);
        }, 0);
    }
    function startWebSocket() {
        // https://github.com/joewalnes/reconnecting-websocket
        // https://cdnjs.com/libraries/reconnecting-websocket
        const socket = new ReconnectingWebSocket(WEBSOCKET_URL);
        socket.addEventListener("open", (event) => {
            console.log(`websocket open ${WEBSOCKET_URL}:`, event);
        });
        socket.addEventListener("connecting", (event) => {
            console.log(`websocket connecting ${WEBSOCKET_URL}:`, event);
        });
        socket.addEventListener("message", (event) => {
            console.log(`websocket message ${WEBSOCKET_URL}:`, event);
            if (!pageIsActive()) {
                console.log("ignoring socket message because page not active");
                return;
            }
            if (typeof event.data !== "string") {
                console.warn("ignoring non-string socket message");
                return;
            }
            try {
                const payload = JSON.parse(event.data);
                if (payload.type === "upsertScans" &&
                    payload.newScans.length > 0) {
                    const barcode = payload.newScans[0].barcode;
                    console.log("BARCODE:", barcode);
                    appendToActiveElement(barcode);
                }
            }
            catch (error) {
                console.error("error processing socket message:", error);
            }
        });
        socket.addEventListener("error", (error) => {
            console.warn(`websocket error ${WEBSOCKET_URL}:`, error);
        });
        socket.addEventListener("close", (event) => {
            console.log(`websocket close ${WEBSOCKET_URL}:`, event);
        });
    }
    // IGNORE eslint-disable-next-line no-debugger
    // debugger;
    startWebSocket();
})();
