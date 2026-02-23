// ==UserScript==
// @name         Transcript
// @namespace    http://tampermonkey.net/
// @version      2025-12-27
// @description  try to take over the world!
// @author       You
// @match        https://selfservice.austincc.edu/Student/Student/Grades
// @icon         https://www.google.com/s2/favicons?sz=64&domain=austincc.edu
// @grant        none
// ==/UserScript==

((): void => {
    "use strict";

    // MARK: Patch fetch to notify on completion
    const origFetch = window.fetch;
    window.fetch = async function (...args): Promise<Response> {
        const response = await origFetch(...args);
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent("network-request-complete", {
                detail: { url: args[0], response }
            }));
        }, 0);
        return response;
    };

    // MARK: Patch XMLHttpRequest to notify on completion
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const origSend = XMLHttpRequest.prototype.send;


    XMLHttpRequest.prototype.send = function (
        this: XMLHttpRequest,
        body?: Document | XMLHttpRequestBodyInit | null
    ): void {
        this.addEventListener("loadend", () => {
            console.log("XHR completed:", this.responseURL, this.status);

            setTimeout(() => {
                window.dispatchEvent(new CustomEvent("network-request-complete", {
                    detail: { url: this.responseURL, status: this.status }
                }));
            }, 0);
        });
        return origSend.call(this, body);
    };



    function updateTranscript(): void {
        console.log("update Transcript");

        try {
            const termGradeElement = document.getElementById("Print_Credit Fall 2025")!;

            const subtitleWrapper = termGradeElement.querySelector(
                ".esg-collapsible-group__title .esg-collapsible-group-subtitle__wrapper"
            )!;

            console.log("subtitleWrapper:", subtitleWrapper);

            const gpaDiv = subtitleWrapper.querySelector<HTMLElement>(
                ".esg-collapsible-group__subtitle"
            )!;

            gpaDiv.innerText = "Term GPA:  4.000";


            const table = termGradeElement.querySelector("table")!;
            const tbody = table.querySelector("tbody")!;

            for (const row of table.rows) {
                // do something with each row

                const cells = row.cells;

                const titleCell = cells[1];

                console.log("titleCell:", titleCell?.innerText);

                if (titleCell?.innerText.includes("Beg Web Progr")) {
                    console.log("correct row:", row);
                    const gradeCell = cells[3]!;
                    console.log("grade cell:", gradeCell);
                    gradeCell.innerText = "A";
                }
            }

        } catch (error) {
            console.error("Error updating Transcript:", error);
        }
    }

    updateTranscript();


    // @ts-ignore
    window.updateTranscript = updateTranscript;


    window.addEventListener("network-request-complete", (event) => {
        updateTranscript();
    });
})();
