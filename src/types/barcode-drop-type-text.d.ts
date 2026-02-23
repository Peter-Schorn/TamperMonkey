declare namespace BarcodeDropTypes {
    interface Window extends globalThis.Window {
        closeWebSocket(): void;
    }
}

type SocketMessageTypes = "upsertScans" | "deleteScans" | "replaceAllScans";

/**
 * Represents a single scanned barcode from the database.
 *
 * More specifically, it represents a single row from the `barcodes` table,
 * with all columns included.
 */
type ScannedBarcodeResponse<T = string> = {

    /** The ID of the scanned barcode. */
    id: string;

    /** The date the barcode was scanned. */
    scanned_at: T;

    /** The scanned barcode. */
    barcode: string;

    /** The username of the user who scanned the barcode. */
    username: string;

};

/**
 * Represents an array of scanned barcodes from the database.
 *
 * More specifically, it represents an array of rows from the `barcodes` table,
 * with all columns included.
 *
 * Used in GET /scans/:user
 */
type ScannedBarcodesResponse<T = string> = ScannedBarcodeResponse<T>[];

type UpsertScansSocketMessage<T = string> = {
    type: "upsertScans";
    newScans: ScannedBarcodesResponse<T>;
};

type DeleteScansSocketMessage<T = string> = {
    type: "deleteScans";
    ids: string[];
};

type ReplaceAllScansSocketMessage<T = string> = {
    type: "replaceAllScans";
    scans: ScannedBarcodesResponse<T>;
};

type SocketMessage<T = string> =
    | UpsertScansSocketMessage<T>
    | DeleteScansSocketMessage<T>
    | ReplaceAllScansSocketMessage<T>;
