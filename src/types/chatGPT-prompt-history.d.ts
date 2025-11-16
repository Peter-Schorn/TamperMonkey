declare namespace ChatGPTTypes {
    interface Window extends globalThis.Window {
        getCurrentPromptText(): string;
        getUserMessages(): string[];
        updateUserMessages(): void;
    }
}
