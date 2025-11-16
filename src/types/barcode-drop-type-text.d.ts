type SocketMessageTypes = "upsertScans" | "deleteScans" | "replaceAllScans";

/**
 * Represents a single scanned barcode from the database.
 *
 * More specifically, it represents a single row from the `barcodes` table,
 * with all columns included.
 */
type ScannedBarcodeResponse = {

    /** The ID of the scanned barcode. */
    id: string;

    /** The date the barcode was scanned. */
    scanned_at: string;

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
type ScannedBarcodesResponse = ScannedBarcodeResponse[];

type UpsertScansSocketMessage = {
    type: "upsertScans";
    newScans: ScannedBarcodesResponse;
};

type DeleteScansSocketMessage = {
    type: "deleteScans";
    ids: string[];
};

type ReplaceAllScansSocketMessage = {
    type: "replaceAllScans";
    scans: ScannedBarcodesResponse;
};

type SocketMessage =
    | UpsertScansSocketMessage
    | DeleteScansSocketMessage
    | ReplaceAllScansSocketMessage;
