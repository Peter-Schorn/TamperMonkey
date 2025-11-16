"use strict";
// ==UserScript==
// @name         ChatGPT Prompt History with Arrow Keys
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Use up/down arrows to cycle through previous prompts in ChatGPT
// @author       You
// @match        https://chatgpt.com/c/*
// @grant        none
// ==/UserScript==
(function () {
    "use strict";
    console.error("error test");
    // TODO: Save prompt text as HTML string, not just plain text, to preserve formatting?
    let currentPromptText = "";
    let userMessages = [];
    let userMessageIndex = -1;
    let promptTextArea = null;
    let promptTextObserver = null;
    /** Gets all of the text in the prompt text area. */
    function getPromptTextAreaText() {
        return promptTextArea?.innerText ?? "";
    }
    function savePrompt(prompt) {
        if (prompt.trim() !== "" &&
            (userMessages.length === 0 || userMessages[userMessages.length - 1] !== prompt)) {
            userMessages.push(prompt);
            console.log(`Saved prompt to history: \`${prompt}\``);
        }
        userMessageIndex = userMessages.length - 1;
    }
    function setPrompt(text) {
        if (!promptTextArea) {
            console.error("setPrompt: promptTextArea is null");
            return;
        }
        const pElement = document.createElement("p");
        pElement.innerText = text;
        promptTextArea.replaceChildren(pElement);
        console.log(`setPrompt: set prompt to \`${text}\``);
    }
    function handleKeyDown(e) {
        if (document.activeElement !== promptTextArea) {
            console.log("Input field not focused; ignoring keydown");
            return;
        }
        console.log("handleKeyDown: keydown:", e.key);
        console.log(`handleKeyDown: currentPromptText: \`${currentPromptText}\``);
        // TODO: Also save prompt on submit button click
        if (e.key === "Enter" && !e.shiftKey) {
            console.log("handleKeyDown: will save prompt");
            savePrompt(currentPromptText);
        }
        // TODO: ignore if cursor not at start
        else if (e.key === "ArrowUp") {
            if (userMessageIndex > 0) {
                userMessageIndex--;
                if (userMessages.length > userMessageIndex) {
                    setPrompt(userMessages[userMessageIndex]);
                    e.preventDefault();
                }
            }
        }
        // TODO: ignore if cursor not at end
        else if (e.key === "ArrowDown") {
            if (userMessageIndex < userMessages.length - 1) {
                userMessageIndex++;
                if (userMessages.length > userMessageIndex) {
                    setPrompt(userMessages[userMessageIndex]);
                    e.preventDefault();
                }
            }
            // if at the end of history, clear prompt
            else if (userMessageIndex === userMessages.length - 1) {
                userMessageIndex++;
                setPrompt("");
                e.preventDefault();
            }
        }
    }
    function observePromptTextChanges() {
        promptTextObserver?.disconnect();
        if (!promptTextArea) {
            console.error("observePromptTextChanges: promptTextArea is null");
            return;
        }
        promptTextObserver = new MutationObserver(() => {
            currentPromptText = getPromptTextAreaText();
            console.log(`Prompt text changed: \`${currentPromptText}\``);
        });
        promptTextObserver.observe(promptTextArea, {
            subtree: true,
            childList: true,
            characterData: true
        });
    }
    /** Retrieve all of the user messages from the chat. */
    function updateUserMessages() {
        const userMessageBubbles = document.querySelectorAll(".user-message-bubble-color");
        const messages = Array.from(userMessageBubbles).map((el => el.textContent.trim()));
        console.log("Retrieved user messages:", messages);
        userMessages = messages;
        userMessageIndex = userMessages.length - 1;
    }
    function registerUpdateUserMessagesObserver() {
        const selector = "#thread #page-header + div";
        const threadElement = document.querySelector(selector);
        if (!threadElement) {
            console.error("registerUpdateUserMessagesObserver: threadElement is null");
            return;
        }
        const scrollToBottomButtonSelector = ".cursor-pointer.absolute.z-30.rounded-full";
        const threadObserver = new MutationObserver((mutations) => {
            console.log("threadObserver: thread changed");
            // check if all mutations are to the prompt text area
            if (mutations.every(mutation => {
                const target = mutation.target;
                if (target instanceof Element) {
                    if (target.closest("#thread-bottom-container," +
                        // the textarea for modifying existing messages
                        "textarea," +
                        scrollToBottomButtonSelector)) {
                        console.log("threadObserver: ignoring mutation to prompt text area");
                        return true;
                    }
                }
                // check if the scroll to bottom button was removed
                const removedNodes = Array.from(mutation.removedNodes);
                const addedNodes = Array.from(mutation.addedNodes);
                const modifiedNodes = removedNodes.concat(addedNodes);
                if (modifiedNodes.every(node => {
                    if (node instanceof Element) {
                        if (node.querySelector(scrollToBottomButtonSelector) ||
                            node.matches(scrollToBottomButtonSelector)) {
                            return true;
                        }
                    }
                    return false;
                })) {
                    console.log("threadObserver: ignoring mutations to scroll to bottom button");
                    return true;
                }
                return false;
            })) {
                console.log("threadObserver: ignoring mutations");
                return;
            }
            updateUserMessages();
        });
        threadObserver.observe(threadElement, {
            subtree: true,
            childList: true
        });
    }
    /** Returns true if successful init; else, false */
    function init() {
        console.log("init called");
        promptTextArea = document.getElementById("prompt-textarea");
        if (promptTextArea) {
            console.log("ChatGPT prompt input found:", promptTextArea);
            // Remove any existing listener to avoid duplicates
            promptTextArea.removeEventListener("keydown", handleKeyDown, {
                capture: true
            });
            // Hook into arrow keys for history navigation
            promptTextArea.addEventListener("keydown", handleKeyDown, {
                // capture event at capture phase to get it before ChatGPT's
                // own handler
                capture: true
            });
            // observe changes to prompt text
            observePromptTextChanges();
            updateUserMessages();
            registerUpdateUserMessagesObserver();
            return true;
        }
        else {
            console.error("ChatGPT input field not found!");
            return false;
        }
    }
    // keep searching for prompt text area
    const observer = new MutationObserver(() => {
        if (init()) {
            observer.disconnect();
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    // MARK: Debug
    // TODO: declare extendedWindow in type file?
    const extendedWindow = window;
    extendedWindow.getCurrentPromptText = () => {
        return currentPromptText;
    };
    extendedWindow.getUserMessages = () => {
        return userMessages;
    };
    extendedWindow.updateUserMessages = () => {
        updateUserMessages();
    };
})();
