// ==UserScript==
// @name         grades overview
// @namespace    http://tampermonkey.net/
// @version      2025-08-15
// @description  try to take over the world!
// @author       You
// @match        https://acconline.austincc.edu/ultra*
// @grant        none
// ==/UserScript==

(function (): void {
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
        this.addEventListener("loadend", (event) => {
            console.log("XHR completed:", this.responseURL, this.status);

            setTimeout(() => {
                window.dispatchEvent(new CustomEvent("network-request-complete", {
                    detail: { url: this.responseURL, status: this.status }
                }));
            }, 0);
        });
        return origSend.call(this, body);
    };


    /** https://acconline.austincc.edu/ultra/grades */
    function updateOverallGrades(): void {
        try {
            // high grade color class: excellent

            const overallGradePillSelector =
                'bb-display-grade-pill[grade="baseGradesStudent.externalGrade"]';

            // .grades-list.current-term

            const gradesContainer = document.querySelector(
                ".grades-list.current-term"
            )!;

            // MARK: Beginning Web Programming: Overall Grade

            const webProgCard = gradesContainer.querySelector("#card__949284_1")!;

            // fix overall grade
            const webProgOverallGradePill = webProgCard.querySelector(
                overallGradePillSelector
            )!;

            const webProgOverallGradePillColorDiv = webProgOverallGradePill.querySelector(
                ".customGradePill"
            )!;

            const webProgOverallGradeText = webProgOverallGradePillColorDiv.querySelector(
                "bdi"
            )!;

            webProgOverallGradeText.textContent = "93.21%";

            webProgOverallGradePillColorDiv.classList.remove("failing");
            webProgOverallGradePillColorDiv.classList.add("excellent");

            // MARK: Beginning Web Programming: Fix Exam 2

            const webProgAssessments = webProgCard.querySelectorAll("bb-student-column");

            for (const assessment of webProgAssessments) {
                try {
                    const titleContainer = assessment.querySelector<HTMLElement>(
                        ".element-details"
                    );
                    if (!titleContainer) {
                        continue;
                    }
                    const titleText = titleContainer.innerText;
                    if (titleText.includes("Exam 2")) {
                        console.log("found Exam 2 assessment:", assessment);

                        const gradePill = assessment.querySelector(
                            "bb-display-grade-pill"
                        )!;

                        const gradePillColorDiv = gradePill.querySelector(
                            ".customGradePill"
                        )!;

                        const gradeTextElement = gradePillColorDiv.querySelector(
                            "bdi"
                        )!;

                        gradeTextElement.textContent = "23 / 25";
                        gradePillColorDiv.classList.remove("extremeFailing");
                        gradePillColorDiv.classList.add("excellent");

                    }
                } catch (error) {
                    console.error(
                        "updateOverallGrades: error processing assessment:", error
                    );
                }
            }


        } catch (error) {
            console.error("updateOverallGrades error:", error);
        }
    }

    function updateWebProgGrades(): void {
        try {
            // MARK: Fix Overall Grade

            const overallGradeElement = document.querySelector(".final-grade")!;

            const webProgOverallGradePillColorDiv = overallGradeElement.querySelector(
                ".customGradePill"
            )!;

            const webProgOverallGradeText = webProgOverallGradePillColorDiv.querySelector(
                "bdi"
            )!;

            webProgOverallGradeText.textContent = "93.21%";

            webProgOverallGradePillColorDiv.classList.remove("failing");
            webProgOverallGradePillColorDiv.classList.add("excellent");


            // MARK: Grades Table

            const gradesTable = document.querySelector(
                "course-student-grades#student-tab-panel-grades table"
            )!;

            const tableBody = gradesTable.querySelector("tbody")!;
            const rows = tableBody.querySelectorAll("tr");

            for (const row of rows) {
                try {
                    const titleContainer = row.querySelector(
                        "#course-student-grades-item-name-_6240781_1"
                    );

                    if (titleContainer) {
                        console.log("found exam 2:", row);

                        // MARK: Fix Exam 2 Grade

                        const gradeCell = row.querySelector(
                            '[aria-describedby="course-student-grades-header-grade"]'
                        )!;

                        const gradePill = gradeCell.querySelector(
                            ".customGradePill"
                        )!;

                        const gradeTextElement = gradePill.querySelector(
                            ".js-pill-grade"
                        )!;

                        gradeTextElement.textContent = "23";
                        gradePill.classList.remove("extremeFailing");
                        gradePill.classList.add("excellent");

                        // MARK: Fix Exam 2 Feedback Icon
                        const feedbackIcon = gradeCell.querySelector(
                            "svg"
                        );
                        feedbackIcon?.remove();

                        // MARK: Fix Exam 2 Status
                        const statusCell = row.querySelector(
                            '[aria-describedby="course-student-grades-header-status"]'
                        )!;

                        const statusCellTextElement = statusCell.querySelector(
                            "span"
                        )!;

                        statusCellTextElement.textContent = "Graded";

                    }

                }
                catch (error) {
                    console.error("error processing row:", error);
                }
            }
        } catch (error) {
            console.error("updateWebProgGrades error:", error);
        }
    }

    function onDomChange(): void {

        console.log("onDomChange");

        const urlPath = window.location.pathname;

        if (urlPath === "/ultra/grades") {
            console.log("grades overview page detected");
            updateOverallGrades();
        }
        else if (urlPath === "/ultra/courses/_949284_1/grades") {
            console.log("web programming grades page detected");
            updateWebProgGrades();
        }


    }

    window.addEventListener("network-request-complete", (event) => {
        onDomChange();
    });

    // @ts-ignore
    window.monkey = onDomChange;


})();
