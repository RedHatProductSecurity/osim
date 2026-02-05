/* tslint:disable */
/* eslint-disable */
/**
 * 
 * @export
 * @interface AegisAiWebSrcMainComponentFeatureName
 */
export interface AegisAiWebSrcMainComponentFeatureName {
}
/**
 * 
 * @export
 * @interface AegisAiWebSrcMainComponentFeatureName1
 */
export interface AegisAiWebSrcMainComponentFeatureName1 {
}
/**
 * Feature KPI model for CVE analysis feedback.
 * 
 * Contains the acceptance score percentage and filtered log entries.
 * @export
 * @interface FeatureKPI
 */
export interface FeatureKPI {
    /**
     * Acceptance score as a percentage (0.0 to 100.0, e.g., 75.0 for 75%)
     * @type {any}
     * @memberof FeatureKPI
     */
    acceptance_percentage: any | null;
    /**
     * List of log entries filtered by feature, sorted by datetime
     * @type {any}
     * @memberof FeatureKPI
     */
    entries: any | null;
}
/**
 * Data structure for feedback.
 * 
 * All fields are stored without modification to preserve original data.
 * CSV escaping is handled automatically by the csv library during logging.
 * @export
 * @interface Feedback
 */
export interface Feedback {
    /**
     * 
     * @type {any}
     * @memberof Feedback
     */
    feature: any | null;
    /**
     * 
     * @type {any}
     * @memberof Feedback
     */
    cve_id?: any | null;
    /**
     * 
     * @type {any}
     * @memberof Feedback
     */
    email?: any | null;
    /**
     * 
     * @type {any}
     * @memberof Feedback
     */
    request_time?: any | null;
    /**
     * 
     * @type {any}
     * @memberof Feedback
     */
    actual?: any | null;
    /**
     * 
     * @type {any}
     * @memberof Feedback
     */
    expected?: any | null;
    /**
     * 
     * @type {any}
     * @memberof Feedback
     */
    accept?: any | null;
    /**
     * 
     * @type {any}
     * @memberof Feedback
     */
    rejection_comment?: any | null;
}
/**
 * 
 * @export
 * @interface HTTPValidationError
 */
export interface HTTPValidationError {
    /**
     * 
     * @type {any}
     * @memberof HTTPValidationError
     */
    detail?: any | null;
}
/**
 * Individual KPI entry model.
 * 
 * Contains datetime, acceptance status, and AEGIS version for a feedback entry.
 * @export
 * @interface KPIEntry
 */
export interface KPIEntry {
    /**
     * Timestamp of the feedback entry
     * @type {any}
     * @memberof KPIEntry
     */
    datetime: any | null;
    /**
     * Whether the feedback was accepted
     * @type {any}
     * @memberof KPIEntry
     */
    accepted: any | null;
    /**
     * AEGIS version at time of feedback
     * @type {any}
     * @memberof KPIEntry
     */
    aegis_version: any | null;
}
/**
 * Sort order for datetime field.
 * @export
 * @interface SortOrder
 */
export interface SortOrder {
}
/**
 * 
 * @export
 * @interface ValidationError
 */
export interface ValidationError {
    /**
     * 
     * @type {any}
     * @memberof ValidationError
     */
    loc: any | null;
    /**
     * 
     * @type {any}
     * @memberof ValidationError
     */
    msg: any | null;
    /**
     * 
     * @type {any}
     * @memberof ValidationError
     */
    type: any | null;
}
