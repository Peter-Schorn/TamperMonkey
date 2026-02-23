// ==UserScript==
// @name         grades old
// @namespace    http://tampermonkey.net/
// @version      2025-08-15
// @description  try to take over the world!
// @author       You
// @match        https://acconline.austincc.edu/ultra/courses/_945842_1/grades*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=austincc.edu
// @grant        none
// ==/UserScript==
(function () {
    "use strict";
    // MARK: Patch fetch to notify on completion
    const origFetch = window.fetch;
    window.fetch = async function (...args) {
        const response = await origFetch(...args);
        // console.log("Fetch completed:", args[0], response);
        window.dispatchEvent(new CustomEvent("network-request-complete", {
            detail: { url: args[0], response }
        }));
        return response;
    };
    // MARK: Patch XMLHttpRequest to notify on completion
    const origSend = XMLHttpRequest.prototype.send.bind(XMLHttpRequest.prototype);
    XMLHttpRequest.prototype.send = function (body) {
        this.addEventListener("loadend", () => {
            console.log("XHR completed:", this.responseURL, this.status);
            window.dispatchEvent(new CustomEvent("network-request-complete", {
                detail: { url: this.responseURL, status: this.status }
            }));
        });
        return origSend.call(this, body);
    };
    // only update table content if the row count changes
    // let tableRowCount = 0;
    let observer;
    function updateOverallGrade() {
        const overallGradeElement = document.querySelector(".grade-input-display");
        if (overallGradeElement) {
            console.log("found overallGradeElement:", overallGradeElement);
            const textElement = overallGradeElement.querySelector("bdi");
            if (textElement) {
                textElement.textContent = "87.34%";
            }
        }
    }
    function onDomChange() {
        console.log("onDomChange");
        updateOverallGrade();
        const table = document.getElementById("course-student-grades-sortable-table.:r2:");
        if (!table) {
            // console.log("no table found");
            return;
        }
        // console.log(`WILL update table content because row count changed ${oldTableRowCount} -> ${tableRowCount}`);
        // <tr class="MuiTableRowroot-0-2-479 makeStylestableRow-0-2-538" data-testid="course-student-grades-table-row-Competency 1 Assessment (Exam 1)">
        const exam1Row = table.querySelector('tr[data-testid="course-student-grades-table-row-Competency 1 Assessment (Exam 1)"]');
        if (exam1Row) {
            console.log("found exam1Row:", exam1Row);
            // aria-describedby=course-student-grades-header-grade
            const gradeCell = exam1Row.querySelector('td[aria-describedby="course-student-grades-header-grade"]');
            if (gradeCell) {
                console.log("found gradeCell:", gradeCell.outerHTML, gradeCell);
                const pill = gradeCell.querySelector(".big-pill");
                if (pill) {
                    console.log("found gradeCell.pill:", pill.outerHTML, pill);
                    pill.classList.remove("critical");
                    pill.classList.add("good");
                    const pillTextElement = pill.querySelector("div");
                    if (pillTextElement) {
                        console.log("found pillTextElement:", pillTextElement.textContent);
                        pillTextElement.textContent = "84%";
                    }
                }
            }
        }
        const examsAverage = table.querySelector('tr[data-testid="course-student-grades-table-row-Exams"]');
        if (examsAverage) {
            console.log("found exams average:", examsAverage);
            // aria-describedby=course-student-grades-header-grade
            const gradeCell = examsAverage.querySelector('td[aria-describedby="course-student-grades-header-grade"]');
            if (gradeCell) {
                console.log("found gradeCell:", gradeCell.outerHTML, gradeCell);
                const pill = gradeCell.querySelector(".big-pill");
                if (pill) {
                    console.log("found gradeCell.pill:", pill.outerHTML, pill);
                    pill.classList.remove("critical");
                    pill.classList.add("good");
                    const pillTextElement = pill.querySelector("div");
                    if (pillTextElement) {
                        console.log("found pillTextElement:", pillTextElement.textContent);
                        pillTextElement.textContent = "84%";
                    }
                }
            }
        }
        const assignmentsAverage = table.querySelector('tr[data-testid="course-student-grades-table-row-Assignments"]');
        if (assignmentsAverage) {
            console.log("found assignments average:", assignmentsAverage);
            // aria-describedby=course-student-grades-header-grade
            const gradeCell = assignmentsAverage.querySelector('td[aria-describedby="course-student-grades-header-grade"]');
            if (gradeCell) {
                console.log("found gradeCell:", gradeCell.outerHTML, gradeCell);
                const pill = gradeCell.querySelector(".big-pill");
                if (pill) {
                    console.log("found gradeCell.pill:", pill.outerHTML, pill);
                    pill.classList.remove("critical", "good");
                    pill.classList.add("excellent");
                    const pillTextElement = pill.querySelector("div");
                    if (pillTextElement) {
                        console.log("found pillTextElement:", pillTextElement.textContent);
                        pillTextElement.textContent = "96.4%";
                    }
                }
            }
        }
        const assignment4 = table.querySelector('tr[data-testid="course-student-grades-table-row-Assignment 4"]');
        if (assignment4) {
            console.log("found assignment 4:", assignment4);
            // item-description
            const descriptionElement = assignment4.querySelector('[data-testid="item-description"]');
            if (descriptionElement) {
                descriptionElement.textContent = "1 attempt submitted";
            }
            // aria-describedby=course-student-grades-header-grade
            const gradeCell = assignment4.querySelector('td[aria-describedby="course-student-grades-header-grade"]');
            if (gradeCell) {
                console.log("found gradeCell:", gradeCell.outerHTML, gradeCell);
                const pill = gradeCell.querySelector(".big-pill");
                if (pill) {
                    console.log("found gradeCell.pill:", pill.outerHTML, pill);
                    pill.classList.remove("critical", "good", "extremeFailing");
                    pill.classList.add("excellent");
                    const numeratorElement = gradeCell.querySelector(".js-pill-grade");
                    if (numeratorElement) {
                        numeratorElement.textContent = "92";
                    }
                }
            }
        }
    }
    // Create the observer
    // observer = new MutationObserver(onDomChange);
    // // Start observing the entire document
    // observer.observe(document, {
    //     childList: true,
    //     attributes: false,
    //     subtree: true,
    //     characterData: false
    // });
    window.addEventListener("network-request-complete", (event) => {
        onDomChange();
    });
})();
/*
for (const element of elements) {
    console.log("changing:", element);
    element.classList.add("green")
    element.querySelector(".js-pill-grade").textContent = "91";
    element.classList.remove("red")
}
*/
