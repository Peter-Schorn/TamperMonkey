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
// @grant        GM_deleteValue
// @grant        GM_addValueChangeListener
// @grant        GM_registerMenuCommand
// @grant        unsafeWindow
// @noframes
// @require      https://cdnjs.cloudflare.com/ajax/libs/reconnecting-websocket/1.0.0/reconnecting-websocket.min.js
// ==/UserScript==
(function () {
    "use strict";
    if (window.top !== window.self) {
        return; // prevent running in iframes
    }
    // MARK: User Configuration
    /**
     * The key used to store the username in Tampermonkey's storage.
     */
    const USERNAME_KEY = "username";
    let USER = GM_getValue(USERNAME_KEY, null);
    function configureUsername() {
        const username = prompt("Enter your BarcodeDrop username");
        if (username) {
            console.log(`received username: "${username}"`);
            USER = username;
            GM_setValue(USERNAME_KEY, USER);
        }
        else {
            console.log("no username entered");
            GM_deleteValue(USERNAME_KEY);
        }
    }
    if (!USER) {
        configureUsername();
    }
    GM_registerMenuCommand("Configure User", (event) => {
        configureUsername();
        if (USER && pageIsActive()) {
            abortController?.abort();
            // restart the web socket connection with the new username
            startWebSocket();
        }
    }, {
        accessKey: "u",
        autoClose: true,
    });
    // MARK: Variables
    const RECENT_BARCODES_KEY = "recentBarcodes";
    const TIME_TO_LIVE_MS = 30000; // 30 seconds
    let abortController = null;
    let websocket = null;
    /**
     * Timestamp when the latest WebSocket connection attempt started.
     *
     * When the page becomes visible we start the WebSocket connection and
     * simultaneously fetch the latest barcode. The fetch covers the gap while
     * the socket is still connecting, during which scans could otherwise be
     * missed.
     *
     * A fetched barcode is accepted only if:
     *
     * `scanned_at > startConnectionAttemptDate - tolerance`
     *
     * The tolerance allows scans that occurred shortly before this attempt
     * while preventing older scans from being inserted.
     */
    let startConnectionAttemptDate = null;
    /**
     * Tries to use the given barcode. Returns true if the barcode was not used
     * in the last TIME_TO_LIVE_MS milliseconds and marks the barcode as used;
     * returns false if the barcode was already used in the last TIME_TO_LIVE_MS
     * milliseconds.
     *
     * This is used to prevent duplicate barcodes from being typed into the
     * active element if they are received multiple times from the web socket or
     * from the fetch request for the latest barcode.
     */
    function tryUseBarcodeID(barcodeID) {
        const now = Date.now();
        const store = GM_getValue(RECENT_BARCODES_KEY, {});
        /**
         * Whether the store was changed by removing old entries.
         */
        let changed = false;
        // remove entries that are older than TIME_TO_LIVE_MS to prevent the
        // store from growing indefinitely
        for (const id in store) {
            if (now - store[id] > TIME_TO_LIVE_MS) {
                delete store[id];
                changed = true;
            }
        }
        if (barcodeID in store) {
            if (changed) {
                // only update the store if we actually removed old entries to
                // avoid unnecessary writes
                GM_setValue(RECENT_BARCODES_KEY, store);
            }
            return false;
        }
        store[barcodeID] = now;
        GM_setValue(RECENT_BARCODES_KEY, store);
        return true;
    }
    /**
     * A reviver function for parsing JSON data representing scanned barcodes(s).
     *
     * Converts the value for the `scanned_at` key to a `Date` object.
     *
     * @param key the key in the JSON data
     * @param value the value for the specified key in the JSON data
     * @returns the value converted to a `Date` object if the key is `scanned_at`;
     * otherwise, the original value
     */
    function scannedBarcodesReviver(key, value) {
        if (key === "scanned_at" && typeof value === "string") {
            return new Date(value);
        }
        return value;
    }
    function isFormAssociatedElement(element) {
        return "form" in element;
    }
    function pageIsActive() {
        // document.hasFocus() -> tab is focused (not in background, not hidden
        // behind other window)
        // document.visibilityState === "visible" -> tab is visible
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
        try {
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
                // recursively check children of the element for editable
                // elements
                for (const child of element.children) {
                    if (appendToElement(child, text)) {
                        return true;
                    }
                }
                // check shadow DOM if present
                if (element.shadowRoot) {
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
            // necessary for frameworks to process the input event until
            // submitting
            setTimeout(() => {
                submit(element);
            }, 0);
            return true;
        }
        catch (error) {
            console.error("error appending to element:", error);
            return false;
        }
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
                const scan = payload.newScans[0];
                const barcode = scan.barcode;
                if (!tryUseBarcodeID(scan.id)) {
                    console.log(`already used barcode "${barcode}"`);
                    return;
                }
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
        stopWebSocket();
        startConnectionAttemptDate = new Date();
        const WEBSOCKET_URL = "wss://api.barcodedrop.com/watch/" + USER;
        // https://github.com/joewalnes/reconnecting-websocket
        // https://cdnjs.com/libraries/reconnecting-websocket
        websocket = new ReconnectingWebSocket(WEBSOCKET_URL, [], {
            automaticOpen: false
        });
        // DEBUG: delay opening the web socket to simulate a slow connection and
        // test the fetchLatestBarcode fallback
        // setTimeout(() => {
        websocket.open();
        // }, 2_000);
        websocket.addEventListener("open", (event) => {
            console.log(`websocket open ${WEBSOCKET_URL}:`, event);
            startConnectionAttemptDate = null;
            // abort the fetch for the latest barcode if it's still ongoing
            abortController?.abort();
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
        startConnectionAttemptDate = null;
    }
    // MARK: Get Latest Barcode
    /**
     * Fetch the most recently scanned barcode for the current user from the
     * BarcodeDrop API.
     *
     * This request acts as a fallback while the WebSocket connection is being
     * established. Because the connection may take some time, a barcode scanned
     * during that window might not yet be delivered through the socket.
     * Fetching the latest scan helps avoid missing that event.
     *
     * The fetched barcode is only used if:
     *
     * `scanned_at >= startConnectionAttemptDate - tolerance`
     *
     * This allows scans that occurred shortly before the connection attempt
     * while filtering out older scans that should not be applied to this page.
     * Duplicate insertions across tabs are prevented by `tryUseBarcode`.
     */
    function fetchLatestBarcode() {
        void (async () => {
            try {
                console.log("fetching latest barcode");
                abortController = new AbortController();
                // TODO: Implement limit on server
                const url = `https://api.barcodedrop.com/scans/${USER}?limit=1`;
                const response = await fetch(url, {
                    signal: abortController.signal
                });
                if (!response.ok) {
                    const responseBody = await response.text();
                    console.error(`Failed to fetch latest barcode: ${response.status} ` +
                        `${response.statusText}: ${responseBody}`);
                    return;
                }
                // const data = await response.json() as ScannedBarcodesResponse;
                const data = await response.text();
                const barcodes = JSON.parse(data, scannedBarcodesReviver);
                if (!startConnectionAttemptDate) {
                    // the web socket connection has already been established,
                    // so we can ignore the result of this fetch request
                    console.log("ignoring fetched barcodes because web socket " +
                        "connection already established");
                    return;
                }
                if (!pageIsActive()) {
                    console.log("ignoring fetched barcodes because page not active");
                    return;
                }
                if (barcodes.length === 0) {
                    console.log("no barcodes found for user");
                    return;
                }
                const latestBarcode = barcodes[0];
                console.log("latest barcode from fetch:", latestBarcode);
                const toleranceMS = 5000; // 5 seconds
                // the date of the connection attempt minus the tolerance;
                const cutoffTime = startConnectionAttemptDate.getTime()
                    - toleranceMS;
                const scanDate = latestBarcode.scanned_at;
                // if the latest barcode was scanned toleranceMS or less before
                // the connection attempt, then we append it to the active
                // element
                if (scanDate.getTime() >= cutoffTime) {
                    console.log("latest barcode was scanned within tolerance; " +
                        "appending to active element");
                    if (!tryUseBarcodeID(latestBarcode.id)) {
                        console.log("already seen barcode " +
                            `"${latestBarcode.barcode}"; not appending again`);
                        return;
                    }
                    appendToActiveElement(latestBarcode.barcode);
                }
                else {
                    console.log(`latest barcode "${latestBarcode.barcode}" scanned ` +
                        `at ${latestBarcode.scanned_at} is before cutoff of ` +
                        `${new Date(cutoffTime)}; not appending`);
                }
            }
            catch (error) {
                if (error instanceof DOMException &&
                    error.name === "AbortError") {
                    console.log("fetch aborted");
                }
                else {
                    console.error("Error fetching latest barcode:", error);
                }
            }
        })();
    }
    function onPageVisible() {
        console.log("onPageVisible");
        if (!USER) {
            console.warn("no BarcodeDrop username provided; not starting web socket " +
                "or fetching latest barcode");
            return;
        }
        fetchLatestBarcode();
        startWebSocket();
    }
    function onPageHidden() {
        console.log("onPageHidden");
        abortController?.abort();
        stopWebSocket();
    }
    GM_addValueChangeListener(USERNAME_KEY, (_name, oldValue, newValue, remote) => {
        if (USER === newValue) {
            // if the value didn't actually change, do nothing
            return;
        }
        console.log(`username changed from "${oldValue}" to "${newValue}" ` +
            `(remote: ${remote})`);
        USER = newValue;
        abortController?.abort();
        stopWebSocket();
        if (USER && pageIsActive()) {
            startWebSocket();
        }
    });
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
            console.log("page became visible; starting websocket");
            onPageVisible();
        }
        else {
            console.log("page became hidden; stopping websocket");
            onPageHidden();
        }
    });
    if (document.visibilityState === "visible") {
        onPageVisible();
    }
})();
