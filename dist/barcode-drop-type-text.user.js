// ==UserScript==
// @name         Barcode Drop Type Text
// @namespace    http://tampermonkey.net/
// @version      2025-11-14
// @description  automatically types barcodes from BarcodeDrop into the active
//               input field
// @author       Peter Schorn
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
    // MARK: Get Username
    const USERNAME_KEY = "username";
    let USER = GM_getValue(USERNAME_KEY);
    if (!USER) {
        const username = prompt("Enter your BarcodeDrop username");
        if (username) {
            USER = username;
            GM_setValue(USERNAME_KEY, USER);
        }
        else {
            console.warn("no BarcodeDrop username provided; aborting script.");
            return;
        }
    }
    // MARK: Constants
    const WEBSOCKET_URL = "wss://api.barcodedrop.com/watch/" + USER;
    let websocket = null;
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
    function typeEnterKey(element) {
        // simulate Enter key events (for JS listeners)
        const down = new KeyboardEvent("keydown", {
            bubbles: true,
            cancelable: true,
            key: "Enter",
            code: "Enter",
            keyCode: 13,
            which: 13
        });
        element.dispatchEvent(down);
        const up = new KeyboardEvent("keyup", {
            bubbles: true,
            cancelable: true,
            key: "Enter",
            code: "Enter",
            keyCode: 13,
            which: 13
        });
        element.dispatchEvent(up);
        console.log("submit with enter key for element:", element);
    }
    function submit(element) {
        typeEnterKey(element);
        if (isFormAssociatedElement(element)) {
            const form = element.form;
            if (form) {
                try {
                    form.requestSubmit();
                }
                catch (e) {
                    form.dispatchEvent(new Event("submit", {
                        bubbles: true, cancelable: true
                    }));
                }
                console.log("submit on associated form:", form);
            }
        }
    }
    function setFrameworkAwareInputValue(element, value) {
        const proto = Object.getPrototypeOf(element);
        const desc = Object.getOwnPropertyDescriptor(proto, "value");
        if (desc && typeof desc.set === "function") {
            // use the native setter so React (and others) see it properly
            desc.set.call(element, value);
        }
        else {
            // fallback: direct assignment
            element.value = value;
        }
        // most frameworks (including Vue, Svelte, Angular, React) listen to
        // this
        element.dispatchEvent(new Event("input", { bubbles: true }));
    }
    function appendToElement(element, text) {
        if (element instanceof HTMLInputElement ||
            element instanceof HTMLTextAreaElement) {
            console.log("will append to element:", element.outerHTML, element);
            console.log("previous value:", element.value);
            const newValue = element.value + text;
            setFrameworkAwareInputValue(element, newValue);
            console.log("appended to value:", element.value);
        }
        else if (element instanceof HTMLElement &&
            element.isContentEditable) {
            console.log("will append to element:", element.outerHTML, element);
            console.log("previous contentEditable:", element.innerText);
            element.insertAdjacentText("beforeend", text);
            console.log("appended to contentEditable:", element.innerText);
            element.dispatchEvent(new Event("input", { bubbles: true }));
        }
        else {
            console.warn("element is not editable:", element);
            // recursively check children of the element for editable elements
            for (const child of element.children) {
                if (appendToElement(child, text)) {
                    return true;
                }
            }
            // check shadow DOM if present
            if (element instanceof HTMLElement && element.shadowRoot) {
                console.log("checking shadow root for editable elements");
                for (const child of element.shadowRoot.children) {
                    if (appendToElement(child, text)) {
                        return true;
                    }
                }
            }
            return false;
        }
        // just to be safe, wait until the next event loop in case this is
        // necessary for frameworks to process the input event until submitting
        setTimeout(() => {
            submit(element);
        }, 0);
        return true;
    }
    /**
     * Appends a string to the active element and simulates pressing Enter.
     * Works whether or not the element is inside a form.
     */
    function appendToActiveElement(text) {
        const element = document.activeElement;
        if (!element) {
            console.warn("no active element to append text to.");
            return;
        }
        if ([
            document.body,
            document.documentElement
        ].includes(element)) {
            // do not recurse through the entire document
            console.warn("active element is body or documentElement; not appending.");
            return;
        }
        console.log("appendToActiveElement: will try appending to:", element);
        appendToElement(element, text);
    }
    function receiveSocketMessage(message) {
        if (!pageIsActive()) {
            console.log("ignoring socket message because page not active");
            return;
        }
        if (typeof message.data !== "string") {
            console.warn("ignoring non-string socket message");
            return;
        }
        try {
            const payload = JSON.parse(message.data);
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
    }
    // MARK: Web Socket
    function startWebSocket() {
        // https://github.com/joewalnes/reconnecting-websocket
        // https://cdnjs.com/libraries/reconnecting-websocket
        websocket = new ReconnectingWebSocket(WEBSOCKET_URL);
        websocket.addEventListener("open", (event) => {
            console.log(`websocket open ${WEBSOCKET_URL}:`, event);
        });
        websocket.addEventListener("connecting", (event) => {
            console.log(`websocket connecting ${WEBSOCKET_URL}:`, event);
        });
        websocket.addEventListener("message", (event) => {
            console.log(`websocket message ${WEBSOCKET_URL}:`, event);
            receiveSocketMessage(event);
        });
        websocket.addEventListener("error", (error) => {
            console.warn(`websocket error ${WEBSOCKET_URL}:`, error);
        });
        websocket.addEventListener("close", (event) => {
            console.log(`websocket close ${WEBSOCKET_URL}:`, event);
        });
    }
    function stopWebSocket() {
        if (websocket) {
            websocket.close();
            websocket = null;
        }
    }
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
            console.log("page became visible; starting websocket");
            startWebSocket();
        }
        else {
            console.log("page became hidden; stopping websocket");
            stopWebSocket();
        }
    });
    if (document.visibilityState === "visible") {
        // start the web socket if the document is visible
        startWebSocket();
    }
})();
