"use strict";
const origFetch = window.fetch;
window.fetch = async function (...args) {
    const response = await origFetch(...args);
    // notify on fetch completion
    console.log("Fetch completed:", args[0], response);
    // fire custom event if needed
    window.dispatchEvent(new CustomEvent("tm_fetch_complete", {
        detail: { url: args[0], response }
    }));
    return response;
};
// window.updateUserMessages = (): void => {
// };
