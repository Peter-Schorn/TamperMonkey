// ==UserScript==
// @name         grades web prog
// @namespace    http://tampermonkey.net/
// @version      2025-08-15
// @description  try to take over the world!
// @author       You
// @match        https://acconline.austincc.edu/ultra/courses/_949284_1/grades*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=austincc.edu
// @grant        none
// ==/UserScript==
(function () {
    "use strict";
    // MARK: Patch fetch to notify on completion
    const origFetch = window.fetch;
    window.fetch = async function (...args) {
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
    XMLHttpRequest.prototype.send = function (body) {
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
    function onDomChange() {
        console.log("onDomChange");
        // MARK: Fix Overall Grade
        const overallGradeElement = document.querySelector(".final-grade");
        const webProgOverallGradePillColorDiv = overallGradeElement.querySelector(".customGradePill");
        const webProgOverallGradeText = webProgOverallGradePillColorDiv.querySelector("bdi");
        webProgOverallGradeText.textContent = "93.21%";
        webProgOverallGradePillColorDiv.classList.remove("failing");
        webProgOverallGradePillColorDiv.classList.add("excellent");
        // MARK: Grades Table
        const gradesTable = document.querySelector("course-student-grades#student-tab-panel-grades table");
        const tableBody = gradesTable.querySelector("tbody");
        const rows = tableBody.querySelectorAll("tr");
        for (const row of rows) {
            try {
                const titleContainer = row.querySelector("#course-student-grades-item-name-_6240781_1");
                if (titleContainer) {
                    console.log("found exam 2:", row);
                    // MARK: Fix Exam 2 Grade
                    const gradeCell = row.querySelector('[aria-describedby="course-student-grades-header-grade"]');
                    const gradePill = gradeCell.querySelector(".customGradePill");
                    const gradeTextElement = gradePill.querySelector(".js-pill-grade");
                    gradeTextElement.textContent = "23";
                    gradePill.classList.remove("extremeFailing");
                    gradePill.classList.add("excellent");
                    // MARK: Fix Exam 2 Feedback Icon
                    const feedbackIcon = gradeCell.querySelector("svg");
                    feedbackIcon?.remove();
                    // MARK: Fix Exam 2 Status
                    const statusCell = row.querySelector('[aria-describedby="course-student-grades-header-status"]');
                    const statusCellTextElement = statusCell.querySelector("span");
                    statusCellTextElement.textContent = "Graded";
                }
            }
            catch (error) {
                console.error("error processing row:", error);
            }
        }
    }
    window.addEventListener("network-request-complete", (event) => {
        onDomChange();
    });
    // @ts-ignore
    window.monkey = onDomChange;
})();
