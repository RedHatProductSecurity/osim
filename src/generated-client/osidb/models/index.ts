/* tslint:disable */
/* eslint-disable */
/**
 * Affect serializer
 * @export
 * @interface Affect
 */
export interface Affect {
    /**
     * 
     * @type {string}
     * @memberof Affect
     */
    readonly uuid: string;
    /**
     * 
     * @type {string}
     * @memberof Affect
     */
    flaw: string;
    /**
     * 
     * @type {AffectAffectedness}
     * @memberof Affect
     */
    affectedness?: AffectAffectedness;
    /**
     * 
     * @type {AffectResolution}
     * @memberof Affect
     */
    resolution?: AffectResolution;
    /**
     * 
     * @type {string}
     * @memberof Affect
     */
    psUpdateStream: string;
    /**
     * 
     * @type {string}
     * @memberof Affect
     */
    psModule?: string;
    /**
     * 
     * @type {string}
     * @memberof Affect
     */
    readonly cveId: string;
    /**
     * 
     * @type {string}
     * @memberof Affect
     */
    readonly psProduct: string;
    /**
     * 
     * @type {string}
     * @memberof Affect
     */
    psComponent?: string | null;
    /**
     * 
     * @type {AffectImpact}
     * @memberof Affect
     */
    impact?: AffectImpact;
    /**
     * 
     * @type {Tracker}
     * @memberof Affect
     */
    readonly tracker: Tracker | null;
    /**
     * 
     * @type {string}
     * @memberof Affect
     */
    readonly delegatedResolution: string;
    /**
     * 
     * @type {Array<AffectCVSS>}
     * @memberof Affect
     */
    readonly cvssScores: Array<AffectCVSS>;
    /**
     * 
     * @type {string}
     * @memberof Affect
     */
    purl?: string | null;
    /**
     * 
     * @type {AffectNotAffectedJustification}
     * @memberof Affect
     */
    notAffectedJustification?: AffectNotAffectedJustification;
    /**
     * 
     * @type {string}
     * @memberof Affect
     */
    readonly delegatedNotAffectedJustification: string;
    /**
     * 
     * @type {string}
     * @memberof Affect
     */
    readonly resolvedDt: string | null;
    /**
     * 
     * @type {Array<string>}
     * @memberof Affect
     */
    readonly labels: Array<string>;
    /**
     * The embargoed boolean attribute is technically read-only as it just indirectly modifies the ACLs but is mandatory as it controls the access to the resource.
     * @type {boolean}
     * @memberof Affect
     */
    embargoed: boolean;
    /**
     * 
     * @type {Array<Alert>}
     * @memberof Affect
     */
    readonly alerts: Array<Alert>;
    /**
     * 
     * @type {string}
     * @memberof Affect
     */
    readonly createdDt: string;
    /**
     * The updated_dt timestamp attribute is mandatory on update as it is used to detect mit-air collisions.
     * @type {string}
     * @memberof Affect
     */
    updatedDt: string;
}
/**
 * @type AffectAffectedness
 * 
 * @export
 */
export type AffectAffectedness = AffectednessEnum | BlankEnum;
/**
 * 
 * @export
 * @interface AffectBulkPostPutResponse
 */
export interface AffectBulkPostPutResponse {
    /**
     * 
     * @type {Array<Affect>}
     * @memberof AffectBulkPostPutResponse
     */
    results: Array<Affect>;
}
/**
 * Affect serializer
 * @export
 * @interface AffectBulkPutRequest
 */
export interface AffectBulkPutRequest {
    /**
     * 
     * @type {string}
     * @memberof AffectBulkPutRequest
     */
    uuid: string;
    /**
     * 
     * @type {string}
     * @memberof AffectBulkPutRequest
     */
    flaw: string;
    /**
     * 
     * @type {AffectAffectedness}
     * @memberof AffectBulkPutRequest
     */
    affectedness?: AffectAffectedness;
    /**
     * 
     * @type {AffectResolution}
     * @memberof AffectBulkPutRequest
     */
    resolution?: AffectResolution;
    /**
     * 
     * @type {string}
     * @memberof AffectBulkPutRequest
     */
    psUpdateStream: string;
    /**
     * 
     * @type {string}
     * @memberof AffectBulkPutRequest
     */
    psModule?: string;
    /**
     * 
     * @type {string}
     * @memberof AffectBulkPutRequest
     */
    psComponent?: string | null;
    /**
     * 
     * @type {AffectImpact}
     * @memberof AffectBulkPutRequest
     */
    impact?: AffectImpact;
    /**
     * 
     * @type {string}
     * @memberof AffectBulkPutRequest
     */
    purl?: string | null;
    /**
     * 
     * @type {AffectNotAffectedJustification}
     * @memberof AffectBulkPutRequest
     */
    notAffectedJustification?: AffectNotAffectedJustification;
    /**
     * The embargoed boolean attribute is technically read-only as it just indirectly modifies the ACLs but is mandatory as it controls the access to the resource.
     * @type {boolean}
     * @memberof AffectBulkPutRequest
     */
    embargoed: boolean;
    /**
     * The updated_dt timestamp attribute is mandatory on update as it is used to detect mit-air collisions.
     * @type {string}
     * @memberof AffectBulkPutRequest
     */
    updatedDt: string;
}
/**
 * AffectCVSS serializer
 * @export
 * @interface AffectCVSS
 */
export interface AffectCVSS {
    /**
     * 
     * @type {string}
     * @memberof AffectCVSS
     */
    affect?: string;
    /**
     * 
     * @type {string}
     * @memberof AffectCVSS
     */
    comment?: string | null;
    /**
     * 
     * @type {CvssVersionEnum}
     * @memberof AffectCVSS
     */
    cvssVersion: CvssVersionEnum;
    /**
     * 
     * @type {IssuerEnum}
     * @memberof AffectCVSS
     */
    issuer?: IssuerEnum;
    /**
     * 
     * @type {number}
     * @memberof AffectCVSS
     */
    readonly score: number;
    /**
     * 
     * @type {string}
     * @memberof AffectCVSS
     */
    readonly uuid: string;
    /**
     * 
     * @type {string}
     * @memberof AffectCVSS
     */
    vector: string;
    /**
     * The embargoed boolean attribute is technically read-only as it just indirectly modifies the ACLs but is mandatory as it controls the access to the resource.
     * @type {boolean}
     * @memberof AffectCVSS
     */
    embargoed: boolean;
    /**
     * 
     * @type {Array<Alert>}
     * @memberof AffectCVSS
     */
    readonly alerts: Array<Alert>;
    /**
     * 
     * @type {string}
     * @memberof AffectCVSS
     */
    readonly createdDt: string;
    /**
     * The updated_dt timestamp attribute is mandatory on update as it is used to detect mit-air collisions.
     * @type {string}
     * @memberof AffectCVSS
     */
    updatedDt: string;
}
/**
 * AffectCVSS serializer
 * @export
 * @interface AffectCVSSRequest
 */
export interface AffectCVSSRequest {
    /**
     * 
     * @type {string}
     * @memberof AffectCVSSRequest
     */
    affect?: string;
    /**
     * 
     * @type {string}
     * @memberof AffectCVSSRequest
     */
    comment?: string | null;
    /**
     * 
     * @type {CvssVersionEnum}
     * @memberof AffectCVSSRequest
     */
    cvssVersion: CvssVersionEnum;
    /**
     * 
     * @type {IssuerEnum}
     * @memberof AffectCVSSRequest
     */
    issuer?: IssuerEnum;
    /**
     * 
     * @type {string}
     * @memberof AffectCVSSRequest
     */
    vector: string;
    /**
     * The embargoed boolean attribute is technically read-only as it just indirectly modifies the ACLs but is mandatory as it controls the access to the resource.
     * @type {boolean}
     * @memberof AffectCVSSRequest
     */
    embargoed: boolean;
    /**
     * The updated_dt timestamp attribute is mandatory on update as it is used to detect mit-air collisions.
     * @type {string}
     * @memberof AffectCVSSRequest
     */
    updatedDt: string;
}
/**
 * Abstract serializer for FlawCVSS and AffectCVSS serializer
 * @export
 * @interface AffectCVSSV2
 */
export interface AffectCVSSV2 {
    /**
     * 
     * @type {string}
     * @memberof AffectCVSSV2
     */
    affect?: string;
    /**
     * 
     * @type {string}
     * @memberof AffectCVSSV2
     */
    comment?: string | null;
    /**
     * 
     * @type {CvssVersionEnum}
     * @memberof AffectCVSSV2
     */
    cvssVersion: CvssVersionEnum;
    /**
     * 
     * @type {IssuerEnum}
     * @memberof AffectCVSSV2
     */
    readonly issuer: IssuerEnum;
    /**
     * 
     * @type {number}
     * @memberof AffectCVSSV2
     */
    readonly score: number;
    /**
     * 
     * @type {string}
     * @memberof AffectCVSSV2
     */
    readonly uuid: string;
    /**
     * 
     * @type {string}
     * @memberof AffectCVSSV2
     */
    vector: string;
    /**
     * The embargoed boolean attribute is technically read-only as it just indirectly modifies the ACLs but is mandatory as it controls the access to the resource.
     * @type {boolean}
     * @memberof AffectCVSSV2
     */
    embargoed: boolean;
    /**
     * 
     * @type {Array<Alert>}
     * @memberof AffectCVSSV2
     */
    readonly alerts: Array<Alert>;
    /**
     * 
     * @type {string}
     * @memberof AffectCVSSV2
     */
    readonly createdDt: string;
    /**
     * The updated_dt timestamp attribute is mandatory on update as it is used to detect mit-air collisions.
     * @type {string}
     * @memberof AffectCVSSV2
     */
    updatedDt: string;
}
/**
 * Abstract serializer for FlawCVSS and AffectCVSS serializer
 * @export
 * @interface AffectCVSSV2PostRequest
 */
export interface AffectCVSSV2PostRequest {
    /**
     * 
     * @type {string}
     * @memberof AffectCVSSV2PostRequest
     */
    comment?: string | null;
    /**
     * 
     * @type {CvssVersionEnum}
     * @memberof AffectCVSSV2PostRequest
     */
    cvssVersion: CvssVersionEnum;
    /**
     * 
     * @type {string}
     * @memberof AffectCVSSV2PostRequest
     */
    vector: string;
    /**
     * The embargoed boolean attribute is technically read-only as it just indirectly modifies the ACLs but is mandatory as it controls the access to the resource.
     * @type {boolean}
     * @memberof AffectCVSSV2PostRequest
     */
    embargoed: boolean;
}
/**
 * Abstract serializer for FlawCVSS and AffectCVSS serializer
 * @export
 * @interface AffectCVSSV2PutRequest
 */
export interface AffectCVSSV2PutRequest {
    /**
     * 
     * @type {string}
     * @memberof AffectCVSSV2PutRequest
     */
    comment?: string | null;
    /**
     * 
     * @type {CvssVersionEnum}
     * @memberof AffectCVSSV2PutRequest
     */
    cvssVersion: CvssVersionEnum;
    /**
     * 
     * @type {string}
     * @memberof AffectCVSSV2PutRequest
     */
    vector: string;
    /**
     * The embargoed boolean attribute is technically read-only as it just indirectly modifies the ACLs but is mandatory as it controls the access to the resource.
     * @type {boolean}
     * @memberof AffectCVSSV2PutRequest
     */
    embargoed: boolean;
    /**
     * The updated_dt timestamp attribute is mandatory on update as it is used to detect mit-air collisions.
     * @type {string}
     * @memberof AffectCVSSV2PutRequest
     */
    updatedDt: string;
}
/**
 * @type AffectImpact
 * 
 * @export
 */
export type AffectImpact = BlankEnum | ImpactEnum;
/**
 * @type AffectNotAffectedJustification
 * 
 * @export
 */
export type AffectNotAffectedJustification = BlankEnum | NotAffectedJustificationEnum;
/**
 * Affect serializer
 * @export
 * @interface AffectPostRequest
 */
export interface AffectPostRequest {
    /**
     * 
     * @type {string}
     * @memberof AffectPostRequest
     */
    flaw: string;
    /**
     * 
     * @type {AffectAffectedness}
     * @memberof AffectPostRequest
     */
    affectedness?: AffectAffectedness;
    /**
     * 
     * @type {AffectResolution}
     * @memberof AffectPostRequest
     */
    resolution?: AffectResolution;
    /**
     * 
     * @type {string}
     * @memberof AffectPostRequest
     */
    psUpdateStream: string;
    /**
     * 
     * @type {string}
     * @memberof AffectPostRequest
     */
    psModule?: string;
    /**
     * 
     * @type {string}
     * @memberof AffectPostRequest
     */
    psComponent?: string | null;
    /**
     * 
     * @type {AffectImpact}
     * @memberof AffectPostRequest
     */
    impact?: AffectImpact;
    /**
     * 
     * @type {string}
     * @memberof AffectPostRequest
     */
    purl?: string | null;
    /**
     * 
     * @type {AffectNotAffectedJustification}
     * @memberof AffectPostRequest
     */
    notAffectedJustification?: AffectNotAffectedJustification;
    /**
     * The embargoed boolean attribute is technically read-only as it just indirectly modifies the ACLs but is mandatory as it controls the access to the resource.
     * @type {boolean}
     * @memberof AffectPostRequest
     */
    embargoed: boolean;
}
/**
 * 
 * @export
 * @interface AffectReportData
 */
export interface AffectReportData {
    /**
     * 
     * @type {string}
     * @memberof AffectReportData
     */
    psUpdateStream: string;
    /**
     * 
     * @type {string}
     * @memberof AffectReportData
     */
    psComponent: string;
    /**
     * 
     * @type {AffectAffectedness}
     * @memberof AffectReportData
     */
    affectedness?: AffectAffectedness;
    /**
     * 
     * @type {AffectResolution}
     * @memberof AffectReportData
     */
    resolution?: AffectResolution;
    /**
     * 
     * @type {TrackerReportData}
     * @memberof AffectReportData
     */
    tracker?: TrackerReportData;
}
/**
 * Affect serializer
 * @export
 * @interface AffectRequest
 */
export interface AffectRequest {
    /**
     * 
     * @type {string}
     * @memberof AffectRequest
     */
    flaw: string;
    /**
     * 
     * @type {AffectAffectedness}
     * @memberof AffectRequest
     */
    affectedness?: AffectAffectedness;
    /**
     * 
     * @type {AffectResolution}
     * @memberof AffectRequest
     */
    resolution?: AffectResolution;
    /**
     * 
     * @type {string}
     * @memberof AffectRequest
     */
    psUpdateStream: string;
    /**
     * 
     * @type {string}
     * @memberof AffectRequest
     */
    psModule?: string;
    /**
     * 
     * @type {string}
     * @memberof AffectRequest
     */
    psComponent?: string | null;
    /**
     * 
     * @type {AffectImpact}
     * @memberof AffectRequest
     */
    impact?: AffectImpact;
    /**
     * 
     * @type {string}
     * @memberof AffectRequest
     */
    purl?: string | null;
    /**
     * 
     * @type {AffectNotAffectedJustification}
     * @memberof AffectRequest
     */
    notAffectedJustification?: AffectNotAffectedJustification;
    /**
     * The embargoed boolean attribute is technically read-only as it just indirectly modifies the ACLs but is mandatory as it controls the access to the resource.
     * @type {boolean}
     * @memberof AffectRequest
     */
    embargoed: boolean;
    /**
     * The updated_dt timestamp attribute is mandatory on update as it is used to detect mit-air collisions.
     * @type {string}
     * @memberof AffectRequest
     */
    updatedDt: string;
}
/**
 * @type AffectResolution
 * 
 * @export
 */
export type AffectResolution = BlankEnum | ResolutionEnum;
/**
 * Read-only serializer for the AffectV1 database view.
 * @export
 * @interface AffectV1
 */
export interface AffectV1 {
    /**
     * 
     * @type {string}
     * @memberof AffectV1
     */
    readonly uuid: string;
    /**
     * 
     * @type {string}
     * @memberof AffectV1
     */
    flaw?: string | null;
    /**
     * 
     * @type {AffectAffectedness}
     * @memberof AffectV1
     */
    affectedness: AffectAffectedness;
    /**
     * 
     * @type {AffectResolution}
     * @memberof AffectV1
     */
    resolution: AffectResolution;
    /**
     * 
     * @type {string}
     * @memberof AffectV1
     */
    psModule: string;
    /**
     * 
     * @type {string}
     * @memberof AffectV1
     */
    readonly cveId: string;
    /**
     * 
     * @type {string}
     * @memberof AffectV1
     */
    readonly psProduct: string;
    /**
     * 
     * @type {string}
     * @memberof AffectV1
     */
    readonly psComponent: string;
    /**
     * 
     * @type {AffectImpact}
     * @memberof AffectV1
     */
    impact?: AffectImpact;
    /**
     * 
     * @type {Array<Tracker>}
     * @memberof AffectV1
     */
    readonly trackers: Array<Tracker>;
    /**
     * 
     * @type {string}
     * @memberof AffectV1
     */
    readonly delegatedResolution: string;
    /**
     * 
     * @type {string}
     * @memberof AffectV1
     */
    readonly cvssScores: string;
    /**
     * 
     * @type {string}
     * @memberof AffectV1
     */
    readonly purl: string;
    /**
     * 
     * @type {string}
     * @memberof AffectV1
     */
    notAffectedJustification?: string;
    /**
     * 
     * @type {string}
     * @memberof AffectV1
     */
    readonly delegatedNotAffectedJustification: string;
    /**
     * 
     * @type {string}
     * @memberof AffectV1
     */
    readonly resolvedDt: string | null;
    /**
     * The embargoed boolean attribute is technically read-only as it just indirectly modifies the ACLs but is mandatory as it controls the access to the resource.
     * @type {boolean}
     * @memberof AffectV1
     */
    embargoed: boolean;
    /**
     * 
     * @type {Array<Alert>}
     * @memberof AffectV1
     */
    readonly alerts: Array<Alert>;
    /**
     * 
     * @type {string}
     * @memberof AffectV1
     */
    readonly createdDt: string;
    /**
     * The updated_dt timestamp attribute is mandatory on update as it is used to detect mit-air collisions.
     * @type {string}
     * @memberof AffectV1
     */
    updatedDt: string;
}
/**
 * 
 * @export
 * @interface AffectV1ReportData
 */
export interface AffectV1ReportData {
    /**
     * 
     * @type {string}
     * @memberof AffectV1ReportData
     */
    psModule: string;
    /**
     * 
     * @type {string}
     * @memberof AffectV1ReportData
     */
    psComponent: string;
    /**
     * 
     * @type {AffectAffectedness}
     * @memberof AffectV1ReportData
     */
    affectedness: AffectAffectedness;
    /**
     * 
     * @type {AffectResolution}
     * @memberof AffectV1ReportData
     */
    resolution: AffectResolution;
    /**
     * 
     * @type {Array<TrackerReportData>}
     * @memberof AffectV1ReportData
     */
    trackers?: Array<TrackerReportData>;
}

/**
 * 
 * @export
 */
export const AffectednessEnum = {
    New: 'NEW',
    Affected: 'AFFECTED',
    Notaffected: 'NOTAFFECTED'
} as const;
export type AffectednessEnum = typeof AffectednessEnum[keyof typeof AffectednessEnum];

/**
 * Alerts indicate some inconsistency in a linked flaw, affect, tracker or other models.
 * @export
 * @interface Alert
 */
export interface Alert {
    /**
     * 
     * @type {string}
     * @memberof Alert
     */
    readonly uuid: string;
    /**
     * 
     * @type {string}
     * @memberof Alert
     */
    name: string;
    /**
     * 
     * @type {string}
     * @memberof Alert
     */
    description: string;
    /**
     * 
     * @type {AlertTypeEnum}
     * @memberof Alert
     */
    alertType?: AlertTypeEnum;
    /**
     * 
     * @type {string}
     * @memberof Alert
     */
    resolutionSteps?: string;
    /**
     * 
     * @type {string}
     * @memberof Alert
     */
    readonly parentUuid: string;
    /**
     * 
     * @type {string}
     * @memberof Alert
     */
    readonly parentModel: string;
}

/**
 * 
 * @export
 */
export const AlertTypeEnum = {
    Warning: 'WARNING',
    Error: 'ERROR'
} as const;
export type AlertTypeEnum = typeof AlertTypeEnum[keyof typeof AlertTypeEnum];

/**
 * 
 * @export
 * @interface Audit
 */
export interface Audit {
    /**
     * When the event was created.
     * @type {string}
     * @memberof Audit
     */
    readonly pghCreatedAt: string;
    /**
     * The unique identifier across all event tables.
     * @type {string}
     * @memberof Audit
     */
    pghSlug: string;
    /**
     * The object model.
     * @type {string}
     * @memberof Audit
     */
    pghObjModel: string;
    /**
     * The primary key of the object.
     * @type {string}
     * @memberof Audit
     */
    pghObjId?: string | null;
    /**
     * The event label.
     * @type {string}
     * @memberof Audit
     */
    pghLabel: string;
    /**
     * The context associated with the event.
     * @type {any}
     * @memberof Audit
     */
    pghContext?: any | null;
    /**
     * The diff between the previous event of the same label.
     * @type {any}
     * @memberof Audit
     */
    pghDiff: any | null;
    /**
     * 
     * @type {string}
     * @memberof Audit
     */
    readonly pghData: string;
}
/**
 * 
 * @export
 * @interface AuditRequest
 */
export interface AuditRequest {
    /**
     * The unique identifier across all event tables.
     * @type {string}
     * @memberof AuditRequest
     */
    pghSlug: string;
    /**
     * The object model.
     * @type {string}
     * @memberof AuditRequest
     */
    pghObjModel: string;
    /**
     * The primary key of the object.
     * @type {string}
     * @memberof AuditRequest
     */
    pghObjId?: string | null;
    /**
     * The event label.
     * @type {string}
     * @memberof AuditRequest
     */
    pghLabel: string;
    /**
     * The context associated with the event.
     * @type {any}
     * @memberof AuditRequest
     */
    pghContext?: any | null;
    /**
     * The diff between the previous event of the same label.
     * @type {any}
     * @memberof AuditRequest
     */
    pghDiff: any | null;
}
/**
 * 
 * @export
 * @interface AuthTokenCreate200Response
 */
export interface AuthTokenCreate200Response {
    /**
     * 
     * @type {string}
     * @memberof AuthTokenCreate200Response
     */
    readonly access: string;
    /**
     * 
     * @type {string}
     * @memberof AuthTokenCreate200Response
     */
    readonly refresh: string;
    /**
     * 
     * @type {string}
     * @memberof AuthTokenCreate200Response
     */
    dt?: string;
    /**
     * 
     * @type {string}
     * @memberof AuthTokenCreate200Response
     */
    env?: string;
    /**
     * 
     * @type {string}
     * @memberof AuthTokenCreate200Response
     */
    revision?: string;
    /**
     * 
     * @type {string}
     * @memberof AuthTokenCreate200Response
     */
    version?: string;
}
/**
 * 
 * @export
 * @interface AuthTokenCreate200ResponseAllOf
 */
export interface AuthTokenCreate200ResponseAllOf {
    /**
     * 
     * @type {string}
     * @memberof AuthTokenCreate200ResponseAllOf
     */
    dt?: string;
    /**
     * 
     * @type {string}
     * @memberof AuthTokenCreate200ResponseAllOf
     */
    env?: string;
    /**
     * 
     * @type {string}
     * @memberof AuthTokenCreate200ResponseAllOf
     */
    revision?: string;
    /**
     * 
     * @type {string}
     * @memberof AuthTokenCreate200ResponseAllOf
     */
    version?: string;
}
/**
 * 
 * @export
 * @interface AuthTokenRefreshCreate200Response
 */
export interface AuthTokenRefreshCreate200Response {
    /**
     * 
     * @type {string}
     * @memberof AuthTokenRefreshCreate200Response
     */
    readonly access: string;
    /**
     * 
     * @type {string}
     * @memberof AuthTokenRefreshCreate200Response
     */
    dt?: string;
    /**
     * 
     * @type {string}
     * @memberof AuthTokenRefreshCreate200Response
     */
    env?: string;
    /**
     * 
     * @type {string}
     * @memberof AuthTokenRefreshCreate200Response
     */
    revision?: string;
    /**
     * 
     * @type {string}
     * @memberof AuthTokenRefreshCreate200Response
     */
    version?: string;
}
/**
 * 
 * @export
 * @interface AuthTokenRefreshRetrieve200Response
 */
export interface AuthTokenRefreshRetrieve200Response {
    /**
     * 
     * @type {string}
     * @memberof AuthTokenRefreshRetrieve200Response
     */
    access?: string;
    /**
     * 
     * @type {string}
     * @memberof AuthTokenRefreshRetrieve200Response
     */
    dt?: string;
    /**
     * 
     * @type {string}
     * @memberof AuthTokenRefreshRetrieve200Response
     */
    env?: string;
    /**
     * 
     * @type {string}
     * @memberof AuthTokenRefreshRetrieve200Response
     */
    revision?: string;
    /**
     * 
     * @type {string}
     * @memberof AuthTokenRefreshRetrieve200Response
     */
    version?: string;
}
/**
 * 
 * @export
 * @interface AuthTokenRetrieve200Response
 */
export interface AuthTokenRetrieve200Response {
    /**
     * 
     * @type {string}
     * @memberof AuthTokenRetrieve200Response
     */
    access?: string;
    /**
     * 
     * @type {string}
     * @memberof AuthTokenRetrieve200Response
     */
    dt?: string;
    /**
     * 
     * @type {string}
     * @memberof AuthTokenRetrieve200Response
     */
    env?: string;
    /**
     * 
     * @type {string}
     * @memberof AuthTokenRetrieve200Response
     */
    refresh?: string;
    /**
     * 
     * @type {string}
     * @memberof AuthTokenRetrieve200Response
     */
    revision?: string;
    /**
     * 
     * @type {string}
     * @memberof AuthTokenRetrieve200Response
     */
    version?: string;
}

/**
 * 
 * @export
 */
export const BlankEnum = {
    Empty: ''
} as const;
export type BlankEnum = typeof BlankEnum[keyof typeof BlankEnum];

/**
 * 
 * @export
 * @interface CollectorsApiV1StatusRetrieve200Response
 */
export interface CollectorsApiV1StatusRetrieve200Response {
    /**
     * 
     * @type {Array<CollectorsApiV1StatusRetrieve200ResponseCollectorsInner>}
     * @memberof CollectorsApiV1StatusRetrieve200Response
     */
    collectors?: Array<CollectorsApiV1StatusRetrieve200ResponseCollectorsInner>;
    /**
     * 
     * @type {string}
     * @memberof CollectorsApiV1StatusRetrieve200Response
     */
    dt?: string;
    /**
     * 
     * @type {string}
     * @memberof CollectorsApiV1StatusRetrieve200Response
     */
    env?: string;
    /**
     * 
     * @type {string}
     * @memberof CollectorsApiV1StatusRetrieve200Response
     */
    revision?: string;
    /**
     * 
     * @type {string}
     * @memberof CollectorsApiV1StatusRetrieve200Response
     */
    version?: string;
}
/**
 * 
 * @export
 * @interface CollectorsApiV1StatusRetrieve200ResponseCollectorsInner
 */
export interface CollectorsApiV1StatusRetrieve200ResponseCollectorsInner {
    /**
     * 
     * @type {string}
     * @memberof CollectorsApiV1StatusRetrieve200ResponseCollectorsInner
     */
    data?: CollectorsApiV1StatusRetrieve200ResponseCollectorsInnerDataEnum;
    /**
     * 
     * @type {Array<string>}
     * @memberof CollectorsApiV1StatusRetrieve200ResponseCollectorsInner
     */
    dependsOn?: Array<string>;
    /**
     * 
     * @type {object}
     * @memberof CollectorsApiV1StatusRetrieve200ResponseCollectorsInner
     */
    error?: object | null;
    /**
     * 
     * @type {boolean}
     * @memberof CollectorsApiV1StatusRetrieve200ResponseCollectorsInner
     */
    isComplete?: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof CollectorsApiV1StatusRetrieve200ResponseCollectorsInner
     */
    isUp2date?: boolean;
    /**
     * 
     * @type {Array<string>}
     * @memberof CollectorsApiV1StatusRetrieve200ResponseCollectorsInner
     */
    dataModels?: Array<string>;
    /**
     * 
     * @type {string}
     * @memberof CollectorsApiV1StatusRetrieve200ResponseCollectorsInner
     */
    state?: CollectorsApiV1StatusRetrieve200ResponseCollectorsInnerStateEnum;
    /**
     * 
     * @type {string}
     * @memberof CollectorsApiV1StatusRetrieve200ResponseCollectorsInner
     */
    updatedUntil?: string;
}


/**
 * @export
 */
export const CollectorsApiV1StatusRetrieve200ResponseCollectorsInnerDataEnum = {
    Empty: 'EMPTY',
    Partial: 'PARTIAL',
    Complete: 'COMPLETE'
} as const;
export type CollectorsApiV1StatusRetrieve200ResponseCollectorsInnerDataEnum = typeof CollectorsApiV1StatusRetrieve200ResponseCollectorsInnerDataEnum[keyof typeof CollectorsApiV1StatusRetrieve200ResponseCollectorsInnerDataEnum];

/**
 * @export
 */
export const CollectorsApiV1StatusRetrieve200ResponseCollectorsInnerStateEnum = {
    Pending: 'PENDING',
    Blocked: 'BLOCKED',
    Ready: 'READY',
    Running: 'RUNNING'
} as const;
export type CollectorsApiV1StatusRetrieve200ResponseCollectorsInnerStateEnum = typeof CollectorsApiV1StatusRetrieve200ResponseCollectorsInnerStateEnum[keyof typeof CollectorsApiV1StatusRetrieve200ResponseCollectorsInnerStateEnum];

/**
 * 
 * @export
 * @interface CollectorsRetrieve200Response
 */
export interface CollectorsRetrieve200Response {
    /**
     * 
     * @type {string}
     * @memberof CollectorsRetrieve200Response
     */
    dt?: string;
    /**
     * 
     * @type {string}
     * @memberof CollectorsRetrieve200Response
     */
    env?: string;
    /**
     * 
     * @type {Array<string>}
     * @memberof CollectorsRetrieve200Response
     */
    index?: Array<string>;
    /**
     * 
     * @type {string}
     * @memberof CollectorsRetrieve200Response
     */
    revision?: string;
    /**
     * 
     * @type {string}
     * @memberof CollectorsRetrieve200Response
     */
    version?: string;
}
/**
 * FlawComment serializer for use by FlawSerializer
 * @export
 * @interface Comment
 */
export interface Comment {
    /**
     * 
     * @type {string}
     * @memberof Comment
     */
    readonly uuid: string;
    /**
     * 
     * @type {string}
     * @memberof Comment
     */
    text: string;
    /**
     * 
     * @type {string}
     * @memberof Comment
     */
    externalSystemId?: string;
    /**
     * 
     * @type {number}
     * @memberof Comment
     */
    order?: number | null;
    /**
     * 
     * @type {string}
     * @memberof Comment
     */
    creator?: string;
    /**
     * 
     * @type {boolean}
     * @memberof Comment
     */
    isPrivate?: boolean;
    /**
     * 
     * @type {Array<Alert>}
     * @memberof Comment
     */
    readonly alerts: Array<Alert>;
    /**
     * 
     * @type {string}
     * @memberof Comment
     */
    readonly createdDt: string;
    /**
     * The updated_dt timestamp attribute is mandatory on update as it is used to detect mit-air collisions.
     * @type {string}
     * @memberof Comment
     */
    updatedDt: string;
}
/**
 * FlawComment serializer for use by FlawSerializer
 * @export
 * @interface CommentRequest
 */
export interface CommentRequest {
    /**
     * 
     * @type {string}
     * @memberof CommentRequest
     */
    text: string;
    /**
     * 
     * @type {string}
     * @memberof CommentRequest
     */
    externalSystemId?: string;
    /**
     * 
     * @type {number}
     * @memberof CommentRequest
     */
    order?: number | null;
    /**
     * 
     * @type {string}
     * @memberof CommentRequest
     */
    creator?: string;
    /**
     * 
     * @type {boolean}
     * @memberof CommentRequest
     */
    isPrivate?: boolean;
    /**
     * The updated_dt timestamp attribute is mandatory on update as it is used to detect mit-air collisions.
     * @type {string}
     * @memberof CommentRequest
     */
    updatedDt: string;
}

/**
 * 
 * @export
 */
export const CvssVersionEnum = {
    V2: 'V2',
    V3: 'V3',
    V4: 'V4'
} as const;
export type CvssVersionEnum = typeof CvssVersionEnum[keyof typeof CvssVersionEnum];

/**
 * 
 * @export
 * @interface EPSS
 */
export interface EPSS {
    /**
     * 
     * @type {string}
     * @memberof EPSS
     */
    cve: string;
    /**
     * 
     * @type {number}
     * @memberof EPSS
     */
    epss: number;
}
/**
 * Erratum serializer
 * @export
 * @interface Erratum
 */
export interface Erratum {
    /**
     * 
     * @type {number}
     * @memberof Erratum
     */
    readonly etId: number;
    /**
     * 
     * @type {string}
     * @memberof Erratum
     */
    readonly advisoryName: string;
    /**
     * 
     * @type {string}
     * @memberof Erratum
     */
    readonly shippedDt: string | null;
    /**
     * 
     * @type {string}
     * @memberof Erratum
     */
    readonly createdDt: string;
    /**
     * The updated_dt timestamp attribute is mandatory on update as it is used to detect mit-air collisions.
     * @type {string}
     * @memberof Erratum
     */
    updatedDt: string;
}
/**
 * 
 * @export
 * @interface ExploitOnlyReportData
 */
export interface ExploitOnlyReportData {
    /**
     * 
     * @type {string}
     * @memberof ExploitOnlyReportData
     */
    cve: string;
    /**
     * 
     * @type {string}
     * @memberof ExploitOnlyReportData
     */
    date?: string | null;
    /**
     * 
     * @type {ExploitOnlyReportDataSourceEnum}
     * @memberof ExploitOnlyReportData
     */
    source: ExploitOnlyReportDataSourceEnum;
    /**
     * 
     * @type {string}
     * @memberof ExploitOnlyReportData
     */
    reference?: string;
    /**
     * 
     * @type {MaturityPreliminaryEnum}
     * @memberof ExploitOnlyReportData
     */
    maturityPreliminary: MaturityPreliminaryEnum;
    /**
     * 
     * @type {boolean}
     * @memberof ExploitOnlyReportData
     */
    flaw: boolean;
}

/**
 * 
 * @export
 */
export const ExploitOnlyReportDataSourceEnum = {
    Cisa: 'CISA',
    Metasploit: 'Metasploit',
    ExploitDb: 'Exploit-DB'
} as const;
export type ExploitOnlyReportDataSourceEnum = typeof ExploitOnlyReportDataSourceEnum[keyof typeof ExploitOnlyReportDataSourceEnum];

/**
 * 
 * @export
 * @interface ExploitsApiV1CollectUpdate200Response
 */
export interface ExploitsApiV1CollectUpdate200Response {
    /**
     * 
     * @type {string}
     * @memberof ExploitsApiV1CollectUpdate200Response
     */
    dt?: string;
    /**
     * 
     * @type {string}
     * @memberof ExploitsApiV1CollectUpdate200Response
     */
    env?: string;
    /**
     * 
     * @type {string}
     * @memberof ExploitsApiV1CollectUpdate200Response
     */
    resultCisa?: string;
    /**
     * 
     * @type {string}
     * @memberof ExploitsApiV1CollectUpdate200Response
     */
    revision?: string;
    /**
     * 
     * @type {string}
     * @memberof ExploitsApiV1CollectUpdate200Response
     */
    version?: string;
}
/**
 * 
 * @export
 * @interface ExploitsApiV1CveMapRetrieve200Response
 */
export interface ExploitsApiV1CveMapRetrieve200Response {
    /**
     * 
     * @type {object}
     * @memberof ExploitsApiV1CveMapRetrieve200Response
     */
    cves?: object;
    /**
     * 
     * @type {string}
     * @memberof ExploitsApiV1CveMapRetrieve200Response
     */
    dt?: string;
    /**
     * 
     * @type {string}
     * @memberof ExploitsApiV1CveMapRetrieve200Response
     */
    env?: string;
    /**
     * 
     * @type {number}
     * @memberof ExploitsApiV1CveMapRetrieve200Response
     */
    pageSize?: number;
    /**
     * 
     * @type {string}
     * @memberof ExploitsApiV1CveMapRetrieve200Response
     */
    revision?: string;
    /**
     * 
     * @type {string}
     * @memberof ExploitsApiV1CveMapRetrieve200Response
     */
    version?: string;
}
/**
 * 
 * @export
 * @interface ExploitsApiV1EpssList200Response
 */
export interface ExploitsApiV1EpssList200Response {
    /**
     * 
     * @type {number}
     * @memberof ExploitsApiV1EpssList200Response
     */
    count: number;
    /**
     * 
     * @type {string}
     * @memberof ExploitsApiV1EpssList200Response
     */
    next?: string | null;
    /**
     * 
     * @type {string}
     * @memberof ExploitsApiV1EpssList200Response
     */
    previous?: string | null;
    /**
     * 
     * @type {Array<EPSS>}
     * @memberof ExploitsApiV1EpssList200Response
     */
    results: Array<EPSS>;
    /**
     * 
     * @type {string}
     * @memberof ExploitsApiV1EpssList200Response
     */
    dt?: string;
    /**
     * 
     * @type {string}
     * @memberof ExploitsApiV1EpssList200Response
     */
    env?: string;
    /**
     * 
     * @type {string}
     * @memberof ExploitsApiV1EpssList200Response
     */
    revision?: string;
    /**
     * 
     * @type {string}
     * @memberof ExploitsApiV1EpssList200Response
     */
    version?: string;
}
/**
 * 
 * @export
 * @interface ExploitsApiV1FlawDataList200Response
 */
export interface ExploitsApiV1FlawDataList200Response {
    /**
     * 
     * @type {number}
     * @memberof ExploitsApiV1FlawDataList200Response
     */
    count: number;
    /**
     * 
     * @type {string}
     * @memberof ExploitsApiV1FlawDataList200Response
     */
    next?: string | null;
    /**
     * 
     * @type {string}
     * @memberof ExploitsApiV1FlawDataList200Response
     */
    previous?: string | null;
    /**
     * 
     * @type {Array<FlawV1ReportData>}
     * @memberof ExploitsApiV1FlawDataList200Response
     */
    results: Array<FlawV1ReportData>;
    /**
     * 
     * @type {string}
     * @memberof ExploitsApiV1FlawDataList200Response
     */
    dt?: string;
    /**
     * 
     * @type {string}
     * @memberof ExploitsApiV1FlawDataList200Response
     */
    env?: string;
    /**
     * 
     * @type {string}
     * @memberof ExploitsApiV1FlawDataList200Response
     */
    revision?: string;
    /**
     * 
     * @type {string}
     * @memberof ExploitsApiV1FlawDataList200Response
     */
    version?: string;
}
/**
 * 
 * @export
 * @interface ExploitsApiV1ReportDataList200Response
 */
export interface ExploitsApiV1ReportDataList200Response {
    /**
     * 
     * @type {number}
     * @memberof ExploitsApiV1ReportDataList200Response
     */
    count: number;
    /**
     * 
     * @type {string}
     * @memberof ExploitsApiV1ReportDataList200Response
     */
    next?: string | null;
    /**
     * 
     * @type {string}
     * @memberof ExploitsApiV1ReportDataList200Response
     */
    previous?: string | null;
    /**
     * 
     * @type {Array<ExploitOnlyReportData>}
     * @memberof ExploitsApiV1ReportDataList200Response
     */
    results: Array<ExploitOnlyReportData>;
    /**
     * 
     * @type {string}
     * @memberof ExploitsApiV1ReportDataList200Response
     */
    dt?: string;
    /**
     * 
     * @type {string}
     * @memberof ExploitsApiV1ReportDataList200Response
     */
    env?: string;
    /**
     * 
     * @type {string}
     * @memberof ExploitsApiV1ReportDataList200Response
     */
    revision?: string;
    /**
     * 
     * @type {string}
     * @memberof ExploitsApiV1ReportDataList200Response
     */
    version?: string;
}
/**
 * 
 * @export
 * @interface ExploitsApiV1ReportDateRetrieve200Response
 */
export interface ExploitsApiV1ReportDateRetrieve200Response {
    /**
     * 
     * @type {Array<object>}
     * @memberof ExploitsApiV1ReportDateRetrieve200Response
     */
    actionRequired?: Array<object>;
    /**
     * 
     * @type {string}
     * @memberof ExploitsApiV1ReportDateRetrieve200Response
     */
    cutoffDate?: string;
    /**
     * 
     * @type {string}
     * @memberof ExploitsApiV1ReportDateRetrieve200Response
     */
    dt?: string;
    /**
     * 
     * @type {string}
     * @memberof ExploitsApiV1ReportDateRetrieve200Response
     */
    env?: string;
    /**
     * 
     * @type {number}
     * @memberof ExploitsApiV1ReportDateRetrieve200Response
     */
    evaluatedCves?: number;
    /**
     * 
     * @type {Array<object>}
     * @memberof ExploitsApiV1ReportDateRetrieve200Response
     */
    noAction?: Array<object>;
    /**
     * 
     * @type {Array<object>}
     * @memberof ExploitsApiV1ReportDateRetrieve200Response
     */
    notRelevant?: Array<object>;
    /**
     * 
     * @type {string}
     * @memberof ExploitsApiV1ReportDateRetrieve200Response
     */
    revision?: string;
    /**
     * 
     * @type {string}
     * @memberof ExploitsApiV1ReportDateRetrieve200Response
     */
    version?: string;
}
/**
 * 
 * @export
 * @interface ExploitsApiV1ReportExplanationsRetrieve200Response
 */
export interface ExploitsApiV1ReportExplanationsRetrieve200Response {
    /**
     * 
     * @type {string}
     * @memberof ExploitsApiV1ReportExplanationsRetrieve200Response
     */
    dt?: string;
    /**
     * 
     * @type {string}
     * @memberof ExploitsApiV1ReportExplanationsRetrieve200Response
     */
    env?: string;
    /**
     * 
     * @type {Array<object>}
     * @memberof ExploitsApiV1ReportExplanationsRetrieve200Response
     */
    explanations?: Array<object>;
    /**
     * 
     * @type {number}
     * @memberof ExploitsApiV1ReportExplanationsRetrieve200Response
     */
    pageSize?: number;
    /**
     * 
     * @type {string}
     * @memberof ExploitsApiV1ReportExplanationsRetrieve200Response
     */
    revision?: string;
    /**
     * 
     * @type {string}
     * @memberof ExploitsApiV1ReportExplanationsRetrieve200Response
     */
    version?: string;
}
/**
 * 
 * @export
 * @interface ExploitsApiV1ReportPendingRetrieve200Response
 */
export interface ExploitsApiV1ReportPendingRetrieve200Response {
    /**
     * 
     * @type {string}
     * @memberof ExploitsApiV1ReportPendingRetrieve200Response
     */
    dt?: string;
    /**
     * 
     * @type {string}
     * @memberof ExploitsApiV1ReportPendingRetrieve200Response
     */
    env?: string;
    /**
     * 
     * @type {Array<object>}
     * @memberof ExploitsApiV1ReportPendingRetrieve200Response
     */
    pendingActions?: Array<object>;
    /**
     * 
     * @type {number}
     * @memberof ExploitsApiV1ReportPendingRetrieve200Response
     */
    pendingActionsCount?: number;
    /**
     * 
     * @type {string}
     * @memberof ExploitsApiV1ReportPendingRetrieve200Response
     */
    revision?: string;
    /**
     * 
     * @type {string}
     * @memberof ExploitsApiV1ReportPendingRetrieve200Response
     */
    version?: string;
}
/**
 * 
 * @export
 * @interface ExploitsApiV1StatusRetrieve200Response
 */
export interface ExploitsApiV1StatusRetrieve200Response {
    /**
     * 
     * @type {string}
     * @memberof ExploitsApiV1StatusRetrieve200Response
     */
    dt?: string;
    /**
     * 
     * @type {string}
     * @memberof ExploitsApiV1StatusRetrieve200Response
     */
    env?: string;
    /**
     * 
     * @type {number}
     * @memberof ExploitsApiV1StatusRetrieve200Response
     */
    exploitsCount?: number;
    /**
     * 
     * @type {number}
     * @memberof ExploitsApiV1StatusRetrieve200Response
     */
    exploitsCountRelevant?: number;
    /**
     * 
     * @type {number}
     * @memberof ExploitsApiV1StatusRetrieve200Response
     */
    lastExploit?: number;
    /**
     * 
     * @type {string}
     * @memberof ExploitsApiV1StatusRetrieve200Response
     */
    revision?: string;
    /**
     * 
     * @type {string}
     * @memberof ExploitsApiV1StatusRetrieve200Response
     */
    version?: string;
}
/**
 * 
 * @export
 * @interface ExploitsApiV1SupportedProductsList200Response
 */
export interface ExploitsApiV1SupportedProductsList200Response {
    /**
     * 
     * @type {number}
     * @memberof ExploitsApiV1SupportedProductsList200Response
     */
    count: number;
    /**
     * 
     * @type {string}
     * @memberof ExploitsApiV1SupportedProductsList200Response
     */
    next?: string | null;
    /**
     * 
     * @type {string}
     * @memberof ExploitsApiV1SupportedProductsList200Response
     */
    previous?: string | null;
    /**
     * 
     * @type {Array<SupportedProducts>}
     * @memberof ExploitsApiV1SupportedProductsList200Response
     */
    results: Array<SupportedProducts>;
    /**
     * 
     * @type {string}
     * @memberof ExploitsApiV1SupportedProductsList200Response
     */
    dt?: string;
    /**
     * 
     * @type {string}
     * @memberof ExploitsApiV1SupportedProductsList200Response
     */
    env?: string;
    /**
     * 
     * @type {string}
     * @memberof ExploitsApiV1SupportedProductsList200Response
     */
    revision?: string;
    /**
     * 
     * @type {string}
     * @memberof ExploitsApiV1SupportedProductsList200Response
     */
    version?: string;
}
/**
 * 
 * @export
 * @interface ExploitsApiV2betaFlawDataList200Response
 */
export interface ExploitsApiV2betaFlawDataList200Response {
    /**
     * 
     * @type {number}
     * @memberof ExploitsApiV2betaFlawDataList200Response
     */
    count: number;
    /**
     * 
     * @type {string}
     * @memberof ExploitsApiV2betaFlawDataList200Response
     */
    next?: string | null;
    /**
     * 
     * @type {string}
     * @memberof ExploitsApiV2betaFlawDataList200Response
     */
    previous?: string | null;
    /**
     * 
     * @type {Array<FlawReportData>}
     * @memberof ExploitsApiV2betaFlawDataList200Response
     */
    results: Array<FlawReportData>;
    /**
     * 
     * @type {string}
     * @memberof ExploitsApiV2betaFlawDataList200Response
     */
    dt?: string;
    /**
     * 
     * @type {string}
     * @memberof ExploitsApiV2betaFlawDataList200Response
     */
    env?: string;
    /**
     * 
     * @type {string}
     * @memberof ExploitsApiV2betaFlawDataList200Response
     */
    revision?: string;
    /**
     * 
     * @type {string}
     * @memberof ExploitsApiV2betaFlawDataList200Response
     */
    version?: string;
}
/**
 * serialize flaw model
 * @export
 * @interface Flaw
 */
export interface Flaw {
    /**
     * 
     * @type {string}
     * @memberof Flaw
     */
    readonly uuid: string;
    /**
     * 
     * @type {string}
     * @memberof Flaw
     */
    cveId?: string | null;
    /**
     * 
     * @type {AffectImpact}
     * @memberof Flaw
     */
    impact?: AffectImpact;
    /**
     * 
     * @type {Array<string>}
     * @memberof Flaw
     */
    components?: Array<string>;
    /**
     * 
     * @type {string}
     * @memberof Flaw
     */
    title: string;
    /**
     * 
     * @type {Array<string>}
     * @memberof Flaw
     */
    readonly trackers: Array<string>;
    /**
     * 
     * @type {string}
     * @memberof Flaw
     */
    commentZero: string;
    /**
     * 
     * @type {string}
     * @memberof Flaw
     */
    cveDescription?: string;
    /**
     * 
     * @type {FlawRequiresCveDescription}
     * @memberof Flaw
     */
    requiresCveDescription?: FlawRequiresCveDescription;
    /**
     * 
     * @type {string}
     * @memberof Flaw
     */
    statement?: string;
    /**
     * 
     * @type {string}
     * @memberof Flaw
     */
    cweId?: string;
    /**
     * 
     * @type {string}
     * @memberof Flaw
     */
    unembargoDt?: string | null;
    /**
     * 
     * @type {FlawSource}
     * @memberof Flaw
     */
    source?: FlawSource;
    /**
     * 
     * @type {string}
     * @memberof Flaw
     */
    reportedDt?: string | null;
    /**
     * 
     * @type {string}
     * @memberof Flaw
     */
    mitigation?: string;
    /**
     * 
     * @type {FlawMajorIncidentState}
     * @memberof Flaw
     */
    majorIncidentState?: FlawMajorIncidentState;
    /**
     * 
     * @type {string}
     * @memberof Flaw
     */
    majorIncidentStartDt?: string | null;
    /**
     * 
     * @type {FlawNistCvssValidation}
     * @memberof Flaw
     */
    nistCvssValidation?: FlawNistCvssValidation;
    /**
     * 
     * @type {Array<Affect>}
     * @memberof Flaw
     */
    readonly affects: Array<Affect>;
    /**
     * 
     * @type {Array<Comment>}
     * @memberof Flaw
     */
    readonly comments: Array<Comment>;
    /**
     * 
     * @type {Array<Package>}
     * @memberof Flaw
     */
    readonly packageVersions: Array<Package>;
    /**
     * 
     * @type {Array<FlawAcknowledgment>}
     * @memberof Flaw
     */
    readonly acknowledgments: Array<FlawAcknowledgment>;
    /**
     * 
     * @type {Array<FlawReference>}
     * @memberof Flaw
     */
    readonly references: Array<FlawReference>;
    /**
     * 
     * @type {Array<FlawCVSS>}
     * @memberof Flaw
     */
    readonly cvssScores: Array<FlawCVSS>;
    /**
     * 
     * @type {Array<FlawCollaborator>}
     * @memberof Flaw
     */
    readonly labels: Array<FlawCollaborator>;
    /**
     * The embargoed boolean attribute is technically read-only as it just indirectly modifies the ACLs but is mandatory as it controls the access to the resource.
     * @type {boolean}
     * @memberof Flaw
     */
    embargoed: boolean;
    /**
     * 
     * @type {string}
     * @memberof Flaw
     */
    readonly createdDt: string;
    /**
     * The updated_dt timestamp attribute is mandatory on update as it is used to detect mit-air collisions.
     * @type {string}
     * @memberof Flaw
     */
    updatedDt: string;
    /**
     * 
     * @type {FlawClassification}
     * @memberof Flaw
     */
    classification: FlawClassification;
    /**
     * 
     * @type {string}
     * @memberof Flaw
     */
    groupKey?: string;
    /**
     * 
     * @type {string}
     * @memberof Flaw
     */
    owner?: string;
    /**
     * 
     * @type {string}
     * @memberof Flaw
     */
    readonly taskKey: string | null;
    /**
     * 
     * @type {string}
     * @memberof Flaw
     */
    teamId?: string;
    /**
     * 
     * @type {Array<Alert>}
     * @memberof Flaw
     */
    readonly alerts: Array<Alert>;
}
/**
 * FlawAcknowledgment serializer
 * @export
 * @interface FlawAcknowledgment
 */
export interface FlawAcknowledgment {
    /**
     * 
     * @type {string}
     * @memberof FlawAcknowledgment
     */
    name: string;
    /**
     * 
     * @type {string}
     * @memberof FlawAcknowledgment
     */
    affiliation: string;
    /**
     * 
     * @type {boolean}
     * @memberof FlawAcknowledgment
     */
    fromUpstream: boolean;
    /**
     * 
     * @type {string}
     * @memberof FlawAcknowledgment
     */
    flaw: string;
    /**
     * 
     * @type {string}
     * @memberof FlawAcknowledgment
     */
    readonly uuid: string;
    /**
     * The embargoed boolean attribute is technically read-only as it just indirectly modifies the ACLs but is mandatory as it controls the access to the resource.
     * @type {boolean}
     * @memberof FlawAcknowledgment
     */
    embargoed: boolean;
    /**
     * 
     * @type {Array<Alert>}
     * @memberof FlawAcknowledgment
     */
    readonly alerts: Array<Alert>;
    /**
     * 
     * @type {string}
     * @memberof FlawAcknowledgment
     */
    readonly createdDt: string;
    /**
     * The updated_dt timestamp attribute is mandatory on update as it is used to detect mit-air collisions.
     * @type {string}
     * @memberof FlawAcknowledgment
     */
    updatedDt: string;
}
/**
 * FlawAcknowledgment serializer
 * @export
 * @interface FlawAcknowledgmentPostRequest
 */
export interface FlawAcknowledgmentPostRequest {
    /**
     * 
     * @type {string}
     * @memberof FlawAcknowledgmentPostRequest
     */
    name: string;
    /**
     * 
     * @type {string}
     * @memberof FlawAcknowledgmentPostRequest
     */
    affiliation: string;
    /**
     * 
     * @type {boolean}
     * @memberof FlawAcknowledgmentPostRequest
     */
    fromUpstream: boolean;
    /**
     * The embargoed boolean attribute is technically read-only as it just indirectly modifies the ACLs but is mandatory as it controls the access to the resource.
     * @type {boolean}
     * @memberof FlawAcknowledgmentPostRequest
     */
    embargoed: boolean;
}
/**
 * FlawAcknowledgment serializer
 * @export
 * @interface FlawAcknowledgmentPutRequest
 */
export interface FlawAcknowledgmentPutRequest {
    /**
     * 
     * @type {string}
     * @memberof FlawAcknowledgmentPutRequest
     */
    name: string;
    /**
     * 
     * @type {string}
     * @memberof FlawAcknowledgmentPutRequest
     */
    affiliation: string;
    /**
     * 
     * @type {boolean}
     * @memberof FlawAcknowledgmentPutRequest
     */
    fromUpstream: boolean;
    /**
     * The embargoed boolean attribute is technically read-only as it just indirectly modifies the ACLs but is mandatory as it controls the access to the resource.
     * @type {boolean}
     * @memberof FlawAcknowledgmentPutRequest
     */
    embargoed: boolean;
    /**
     * The updated_dt timestamp attribute is mandatory on update as it is used to detect mit-air collisions.
     * @type {string}
     * @memberof FlawAcknowledgmentPutRequest
     */
    updatedDt: string;
}
/**
 * FlawAcknowledgment serializer
 * @export
 * @interface FlawAcknowledgmentRequest
 */
export interface FlawAcknowledgmentRequest {
    /**
     * 
     * @type {string}
     * @memberof FlawAcknowledgmentRequest
     */
    name: string;
    /**
     * 
     * @type {string}
     * @memberof FlawAcknowledgmentRequest
     */
    affiliation: string;
    /**
     * 
     * @type {boolean}
     * @memberof FlawAcknowledgmentRequest
     */
    fromUpstream: boolean;
    /**
     * 
     * @type {string}
     * @memberof FlawAcknowledgmentRequest
     */
    flaw: string;
    /**
     * The embargoed boolean attribute is technically read-only as it just indirectly modifies the ACLs but is mandatory as it controls the access to the resource.
     * @type {boolean}
     * @memberof FlawAcknowledgmentRequest
     */
    embargoed: boolean;
    /**
     * The updated_dt timestamp attribute is mandatory on update as it is used to detect mit-air collisions.
     * @type {string}
     * @memberof FlawAcknowledgmentRequest
     */
    updatedDt: string;
}
/**
 * FlawCVSS serializer
 * @export
 * @interface FlawCVSS
 */
export interface FlawCVSS {
    /**
     * 
     * @type {string}
     * @memberof FlawCVSS
     */
    flaw?: string;
    /**
     * 
     * @type {string}
     * @memberof FlawCVSS
     */
    comment?: string | null;
    /**
     * 
     * @type {CvssVersionEnum}
     * @memberof FlawCVSS
     */
    cvssVersion: CvssVersionEnum;
    /**
     * 
     * @type {IssuerEnum}
     * @memberof FlawCVSS
     */
    issuer?: IssuerEnum;
    /**
     * 
     * @type {number}
     * @memberof FlawCVSS
     */
    readonly score: number;
    /**
     * 
     * @type {string}
     * @memberof FlawCVSS
     */
    readonly uuid: string;
    /**
     * 
     * @type {string}
     * @memberof FlawCVSS
     */
    vector: string;
    /**
     * The embargoed boolean attribute is technically read-only as it just indirectly modifies the ACLs but is mandatory as it controls the access to the resource.
     * @type {boolean}
     * @memberof FlawCVSS
     */
    embargoed: boolean;
    /**
     * 
     * @type {Array<Alert>}
     * @memberof FlawCVSS
     */
    readonly alerts: Array<Alert>;
    /**
     * 
     * @type {string}
     * @memberof FlawCVSS
     */
    readonly createdDt: string;
    /**
     * The updated_dt timestamp attribute is mandatory on update as it is used to detect mit-air collisions.
     * @type {string}
     * @memberof FlawCVSS
     */
    updatedDt: string;
}
/**
 * FlawCVSS serializer
 * @export
 * @interface FlawCVSSPostRequest
 */
export interface FlawCVSSPostRequest {
    /**
     * 
     * @type {string}
     * @memberof FlawCVSSPostRequest
     */
    comment?: string | null;
    /**
     * 
     * @type {CvssVersionEnum}
     * @memberof FlawCVSSPostRequest
     */
    cvssVersion: CvssVersionEnum;
    /**
     * 
     * @type {IssuerEnum}
     * @memberof FlawCVSSPostRequest
     */
    issuer?: IssuerEnum;
    /**
     * 
     * @type {string}
     * @memberof FlawCVSSPostRequest
     */
    vector: string;
    /**
     * The embargoed boolean attribute is technically read-only as it just indirectly modifies the ACLs but is mandatory as it controls the access to the resource.
     * @type {boolean}
     * @memberof FlawCVSSPostRequest
     */
    embargoed: boolean;
}
/**
 * FlawCVSS serializer
 * @export
 * @interface FlawCVSSPutRequest
 */
export interface FlawCVSSPutRequest {
    /**
     * 
     * @type {string}
     * @memberof FlawCVSSPutRequest
     */
    comment?: string | null;
    /**
     * 
     * @type {CvssVersionEnum}
     * @memberof FlawCVSSPutRequest
     */
    cvssVersion: CvssVersionEnum;
    /**
     * 
     * @type {IssuerEnum}
     * @memberof FlawCVSSPutRequest
     */
    issuer?: IssuerEnum;
    /**
     * 
     * @type {string}
     * @memberof FlawCVSSPutRequest
     */
    vector: string;
    /**
     * The embargoed boolean attribute is technically read-only as it just indirectly modifies the ACLs but is mandatory as it controls the access to the resource.
     * @type {boolean}
     * @memberof FlawCVSSPutRequest
     */
    embargoed: boolean;
    /**
     * The updated_dt timestamp attribute is mandatory on update as it is used to detect mit-air collisions.
     * @type {string}
     * @memberof FlawCVSSPutRequest
     */
    updatedDt: string;
}
/**
 * FlawCVSS serializer
 * @export
 * @interface FlawCVSSRequest
 */
export interface FlawCVSSRequest {
    /**
     * 
     * @type {string}
     * @memberof FlawCVSSRequest
     */
    flaw?: string;
    /**
     * 
     * @type {string}
     * @memberof FlawCVSSRequest
     */
    comment?: string | null;
    /**
     * 
     * @type {CvssVersionEnum}
     * @memberof FlawCVSSRequest
     */
    cvssVersion: CvssVersionEnum;
    /**
     * 
     * @type {IssuerEnum}
     * @memberof FlawCVSSRequest
     */
    issuer?: IssuerEnum;
    /**
     * 
     * @type {string}
     * @memberof FlawCVSSRequest
     */
    vector: string;
    /**
     * The embargoed boolean attribute is technically read-only as it just indirectly modifies the ACLs but is mandatory as it controls the access to the resource.
     * @type {boolean}
     * @memberof FlawCVSSRequest
     */
    embargoed: boolean;
    /**
     * The updated_dt timestamp attribute is mandatory on update as it is used to detect mit-air collisions.
     * @type {string}
     * @memberof FlawCVSSRequest
     */
    updatedDt: string;
}
/**
 * Abstract serializer for FlawCVSS and AffectCVSS serializer
 * @export
 * @interface FlawCVSSV2
 */
export interface FlawCVSSV2 {
    /**
     * 
     * @type {string}
     * @memberof FlawCVSSV2
     */
    flaw?: string;
    /**
     * 
     * @type {string}
     * @memberof FlawCVSSV2
     */
    comment?: string | null;
    /**
     * 
     * @type {CvssVersionEnum}
     * @memberof FlawCVSSV2
     */
    cvssVersion: CvssVersionEnum;
    /**
     * 
     * @type {IssuerEnum}
     * @memberof FlawCVSSV2
     */
    readonly issuer: IssuerEnum;
    /**
     * 
     * @type {number}
     * @memberof FlawCVSSV2
     */
    readonly score: number;
    /**
     * 
     * @type {string}
     * @memberof FlawCVSSV2
     */
    readonly uuid: string;
    /**
     * 
     * @type {string}
     * @memberof FlawCVSSV2
     */
    vector: string;
    /**
     * The embargoed boolean attribute is technically read-only as it just indirectly modifies the ACLs but is mandatory as it controls the access to the resource.
     * @type {boolean}
     * @memberof FlawCVSSV2
     */
    embargoed: boolean;
    /**
     * 
     * @type {Array<Alert>}
     * @memberof FlawCVSSV2
     */
    readonly alerts: Array<Alert>;
    /**
     * 
     * @type {string}
     * @memberof FlawCVSSV2
     */
    readonly createdDt: string;
    /**
     * The updated_dt timestamp attribute is mandatory on update as it is used to detect mit-air collisions.
     * @type {string}
     * @memberof FlawCVSSV2
     */
    updatedDt: string;
}
/**
 * Abstract serializer for FlawCVSS and AffectCVSS serializer
 * @export
 * @interface FlawCVSSV2PostRequest
 */
export interface FlawCVSSV2PostRequest {
    /**
     * 
     * @type {string}
     * @memberof FlawCVSSV2PostRequest
     */
    comment?: string | null;
    /**
     * 
     * @type {CvssVersionEnum}
     * @memberof FlawCVSSV2PostRequest
     */
    cvssVersion: CvssVersionEnum;
    /**
     * 
     * @type {string}
     * @memberof FlawCVSSV2PostRequest
     */
    vector: string;
    /**
     * The embargoed boolean attribute is technically read-only as it just indirectly modifies the ACLs but is mandatory as it controls the access to the resource.
     * @type {boolean}
     * @memberof FlawCVSSV2PostRequest
     */
    embargoed: boolean;
}
/**
 * Abstract serializer for FlawCVSS and AffectCVSS serializer
 * @export
 * @interface FlawCVSSV2PutRequest
 */
export interface FlawCVSSV2PutRequest {
    /**
     * 
     * @type {string}
     * @memberof FlawCVSSV2PutRequest
     */
    comment?: string | null;
    /**
     * 
     * @type {CvssVersionEnum}
     * @memberof FlawCVSSV2PutRequest
     */
    cvssVersion: CvssVersionEnum;
    /**
     * 
     * @type {string}
     * @memberof FlawCVSSV2PutRequest
     */
    vector: string;
    /**
     * The embargoed boolean attribute is technically read-only as it just indirectly modifies the ACLs but is mandatory as it controls the access to the resource.
     * @type {boolean}
     * @memberof FlawCVSSV2PutRequest
     */
    embargoed: boolean;
    /**
     * The updated_dt timestamp attribute is mandatory on update as it is used to detect mit-air collisions.
     * @type {string}
     * @memberof FlawCVSSV2PutRequest
     */
    updatedDt: string;
}
/**
 * 
 * @export
 * @interface FlawClassification
 */
export interface FlawClassification {
    /**
     * 
     * @type {string}
     * @memberof FlawClassification
     */
    workflow?: string;
    /**
     * 
     * @type {string}
     * @memberof FlawClassification
     */
    state?: FlawClassificationStateEnum;
}


/**
 * @export
 */
export const FlawClassificationStateEnum = {
    Empty: '',
    New: 'NEW',
    Triage: 'TRIAGE',
    PreSecondaryAssessment: 'PRE_SECONDARY_ASSESSMENT',
    SecondaryAssessment: 'SECONDARY_ASSESSMENT',
    Done: 'DONE',
    Rejected: 'REJECTED'
} as const;
export type FlawClassificationStateEnum = typeof FlawClassificationStateEnum[keyof typeof FlawClassificationStateEnum];

/**
 * FlawCollaborator serializer
 * @export
 * @interface FlawCollaborator
 */
export interface FlawCollaborator {
    /**
     * 
     * @type {string}
     * @memberof FlawCollaborator
     */
    readonly uuid: string;
    /**
     * 
     * @type {string}
     * @memberof FlawCollaborator
     */
    label: string;
    /**
     * 
     * @type {StateEnum}
     * @memberof FlawCollaborator
     */
    state?: StateEnum;
    /**
     * 
     * @type {string}
     * @memberof FlawCollaborator
     */
    contributor?: string;
    /**
     * 
     * @type {boolean}
     * @memberof FlawCollaborator
     */
    relevant?: boolean;
    /**
     * 
     * @type {string}
     * @memberof FlawCollaborator
     */
    readonly type: string;
}
/**
 * FlawCollaborator serializer
 * @export
 * @interface FlawCollaboratorPostRequest
 */
export interface FlawCollaboratorPostRequest {
    /**
     * 
     * @type {string}
     * @memberof FlawCollaboratorPostRequest
     */
    label: string;
    /**
     * 
     * @type {StateEnum}
     * @memberof FlawCollaboratorPostRequest
     */
    state?: StateEnum;
    /**
     * 
     * @type {string}
     * @memberof FlawCollaboratorPostRequest
     */
    contributor?: string;
}
/**
 * FlawCollaborator serializer
 * @export
 * @interface FlawCollaboratorRequest
 */
export interface FlawCollaboratorRequest {
    /**
     * 
     * @type {string}
     * @memberof FlawCollaboratorRequest
     */
    flaw: string;
    /**
     * 
     * @type {string}
     * @memberof FlawCollaboratorRequest
     */
    label: string;
    /**
     * 
     * @type {StateEnum}
     * @memberof FlawCollaboratorRequest
     */
    state?: StateEnum;
    /**
     * 
     * @type {string}
     * @memberof FlawCollaboratorRequest
     */
    contributor?: string;
    /**
     * 
     * @type {boolean}
     * @memberof FlawCollaboratorRequest
     */
    relevant?: boolean;
}
/**
 * FlawComment serializer for use by flaw_comments endpoint
 * @export
 * @interface FlawComment
 */
export interface FlawComment {
    /**
     * 
     * @type {string}
     * @memberof FlawComment
     */
    flaw: string;
    /**
     * 
     * @type {string}
     * @memberof FlawComment
     */
    text: string;
    /**
     * 
     * @type {string}
     * @memberof FlawComment
     */
    readonly uuid: string;
    /**
     * 
     * @type {string}
     * @memberof FlawComment
     */
    readonly externalSystemId: string;
    /**
     * 
     * @type {number}
     * @memberof FlawComment
     * @deprecated
     */
    order?: number;
    /**
     * 
     * @type {string}
     * @memberof FlawComment
     */
    creator?: string;
    /**
     * 
     * @type {boolean}
     * @memberof FlawComment
     */
    isPrivate?: boolean;
    /**
     * 
     * @type {Array<Alert>}
     * @memberof FlawComment
     */
    readonly alerts: Array<Alert>;
    /**
     * 
     * @type {string}
     * @memberof FlawComment
     */
    readonly createdDt: string;
    /**
     * The updated_dt timestamp attribute is mandatory on update as it is used to detect mit-air collisions.
     * @type {string}
     * @memberof FlawComment
     */
    updatedDt: string;
    /**
     * The embargoed boolean attribute is technically read-only as it just indirectly modifies the ACLs but is mandatory as it controls the access to the resource.
     * @type {boolean}
     * @memberof FlawComment
     */
    embargoed: boolean;
}
/**
 * FlawComment serializer for use by flaw_comments endpoint
 * @export
 * @interface FlawCommentPostRequest
 */
export interface FlawCommentPostRequest {
    /**
     * 
     * @type {string}
     * @memberof FlawCommentPostRequest
     */
    text: string;
    /**
     * 
     * @type {string}
     * @memberof FlawCommentPostRequest
     */
    creator?: string;
    /**
     * 
     * @type {boolean}
     * @memberof FlawCommentPostRequest
     */
    isPrivate?: boolean;
    /**
     * The embargoed boolean attribute is technically read-only as it just indirectly modifies the ACLs but is mandatory as it controls the access to the resource.
     * @type {boolean}
     * @memberof FlawCommentPostRequest
     */
    embargoed: boolean;
}
/**
 * FlawLabel serializer
 * @export
 * @interface FlawLabel
 */
export interface FlawLabel {
    /**
     * 
     * @type {string}
     * @memberof FlawLabel
     */
    name: string;
    /**
     * 
     * @type {string}
     * @memberof FlawLabel
     */
    readonly type: string;
}
/**
 * @type FlawMajorIncidentState
 * 
 * @export
 */
export type FlawMajorIncidentState = BlankEnum | MajorIncidentStateEnum;
/**
 * @type FlawNistCvssValidation
 * 
 * @export
 */
export type FlawNistCvssValidation = BlankEnum | NistCvssValidationEnum;
/**
 * Package model serializer
 * @export
 * @interface FlawPackageVersion
 */
export interface FlawPackageVersion {
    /**
     * 
     * @type {string}
     * @memberof FlawPackageVersion
     */
    _package: string;
    /**
     * 
     * @type {Array<FlawVersion>}
     * @memberof FlawPackageVersion
     */
    versions: Array<FlawVersion>;
    /**
     * 
     * @type {string}
     * @memberof FlawPackageVersion
     */
    flaw: string;
    /**
     * 
     * @type {string}
     * @memberof FlawPackageVersion
     */
    readonly uuid: string;
    /**
     * The embargoed boolean attribute is technically read-only as it just indirectly modifies the ACLs but is mandatory as it controls the access to the resource.
     * @type {boolean}
     * @memberof FlawPackageVersion
     */
    embargoed: boolean;
    /**
     * 
     * @type {string}
     * @memberof FlawPackageVersion
     */
    readonly createdDt: string;
    /**
     * The updated_dt timestamp attribute is mandatory on update as it is used to detect mit-air collisions.
     * @type {string}
     * @memberof FlawPackageVersion
     */
    updatedDt: string;
}
/**
 * Package model serializer
 * @export
 * @interface FlawPackageVersionPostRequest
 */
export interface FlawPackageVersionPostRequest {
    /**
     * 
     * @type {string}
     * @memberof FlawPackageVersionPostRequest
     */
    _package: string;
    /**
     * 
     * @type {Array<FlawVersionRequest>}
     * @memberof FlawPackageVersionPostRequest
     */
    versions: Array<FlawVersionRequest>;
    /**
     * The embargoed boolean attribute is technically read-only as it just indirectly modifies the ACLs but is mandatory as it controls the access to the resource.
     * @type {boolean}
     * @memberof FlawPackageVersionPostRequest
     */
    embargoed: boolean;
}
/**
 * Package model serializer
 * @export
 * @interface FlawPackageVersionPutRequest
 */
export interface FlawPackageVersionPutRequest {
    /**
     * 
     * @type {string}
     * @memberof FlawPackageVersionPutRequest
     */
    _package: string;
    /**
     * 
     * @type {Array<FlawVersionRequest>}
     * @memberof FlawPackageVersionPutRequest
     */
    versions: Array<FlawVersionRequest>;
    /**
     * The embargoed boolean attribute is technically read-only as it just indirectly modifies the ACLs but is mandatory as it controls the access to the resource.
     * @type {boolean}
     * @memberof FlawPackageVersionPutRequest
     */
    embargoed: boolean;
    /**
     * The updated_dt timestamp attribute is mandatory on update as it is used to detect mit-air collisions.
     * @type {string}
     * @memberof FlawPackageVersionPutRequest
     */
    updatedDt: string;
}
/**
 * serialize flaw model
 * @export
 * @interface FlawPostRequest
 */
export interface FlawPostRequest {
    /**
     * 
     * @type {string}
     * @memberof FlawPostRequest
     */
    cveId?: string | null;
    /**
     * 
     * @type {AffectImpact}
     * @memberof FlawPostRequest
     */
    impact?: AffectImpact;
    /**
     * 
     * @type {Array<string>}
     * @memberof FlawPostRequest
     */
    components?: Array<string>;
    /**
     * 
     * @type {string}
     * @memberof FlawPostRequest
     */
    title: string;
    /**
     * 
     * @type {string}
     * @memberof FlawPostRequest
     */
    commentZero: string;
    /**
     * 
     * @type {string}
     * @memberof FlawPostRequest
     */
    cveDescription?: string;
    /**
     * 
     * @type {FlawRequiresCveDescription}
     * @memberof FlawPostRequest
     */
    requiresCveDescription?: FlawRequiresCveDescription;
    /**
     * 
     * @type {string}
     * @memberof FlawPostRequest
     */
    statement?: string;
    /**
     * 
     * @type {string}
     * @memberof FlawPostRequest
     */
    cweId?: string;
    /**
     * 
     * @type {string}
     * @memberof FlawPostRequest
     */
    unembargoDt?: string | null;
    /**
     * 
     * @type {FlawSource}
     * @memberof FlawPostRequest
     */
    source?: FlawSource;
    /**
     * 
     * @type {string}
     * @memberof FlawPostRequest
     */
    reportedDt?: string | null;
    /**
     * 
     * @type {string}
     * @memberof FlawPostRequest
     */
    mitigation?: string;
    /**
     * 
     * @type {FlawMajorIncidentState}
     * @memberof FlawPostRequest
     */
    majorIncidentState?: FlawMajorIncidentState;
    /**
     * 
     * @type {string}
     * @memberof FlawPostRequest
     */
    majorIncidentStartDt?: string | null;
    /**
     * 
     * @type {FlawNistCvssValidation}
     * @memberof FlawPostRequest
     */
    nistCvssValidation?: FlawNistCvssValidation;
    /**
     * The embargoed boolean attribute is technically read-only as it just indirectly modifies the ACLs but is mandatory as it controls the access to the resource.
     * @type {boolean}
     * @memberof FlawPostRequest
     */
    embargoed: boolean;
    /**
     * 
     * @type {string}
     * @memberof FlawPostRequest
     */
    groupKey?: string;
    /**
     * 
     * @type {string}
     * @memberof FlawPostRequest
     */
    owner?: string;
    /**
     * 
     * @type {string}
     * @memberof FlawPostRequest
     */
    teamId?: string;
}
/**
 * FlawReference serializer
 * @export
 * @interface FlawReference
 */
export interface FlawReference {
    /**
     * 
     * @type {string}
     * @memberof FlawReference
     */
    description?: string;
    /**
     * 
     * @type {string}
     * @memberof FlawReference
     */
    flaw: string;
    /**
     * 
     * @type {FlawReferenceType}
     * @memberof FlawReference
     */
    type?: FlawReferenceType;
    /**
     * 
     * @type {string}
     * @memberof FlawReference
     */
    url: string;
    /**
     * 
     * @type {string}
     * @memberof FlawReference
     */
    readonly uuid: string;
    /**
     * The embargoed boolean attribute is technically read-only as it just indirectly modifies the ACLs but is mandatory as it controls the access to the resource.
     * @type {boolean}
     * @memberof FlawReference
     */
    embargoed: boolean;
    /**
     * 
     * @type {Array<Alert>}
     * @memberof FlawReference
     */
    readonly alerts: Array<Alert>;
    /**
     * 
     * @type {string}
     * @memberof FlawReference
     */
    readonly createdDt: string;
    /**
     * The updated_dt timestamp attribute is mandatory on update as it is used to detect mit-air collisions.
     * @type {string}
     * @memberof FlawReference
     */
    updatedDt: string;
}
/**
 * FlawReference serializer
 * @export
 * @interface FlawReferencePostRequest
 */
export interface FlawReferencePostRequest {
    /**
     * 
     * @type {string}
     * @memberof FlawReferencePostRequest
     */
    description?: string;
    /**
     * 
     * @type {FlawReferenceType}
     * @memberof FlawReferencePostRequest
     */
    type?: FlawReferenceType;
    /**
     * 
     * @type {string}
     * @memberof FlawReferencePostRequest
     */
    url: string;
    /**
     * The embargoed boolean attribute is technically read-only as it just indirectly modifies the ACLs but is mandatory as it controls the access to the resource.
     * @type {boolean}
     * @memberof FlawReferencePostRequest
     */
    embargoed: boolean;
}
/**
 * FlawReference serializer
 * @export
 * @interface FlawReferencePutRequest
 */
export interface FlawReferencePutRequest {
    /**
     * 
     * @type {string}
     * @memberof FlawReferencePutRequest
     */
    description?: string;
    /**
     * 
     * @type {FlawReferenceType}
     * @memberof FlawReferencePutRequest
     */
    type?: FlawReferenceType;
    /**
     * 
     * @type {string}
     * @memberof FlawReferencePutRequest
     */
    url: string;
    /**
     * The embargoed boolean attribute is technically read-only as it just indirectly modifies the ACLs but is mandatory as it controls the access to the resource.
     * @type {boolean}
     * @memberof FlawReferencePutRequest
     */
    embargoed: boolean;
    /**
     * The updated_dt timestamp attribute is mandatory on update as it is used to detect mit-air collisions.
     * @type {string}
     * @memberof FlawReferencePutRequest
     */
    updatedDt: string;
}
/**
 * FlawReference serializer
 * @export
 * @interface FlawReferenceRequest
 */
export interface FlawReferenceRequest {
    /**
     * 
     * @type {string}
     * @memberof FlawReferenceRequest
     */
    description?: string;
    /**
     * 
     * @type {string}
     * @memberof FlawReferenceRequest
     */
    flaw: string;
    /**
     * 
     * @type {FlawReferenceType}
     * @memberof FlawReferenceRequest
     */
    type?: FlawReferenceType;
    /**
     * 
     * @type {string}
     * @memberof FlawReferenceRequest
     */
    url: string;
    /**
     * The embargoed boolean attribute is technically read-only as it just indirectly modifies the ACLs but is mandatory as it controls the access to the resource.
     * @type {boolean}
     * @memberof FlawReferenceRequest
     */
    embargoed: boolean;
    /**
     * The updated_dt timestamp attribute is mandatory on update as it is used to detect mit-air collisions.
     * @type {string}
     * @memberof FlawReferenceRequest
     */
    updatedDt: string;
}

/**
 * 
 * @export
 */
export const FlawReferenceType = {
    Article: 'ARTICLE',
    External: 'EXTERNAL',
    Source: 'SOURCE',
    Upstream: 'UPSTREAM'
} as const;
export type FlawReferenceType = typeof FlawReferenceType[keyof typeof FlawReferenceType];

/**
 * 
 * @export
 * @interface FlawReportData
 */
export interface FlawReportData {
    /**
     * 
     * @type {string}
     * @memberof FlawReportData
     */
    cveId?: string | null;
    /**
     * 
     * @type {Array<AffectReportData>}
     * @memberof FlawReportData
     */
    affects?: Array<AffectReportData>;
}
/**
 * serialize flaw model
 * @export
 * @interface FlawRequest
 */
export interface FlawRequest {
    /**
     * 
     * @type {string}
     * @memberof FlawRequest
     */
    cveId?: string | null;
    /**
     * 
     * @type {AffectImpact}
     * @memberof FlawRequest
     */
    impact?: AffectImpact;
    /**
     * 
     * @type {Array<string>}
     * @memberof FlawRequest
     */
    components?: Array<string>;
    /**
     * 
     * @type {string}
     * @memberof FlawRequest
     */
    title: string;
    /**
     * 
     * @type {string}
     * @memberof FlawRequest
     */
    commentZero: string;
    /**
     * 
     * @type {string}
     * @memberof FlawRequest
     */
    cveDescription?: string;
    /**
     * 
     * @type {FlawRequiresCveDescription}
     * @memberof FlawRequest
     */
    requiresCveDescription?: FlawRequiresCveDescription;
    /**
     * 
     * @type {string}
     * @memberof FlawRequest
     */
    statement?: string;
    /**
     * 
     * @type {string}
     * @memberof FlawRequest
     */
    cweId?: string;
    /**
     * 
     * @type {string}
     * @memberof FlawRequest
     */
    unembargoDt?: string | null;
    /**
     * 
     * @type {FlawSource}
     * @memberof FlawRequest
     */
    source?: FlawSource;
    /**
     * 
     * @type {string}
     * @memberof FlawRequest
     */
    reportedDt?: string | null;
    /**
     * 
     * @type {string}
     * @memberof FlawRequest
     */
    mitigation?: string;
    /**
     * 
     * @type {FlawMajorIncidentState}
     * @memberof FlawRequest
     */
    majorIncidentState?: FlawMajorIncidentState;
    /**
     * 
     * @type {string}
     * @memberof FlawRequest
     */
    majorIncidentStartDt?: string | null;
    /**
     * 
     * @type {FlawNistCvssValidation}
     * @memberof FlawRequest
     */
    nistCvssValidation?: FlawNistCvssValidation;
    /**
     * The embargoed boolean attribute is technically read-only as it just indirectly modifies the ACLs but is mandatory as it controls the access to the resource.
     * @type {boolean}
     * @memberof FlawRequest
     */
    embargoed: boolean;
    /**
     * The updated_dt timestamp attribute is mandatory on update as it is used to detect mit-air collisions.
     * @type {string}
     * @memberof FlawRequest
     */
    updatedDt: string;
    /**
     * 
     * @type {string}
     * @memberof FlawRequest
     */
    groupKey?: string;
    /**
     * 
     * @type {string}
     * @memberof FlawRequest
     */
    owner?: string;
    /**
     * 
     * @type {string}
     * @memberof FlawRequest
     */
    teamId?: string;
}
/**
 * @type FlawRequiresCveDescription
 * 
 * @export
 */
export type FlawRequiresCveDescription = BlankEnum | RequiresCveDescriptionEnum;
/**
 * @type FlawSource
 * 
 * @export
 */
export type FlawSource = BlankEnum | FlawSourceEnum;

/**
 * 
 * @export
 */
export const FlawSourceEnum = {
    Adobe: 'ADOBE',
    Apple: 'APPLE',
    Asf: 'ASF',
    Bind: 'BIND',
    Bk: 'BK',
    Bugtraq: 'BUGTRAQ',
    Bugzilla: 'BUGZILLA',
    Cert: 'CERT',
    Certifi: 'CERTIFI',
    Corelabs: 'CORELABS',
    Customer: 'CUSTOMER',
    Cve: 'CVE',
    Cveorg: 'CVEORG',
    Dailydave: 'DAILYDAVE',
    Debian: 'DEBIAN',
    Distros: 'DISTROS',
    Fedora: 'FEDORA',
    Fetchmail: 'FETCHMAIL',
    Freedesktop: 'FREEDESKTOP',
    Freeradius: 'FREERADIUS',
    Frsirt: 'FRSIRT',
    Fulldisclosure: 'FULLDISCLOSURE',
    Gaim: 'GAIM',
    Gentoo: 'GENTOO',
    Gentoobz: 'GENTOOBZ',
    Git: 'GIT',
    Gnome: 'GNOME',
    Gnupg: 'GNUPG',
    Google: 'GOOGLE',
    Hp: 'HP',
    HwVendor: 'HW_VENDOR',
    Ibm: 'IBM',
    Idefense: 'IDEFENSE',
    Internet: 'INTERNET',
    Isc: 'ISC',
    Isec: 'ISEC',
    It: 'IT',
    Jboss: 'JBOSS',
    Jpcert: 'JPCERT',
    Kernelbugzilla: 'KERNELBUGZILLA',
    Kernelsec: 'KERNELSEC',
    Lkml: 'LKML',
    Lwn: 'LWN',
    Macromedia: 'MACROMEDIA',
    Mageia: 'MAGEIA',
    Mailinglist: 'MAILINGLIST',
    Milw0Rm: 'MILW0RM',
    Mit: 'MIT',
    Mitre: 'MITRE',
    Mozilla: 'MOZILLA',
    Muttdev: 'MUTTDEV',
    Netdev: 'NETDEV',
    Niscc: 'NISCC',
    Nvd: 'NVD',
    Ocert: 'OCERT',
    Openoffice: 'OPENOFFICE',
    Openssl: 'OPENSSL',
    Opensuse: 'OPENSUSE',
    Oracle: 'ORACLE',
    Oss: 'OSS',
    Osssecurity: 'OSSSECURITY',
    Osv: 'OSV',
    Php: 'PHP',
    Pidgin: 'PIDGIN',
    Postgresql: 'POSTGRESQL',
    Press: 'PRESS',
    Real: 'REAL',
    Redhat: 'REDHAT',
    Researcher: 'RESEARCHER',
    Rt: 'RT',
    Samba: 'SAMBA',
    Secalert: 'SECALERT',
    Secunia: 'SECUNIA',
    Securityfocus: 'SECURITYFOCUS',
    Sko: 'SKO',
    Squid: 'SQUID',
    Squirrelmail: 'SQUIRRELMAIL',
    Sun: 'SUN',
    Sunsolve: 'SUNSOLVE',
    Suse: 'SUSE',
    Twitter: 'TWITTER',
    Ubuntu: 'UBUNTU',
    Upstream: 'UPSTREAM',
    Vendorsec: 'VENDORSEC',
    Vulnwatch: 'VULNWATCH',
    Wireshark: 'WIRESHARK',
    Xchat: 'XCHAT',
    Xen: 'XEN',
    Xpdf: 'XPDF'
} as const;
export type FlawSourceEnum = typeof FlawSourceEnum[keyof typeof FlawSourceEnum];

/**
 * 
 * @export
 * @interface FlawUUIDListRequest
 */
export interface FlawUUIDListRequest {
    /**
     * 
     * @type {Array<string>}
     * @memberof FlawUUIDListRequest
     */
    flawUuids: Array<string>;
}
/**
 * Serializer for the flaw model adapted to affects v1
 * @export
 * @interface FlawV1
 */
export interface FlawV1 {
    /**
     * 
     * @type {string}
     * @memberof FlawV1
     */
    readonly uuid: string;
    /**
     * 
     * @type {string}
     * @memberof FlawV1
     */
    cveId?: string | null;
    /**
     * 
     * @type {AffectImpact}
     * @memberof FlawV1
     */
    impact?: AffectImpact;
    /**
     * 
     * @type {Array<string>}
     * @memberof FlawV1
     */
    components?: Array<string>;
    /**
     * 
     * @type {string}
     * @memberof FlawV1
     */
    title: string;
    /**
     * 
     * @type {Array<string>}
     * @memberof FlawV1
     */
    readonly trackers: Array<string>;
    /**
     * 
     * @type {string}
     * @memberof FlawV1
     */
    commentZero: string;
    /**
     * 
     * @type {string}
     * @memberof FlawV1
     */
    cveDescription?: string;
    /**
     * 
     * @type {FlawRequiresCveDescription}
     * @memberof FlawV1
     */
    requiresCveDescription?: FlawRequiresCveDescription;
    /**
     * 
     * @type {string}
     * @memberof FlawV1
     */
    statement?: string;
    /**
     * 
     * @type {string}
     * @memberof FlawV1
     */
    cweId?: string;
    /**
     * 
     * @type {string}
     * @memberof FlawV1
     */
    unembargoDt?: string | null;
    /**
     * 
     * @type {FlawSource}
     * @memberof FlawV1
     */
    source?: FlawSource;
    /**
     * 
     * @type {string}
     * @memberof FlawV1
     */
    reportedDt?: string | null;
    /**
     * 
     * @type {string}
     * @memberof FlawV1
     */
    mitigation?: string;
    /**
     * 
     * @type {FlawMajorIncidentState}
     * @memberof FlawV1
     */
    majorIncidentState?: FlawMajorIncidentState;
    /**
     * 
     * @type {string}
     * @memberof FlawV1
     */
    majorIncidentStartDt?: string | null;
    /**
     * 
     * @type {FlawNistCvssValidation}
     * @memberof FlawV1
     */
    nistCvssValidation?: FlawNistCvssValidation;
    /**
     * 
     * @type {Array<AffectV1>}
     * @memberof FlawV1
     */
    readonly affects: Array<AffectV1>;
    /**
     * 
     * @type {Array<Comment>}
     * @memberof FlawV1
     */
    readonly comments: Array<Comment>;
    /**
     * 
     * @type {Array<Package>}
     * @memberof FlawV1
     */
    readonly packageVersions: Array<Package>;
    /**
     * 
     * @type {Array<FlawAcknowledgment>}
     * @memberof FlawV1
     */
    readonly acknowledgments: Array<FlawAcknowledgment>;
    /**
     * 
     * @type {Array<FlawReference>}
     * @memberof FlawV1
     */
    readonly references: Array<FlawReference>;
    /**
     * 
     * @type {Array<FlawCVSS>}
     * @memberof FlawV1
     */
    readonly cvssScores: Array<FlawCVSS>;
    /**
     * 
     * @type {Array<FlawCollaborator>}
     * @memberof FlawV1
     */
    readonly labels: Array<FlawCollaborator>;
    /**
     * The embargoed boolean attribute is technically read-only as it just indirectly modifies the ACLs but is mandatory as it controls the access to the resource.
     * @type {boolean}
     * @memberof FlawV1
     */
    embargoed: boolean;
    /**
     * 
     * @type {string}
     * @memberof FlawV1
     */
    readonly createdDt: string;
    /**
     * The updated_dt timestamp attribute is mandatory on update as it is used to detect mit-air collisions.
     * @type {string}
     * @memberof FlawV1
     */
    updatedDt: string;
    /**
     * 
     * @type {FlawClassification}
     * @memberof FlawV1
     */
    classification: FlawClassification;
    /**
     * 
     * @type {string}
     * @memberof FlawV1
     */
    groupKey?: string;
    /**
     * 
     * @type {string}
     * @memberof FlawV1
     */
    owner?: string;
    /**
     * 
     * @type {string}
     * @memberof FlawV1
     */
    readonly taskKey: string | null;
    /**
     * 
     * @type {string}
     * @memberof FlawV1
     */
    teamId?: string;
    /**
     * 
     * @type {Array<Alert>}
     * @memberof FlawV1
     */
    readonly alerts: Array<Alert>;
}
/**
 * 
 * @export
 * @interface FlawV1ReportData
 */
export interface FlawV1ReportData {
    /**
     * 
     * @type {string}
     * @memberof FlawV1ReportData
     */
    cveId?: string | null;
    /**
     * 
     * @type {Array<AffectV1ReportData>}
     * @memberof FlawV1ReportData
     */
    affects?: Array<AffectV1ReportData>;
}
/**
 * Serializer for the flaw model adapted to affects v1
 * @export
 * @interface FlawV1Request
 */
export interface FlawV1Request {
    /**
     * 
     * @type {string}
     * @memberof FlawV1Request
     */
    cveId?: string | null;
    /**
     * 
     * @type {AffectImpact}
     * @memberof FlawV1Request
     */
    impact?: AffectImpact;
    /**
     * 
     * @type {Array<string>}
     * @memberof FlawV1Request
     */
    components?: Array<string>;
    /**
     * 
     * @type {string}
     * @memberof FlawV1Request
     */
    title: string;
    /**
     * 
     * @type {string}
     * @memberof FlawV1Request
     */
    commentZero: string;
    /**
     * 
     * @type {string}
     * @memberof FlawV1Request
     */
    cveDescription?: string;
    /**
     * 
     * @type {FlawRequiresCveDescription}
     * @memberof FlawV1Request
     */
    requiresCveDescription?: FlawRequiresCveDescription;
    /**
     * 
     * @type {string}
     * @memberof FlawV1Request
     */
    statement?: string;
    /**
     * 
     * @type {string}
     * @memberof FlawV1Request
     */
    cweId?: string;
    /**
     * 
     * @type {string}
     * @memberof FlawV1Request
     */
    unembargoDt?: string | null;
    /**
     * 
     * @type {FlawSource}
     * @memberof FlawV1Request
     */
    source?: FlawSource;
    /**
     * 
     * @type {string}
     * @memberof FlawV1Request
     */
    reportedDt?: string | null;
    /**
     * 
     * @type {string}
     * @memberof FlawV1Request
     */
    mitigation?: string;
    /**
     * 
     * @type {FlawMajorIncidentState}
     * @memberof FlawV1Request
     */
    majorIncidentState?: FlawMajorIncidentState;
    /**
     * 
     * @type {string}
     * @memberof FlawV1Request
     */
    majorIncidentStartDt?: string | null;
    /**
     * 
     * @type {FlawNistCvssValidation}
     * @memberof FlawV1Request
     */
    nistCvssValidation?: FlawNistCvssValidation;
    /**
     * The embargoed boolean attribute is technically read-only as it just indirectly modifies the ACLs but is mandatory as it controls the access to the resource.
     * @type {boolean}
     * @memberof FlawV1Request
     */
    embargoed: boolean;
    /**
     * The updated_dt timestamp attribute is mandatory on update as it is used to detect mit-air collisions.
     * @type {string}
     * @memberof FlawV1Request
     */
    updatedDt: string;
    /**
     * 
     * @type {string}
     * @memberof FlawV1Request
     */
    groupKey?: string;
    /**
     * 
     * @type {string}
     * @memberof FlawV1Request
     */
    owner?: string;
    /**
     * 
     * @type {string}
     * @memberof FlawV1Request
     */
    teamId?: string;
}
/**
 * PackageVer serializer used by FlawPackageVersionSerializer.
 * @export
 * @interface FlawVersion
 */
export interface FlawVersion {
    /**
     * 
     * @type {string}
     * @memberof FlawVersion
     */
    version: string;
}
/**
 * PackageVer serializer used by FlawPackageVersionSerializer.
 * @export
 * @interface FlawVersionRequest
 */
export interface FlawVersionRequest {
    /**
     * 
     * @type {string}
     * @memberof FlawVersionRequest
     */
    version: string;
}

/**
 * 
 * @export
 */
export const ImpactEnum = {
    Low: 'LOW',
    Moderate: 'MODERATE',
    Important: 'IMPORTANT',
    Critical: 'CRITICAL'
} as const;
export type ImpactEnum = typeof ImpactEnum[keyof typeof ImpactEnum];

/**
 * 
 * @export
 * @interface IntegrationTokenGet
 */
export interface IntegrationTokenGet {
    /**
     * 
     * @type {string}
     * @memberof IntegrationTokenGet
     */
    jira: string | null;
    /**
     * 
     * @type {string}
     * @memberof IntegrationTokenGet
     */
    bugzilla: string | null;
}

/**
 * 
 * @export
 */
export const IssuerEnum = {
    Cveorg: 'CVEORG',
    Rh: 'RH',
    Nist: 'NIST',
    Osv: 'OSV',
    Cisa: 'CISA'
} as const;
export type IssuerEnum = typeof IssuerEnum[keyof typeof IssuerEnum];


/**
 * 
 * @export
 */
export const MajorIncidentStateEnum = {
    Requested: 'REQUESTED',
    Rejected: 'REJECTED',
    Approved: 'APPROVED',
    CisaApproved: 'CISA_APPROVED',
    Minor: 'MINOR',
    ZeroDay: 'ZERO_DAY',
    Invalid: 'INVALID'
} as const;
export type MajorIncidentStateEnum = typeof MajorIncidentStateEnum[keyof typeof MajorIncidentStateEnum];


/**
 * 
 * @export
 */
export const MaturityPreliminaryEnum = {
    NUMBER_0: 0,
    NUMBER_1: 1,
    NUMBER_2: 2,
    NUMBER_3: 3
} as const;
export type MaturityPreliminaryEnum = typeof MaturityPreliminaryEnum[keyof typeof MaturityPreliminaryEnum];

/**
 * 
 * @export
 * @interface ModuleComponent
 */
export interface ModuleComponent {
    /**
     * 
     * @type {string}
     * @memberof ModuleComponent
     */
    psModule: string;
    /**
     * 
     * @type {string}
     * @memberof ModuleComponent
     */
    psComponent: string;
    /**
     * 
     * @type {Array<PsStreamSelection>}
     * @memberof ModuleComponent
     */
    streams: Array<PsStreamSelection>;
    /**
     * 
     * @type {boolean}
     * @memberof ModuleComponent
     */
    selected: boolean;
    /**
     * 
     * @type {Affect}
     * @memberof ModuleComponent
     */
    affect: Affect;
}

/**
 * 
 * @export
 */
export const NistCvssValidationEnum = {
    Requested: 'REQUESTED',
    Approved: 'APPROVED',
    Rejected: 'REJECTED'
} as const;
export type NistCvssValidationEnum = typeof NistCvssValidationEnum[keyof typeof NistCvssValidationEnum];


/**
 * 
 * @export
 */
export const NotAffectedJustificationEnum = {
    ComponentNotPresent: 'Component not Present',
    InlineMitigationsAlreadyExist: 'Inline Mitigations already Exist',
    VulnerableCodeCannotBeControlledByAdversary: 'Vulnerable Code cannot be Controlled by Adversary',
    VulnerableCodeNotInExecutePath: 'Vulnerable Code not in Execute Path',
    VulnerableCodeNotPresent: 'Vulnerable Code not Present'
} as const;
export type NotAffectedJustificationEnum = typeof NotAffectedJustificationEnum[keyof typeof NotAffectedJustificationEnum];

/**
 * 
 * @export
 * @interface OsidbApiV1AffectsCvssScoresList200Response
 */
export interface OsidbApiV1AffectsCvssScoresList200Response {
    /**
     * 
     * @type {number}
     * @memberof OsidbApiV1AffectsCvssScoresList200Response
     */
    count: number;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AffectsCvssScoresList200Response
     */
    next?: string | null;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AffectsCvssScoresList200Response
     */
    previous?: string | null;
    /**
     * 
     * @type {Array<AffectCVSS>}
     * @memberof OsidbApiV1AffectsCvssScoresList200Response
     */
    results: Array<AffectCVSS>;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AffectsCvssScoresList200Response
     */
    dt?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AffectsCvssScoresList200Response
     */
    env?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AffectsCvssScoresList200Response
     */
    revision?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AffectsCvssScoresList200Response
     */
    version?: string;
}
/**
 * 
 * @export
 * @interface OsidbApiV1AffectsCvssScoresRetrieve200Response
 */
export interface OsidbApiV1AffectsCvssScoresRetrieve200Response {
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AffectsCvssScoresRetrieve200Response
     */
    affect?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AffectsCvssScoresRetrieve200Response
     */
    comment?: string | null;
    /**
     * 
     * @type {CvssVersionEnum}
     * @memberof OsidbApiV1AffectsCvssScoresRetrieve200Response
     */
    cvssVersion: CvssVersionEnum;
    /**
     * 
     * @type {IssuerEnum}
     * @memberof OsidbApiV1AffectsCvssScoresRetrieve200Response
     */
    issuer?: IssuerEnum;
    /**
     * 
     * @type {number}
     * @memberof OsidbApiV1AffectsCvssScoresRetrieve200Response
     */
    readonly score: number;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AffectsCvssScoresRetrieve200Response
     */
    readonly uuid: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AffectsCvssScoresRetrieve200Response
     */
    vector: string;
    /**
     * The embargoed boolean attribute is technically read-only as it just indirectly modifies the ACLs but is mandatory as it controls the access to the resource.
     * @type {boolean}
     * @memberof OsidbApiV1AffectsCvssScoresRetrieve200Response
     */
    embargoed: boolean;
    /**
     * 
     * @type {Array<Alert>}
     * @memberof OsidbApiV1AffectsCvssScoresRetrieve200Response
     */
    readonly alerts: Array<Alert>;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AffectsCvssScoresRetrieve200Response
     */
    readonly createdDt: string;
    /**
     * The updated_dt timestamp attribute is mandatory on update as it is used to detect mit-air collisions.
     * @type {string}
     * @memberof OsidbApiV1AffectsCvssScoresRetrieve200Response
     */
    updatedDt: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AffectsCvssScoresRetrieve200Response
     */
    dt?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AffectsCvssScoresRetrieve200Response
     */
    env?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AffectsCvssScoresRetrieve200Response
     */
    revision?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AffectsCvssScoresRetrieve200Response
     */
    version?: string;
}
/**
 * 
 * @export
 * @interface OsidbApiV1AffectsList200Response
 */
export interface OsidbApiV1AffectsList200Response {
    /**
     * 
     * @type {number}
     * @memberof OsidbApiV1AffectsList200Response
     */
    count: number;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AffectsList200Response
     */
    next?: string | null;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AffectsList200Response
     */
    previous?: string | null;
    /**
     * 
     * @type {Array<AffectV1>}
     * @memberof OsidbApiV1AffectsList200Response
     */
    results: Array<AffectV1>;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AffectsList200Response
     */
    dt?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AffectsList200Response
     */
    env?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AffectsList200Response
     */
    revision?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AffectsList200Response
     */
    version?: string;
}
/**
 * 
 * @export
 * @interface OsidbApiV1AffectsRetrieve200Response
 */
export interface OsidbApiV1AffectsRetrieve200Response {
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AffectsRetrieve200Response
     */
    readonly uuid: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AffectsRetrieve200Response
     */
    flaw?: string | null;
    /**
     * 
     * @type {AffectAffectedness}
     * @memberof OsidbApiV1AffectsRetrieve200Response
     */
    affectedness: AffectAffectedness;
    /**
     * 
     * @type {AffectResolution}
     * @memberof OsidbApiV1AffectsRetrieve200Response
     */
    resolution: AffectResolution;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AffectsRetrieve200Response
     */
    psModule: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AffectsRetrieve200Response
     */
    readonly cveId: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AffectsRetrieve200Response
     */
    readonly psProduct: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AffectsRetrieve200Response
     */
    readonly psComponent: string;
    /**
     * 
     * @type {AffectImpact}
     * @memberof OsidbApiV1AffectsRetrieve200Response
     */
    impact?: AffectImpact;
    /**
     * 
     * @type {Array<Tracker>}
     * @memberof OsidbApiV1AffectsRetrieve200Response
     */
    readonly trackers: Array<Tracker>;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AffectsRetrieve200Response
     */
    readonly delegatedResolution: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AffectsRetrieve200Response
     */
    readonly cvssScores: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AffectsRetrieve200Response
     */
    readonly purl: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AffectsRetrieve200Response
     */
    notAffectedJustification?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AffectsRetrieve200Response
     */
    readonly delegatedNotAffectedJustification: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AffectsRetrieve200Response
     */
    readonly resolvedDt: string | null;
    /**
     * The embargoed boolean attribute is technically read-only as it just indirectly modifies the ACLs but is mandatory as it controls the access to the resource.
     * @type {boolean}
     * @memberof OsidbApiV1AffectsRetrieve200Response
     */
    embargoed: boolean;
    /**
     * 
     * @type {Array<Alert>}
     * @memberof OsidbApiV1AffectsRetrieve200Response
     */
    readonly alerts: Array<Alert>;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AffectsRetrieve200Response
     */
    readonly createdDt: string;
    /**
     * The updated_dt timestamp attribute is mandatory on update as it is used to detect mit-air collisions.
     * @type {string}
     * @memberof OsidbApiV1AffectsRetrieve200Response
     */
    updatedDt: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AffectsRetrieve200Response
     */
    dt?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AffectsRetrieve200Response
     */
    env?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AffectsRetrieve200Response
     */
    revision?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AffectsRetrieve200Response
     */
    version?: string;
}
/**
 * 
 * @export
 * @interface OsidbApiV1AlertsList200Response
 */
export interface OsidbApiV1AlertsList200Response {
    /**
     * 
     * @type {number}
     * @memberof OsidbApiV1AlertsList200Response
     */
    count: number;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AlertsList200Response
     */
    next?: string | null;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AlertsList200Response
     */
    previous?: string | null;
    /**
     * 
     * @type {Array<Alert>}
     * @memberof OsidbApiV1AlertsList200Response
     */
    results: Array<Alert>;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AlertsList200Response
     */
    dt?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AlertsList200Response
     */
    env?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AlertsList200Response
     */
    revision?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AlertsList200Response
     */
    version?: string;
}
/**
 * 
 * @export
 * @interface OsidbApiV1AlertsRetrieve200Response
 */
export interface OsidbApiV1AlertsRetrieve200Response {
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AlertsRetrieve200Response
     */
    readonly uuid: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AlertsRetrieve200Response
     */
    name: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AlertsRetrieve200Response
     */
    description: string;
    /**
     * 
     * @type {AlertTypeEnum}
     * @memberof OsidbApiV1AlertsRetrieve200Response
     */
    alertType?: AlertTypeEnum;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AlertsRetrieve200Response
     */
    resolutionSteps?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AlertsRetrieve200Response
     */
    readonly parentUuid: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AlertsRetrieve200Response
     */
    readonly parentModel: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AlertsRetrieve200Response
     */
    dt?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AlertsRetrieve200Response
     */
    env?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AlertsRetrieve200Response
     */
    revision?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AlertsRetrieve200Response
     */
    version?: string;
}
/**
 * 
 * @export
 * @interface OsidbApiV1AuditList200Response
 */
export interface OsidbApiV1AuditList200Response {
    /**
     * 
     * @type {number}
     * @memberof OsidbApiV1AuditList200Response
     */
    count: number;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AuditList200Response
     */
    next?: string | null;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AuditList200Response
     */
    previous?: string | null;
    /**
     * 
     * @type {Array<Audit>}
     * @memberof OsidbApiV1AuditList200Response
     */
    results: Array<Audit>;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AuditList200Response
     */
    dt?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AuditList200Response
     */
    env?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AuditList200Response
     */
    revision?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AuditList200Response
     */
    version?: string;
}
/**
 * 
 * @export
 * @interface OsidbApiV1AuditRetrieve200Response
 */
export interface OsidbApiV1AuditRetrieve200Response {
    /**
     * When the event was created.
     * @type {string}
     * @memberof OsidbApiV1AuditRetrieve200Response
     */
    readonly pghCreatedAt: string;
    /**
     * The unique identifier across all event tables.
     * @type {string}
     * @memberof OsidbApiV1AuditRetrieve200Response
     */
    pghSlug: string;
    /**
     * The object model.
     * @type {string}
     * @memberof OsidbApiV1AuditRetrieve200Response
     */
    pghObjModel: string;
    /**
     * The primary key of the object.
     * @type {string}
     * @memberof OsidbApiV1AuditRetrieve200Response
     */
    pghObjId?: string | null;
    /**
     * The event label.
     * @type {string}
     * @memberof OsidbApiV1AuditRetrieve200Response
     */
    pghLabel: string;
    /**
     * The context associated with the event.
     * @type {any}
     * @memberof OsidbApiV1AuditRetrieve200Response
     */
    pghContext?: any | null;
    /**
     * The diff between the previous event of the same label.
     * @type {any}
     * @memberof OsidbApiV1AuditRetrieve200Response
     */
    pghDiff: any | null;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AuditRetrieve200Response
     */
    readonly pghData: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AuditRetrieve200Response
     */
    dt?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AuditRetrieve200Response
     */
    env?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AuditRetrieve200Response
     */
    revision?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1AuditRetrieve200Response
     */
    version?: string;
}
/**
 * 
 * @export
 * @interface OsidbApiV1FlawsAcknowledgmentsCreate201Response
 */
export interface OsidbApiV1FlawsAcknowledgmentsCreate201Response {
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsAcknowledgmentsCreate201Response
     */
    name: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsAcknowledgmentsCreate201Response
     */
    affiliation: string;
    /**
     * 
     * @type {boolean}
     * @memberof OsidbApiV1FlawsAcknowledgmentsCreate201Response
     */
    fromUpstream: boolean;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsAcknowledgmentsCreate201Response
     */
    flaw: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsAcknowledgmentsCreate201Response
     */
    readonly uuid: string;
    /**
     * The embargoed boolean attribute is technically read-only as it just indirectly modifies the ACLs but is mandatory as it controls the access to the resource.
     * @type {boolean}
     * @memberof OsidbApiV1FlawsAcknowledgmentsCreate201Response
     */
    embargoed: boolean;
    /**
     * 
     * @type {Array<Alert>}
     * @memberof OsidbApiV1FlawsAcknowledgmentsCreate201Response
     */
    readonly alerts: Array<Alert>;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsAcknowledgmentsCreate201Response
     */
    readonly createdDt: string;
    /**
     * The updated_dt timestamp attribute is mandatory on update as it is used to detect mit-air collisions.
     * @type {string}
     * @memberof OsidbApiV1FlawsAcknowledgmentsCreate201Response
     */
    updatedDt: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsAcknowledgmentsCreate201Response
     */
    dt?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsAcknowledgmentsCreate201Response
     */
    env?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsAcknowledgmentsCreate201Response
     */
    revision?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsAcknowledgmentsCreate201Response
     */
    version?: string;
}
/**
 * 
 * @export
 * @interface OsidbApiV1FlawsAcknowledgmentsList200Response
 */
export interface OsidbApiV1FlawsAcknowledgmentsList200Response {
    /**
     * 
     * @type {number}
     * @memberof OsidbApiV1FlawsAcknowledgmentsList200Response
     */
    count: number;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsAcknowledgmentsList200Response
     */
    next?: string | null;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsAcknowledgmentsList200Response
     */
    previous?: string | null;
    /**
     * 
     * @type {Array<FlawAcknowledgment>}
     * @memberof OsidbApiV1FlawsAcknowledgmentsList200Response
     */
    results: Array<FlawAcknowledgment>;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsAcknowledgmentsList200Response
     */
    dt?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsAcknowledgmentsList200Response
     */
    env?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsAcknowledgmentsList200Response
     */
    revision?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsAcknowledgmentsList200Response
     */
    version?: string;
}
/**
 * 
 * @export
 * @interface OsidbApiV1FlawsCommentsCreate201Response
 */
export interface OsidbApiV1FlawsCommentsCreate201Response {
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsCommentsCreate201Response
     */
    flaw: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsCommentsCreate201Response
     */
    text: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsCommentsCreate201Response
     */
    readonly uuid: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsCommentsCreate201Response
     */
    readonly externalSystemId: string;
    /**
     * 
     * @type {number}
     * @memberof OsidbApiV1FlawsCommentsCreate201Response
     * @deprecated
     */
    order?: number;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsCommentsCreate201Response
     */
    creator?: string;
    /**
     * 
     * @type {boolean}
     * @memberof OsidbApiV1FlawsCommentsCreate201Response
     */
    isPrivate?: boolean;
    /**
     * 
     * @type {Array<Alert>}
     * @memberof OsidbApiV1FlawsCommentsCreate201Response
     */
    readonly alerts: Array<Alert>;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsCommentsCreate201Response
     */
    readonly createdDt: string;
    /**
     * The updated_dt timestamp attribute is mandatory on update as it is used to detect mit-air collisions.
     * @type {string}
     * @memberof OsidbApiV1FlawsCommentsCreate201Response
     */
    updatedDt: string;
    /**
     * The embargoed boolean attribute is technically read-only as it just indirectly modifies the ACLs but is mandatory as it controls the access to the resource.
     * @type {boolean}
     * @memberof OsidbApiV1FlawsCommentsCreate201Response
     */
    embargoed: boolean;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsCommentsCreate201Response
     */
    dt?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsCommentsCreate201Response
     */
    env?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsCommentsCreate201Response
     */
    revision?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsCommentsCreate201Response
     */
    version?: string;
}
/**
 * 
 * @export
 * @interface OsidbApiV1FlawsCommentsList200Response
 */
export interface OsidbApiV1FlawsCommentsList200Response {
    /**
     * 
     * @type {number}
     * @memberof OsidbApiV1FlawsCommentsList200Response
     */
    count: number;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsCommentsList200Response
     */
    next?: string | null;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsCommentsList200Response
     */
    previous?: string | null;
    /**
     * 
     * @type {Array<FlawComment>}
     * @memberof OsidbApiV1FlawsCommentsList200Response
     */
    results: Array<FlawComment>;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsCommentsList200Response
     */
    dt?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsCommentsList200Response
     */
    env?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsCommentsList200Response
     */
    revision?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsCommentsList200Response
     */
    version?: string;
}
/**
 * 
 * @export
 * @interface OsidbApiV1FlawsCreate201Response
 */
export interface OsidbApiV1FlawsCreate201Response {
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsCreate201Response
     */
    readonly uuid: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsCreate201Response
     */
    cveId?: string | null;
    /**
     * 
     * @type {AffectImpact}
     * @memberof OsidbApiV1FlawsCreate201Response
     */
    impact?: AffectImpact;
    /**
     * 
     * @type {Array<string>}
     * @memberof OsidbApiV1FlawsCreate201Response
     */
    components?: Array<string>;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsCreate201Response
     */
    title: string;
    /**
     * 
     * @type {Array<string>}
     * @memberof OsidbApiV1FlawsCreate201Response
     */
    readonly trackers: Array<string>;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsCreate201Response
     */
    commentZero: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsCreate201Response
     */
    cveDescription?: string;
    /**
     * 
     * @type {FlawRequiresCveDescription}
     * @memberof OsidbApiV1FlawsCreate201Response
     */
    requiresCveDescription?: FlawRequiresCveDescription;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsCreate201Response
     */
    statement?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsCreate201Response
     */
    cweId?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsCreate201Response
     */
    unembargoDt?: string | null;
    /**
     * 
     * @type {FlawSource}
     * @memberof OsidbApiV1FlawsCreate201Response
     */
    source?: FlawSource;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsCreate201Response
     */
    reportedDt?: string | null;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsCreate201Response
     */
    mitigation?: string;
    /**
     * 
     * @type {FlawMajorIncidentState}
     * @memberof OsidbApiV1FlawsCreate201Response
     */
    majorIncidentState?: FlawMajorIncidentState;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsCreate201Response
     */
    majorIncidentStartDt?: string | null;
    /**
     * 
     * @type {FlawNistCvssValidation}
     * @memberof OsidbApiV1FlawsCreate201Response
     */
    nistCvssValidation?: FlawNistCvssValidation;
    /**
     * 
     * @type {Array<AffectV1>}
     * @memberof OsidbApiV1FlawsCreate201Response
     */
    readonly affects: Array<AffectV1>;
    /**
     * 
     * @type {Array<Comment>}
     * @memberof OsidbApiV1FlawsCreate201Response
     */
    readonly comments: Array<Comment>;
    /**
     * 
     * @type {Array<Package>}
     * @memberof OsidbApiV1FlawsCreate201Response
     */
    readonly packageVersions: Array<Package>;
    /**
     * 
     * @type {Array<FlawAcknowledgment>}
     * @memberof OsidbApiV1FlawsCreate201Response
     */
    readonly acknowledgments: Array<FlawAcknowledgment>;
    /**
     * 
     * @type {Array<FlawReference>}
     * @memberof OsidbApiV1FlawsCreate201Response
     */
    readonly references: Array<FlawReference>;
    /**
     * 
     * @type {Array<FlawCVSS>}
     * @memberof OsidbApiV1FlawsCreate201Response
     */
    readonly cvssScores: Array<FlawCVSS>;
    /**
     * 
     * @type {Array<FlawCollaborator>}
     * @memberof OsidbApiV1FlawsCreate201Response
     */
    readonly labels: Array<FlawCollaborator>;
    /**
     * The embargoed boolean attribute is technically read-only as it just indirectly modifies the ACLs but is mandatory as it controls the access to the resource.
     * @type {boolean}
     * @memberof OsidbApiV1FlawsCreate201Response
     */
    embargoed: boolean;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsCreate201Response
     */
    readonly createdDt: string;
    /**
     * The updated_dt timestamp attribute is mandatory on update as it is used to detect mit-air collisions.
     * @type {string}
     * @memberof OsidbApiV1FlawsCreate201Response
     */
    updatedDt: string;
    /**
     * 
     * @type {FlawClassification}
     * @memberof OsidbApiV1FlawsCreate201Response
     */
    classification: FlawClassification;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsCreate201Response
     */
    groupKey?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsCreate201Response
     */
    owner?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsCreate201Response
     */
    readonly taskKey: string | null;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsCreate201Response
     */
    teamId?: string;
    /**
     * 
     * @type {Array<Alert>}
     * @memberof OsidbApiV1FlawsCreate201Response
     */
    readonly alerts: Array<Alert>;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsCreate201Response
     */
    dt?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsCreate201Response
     */
    env?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsCreate201Response
     */
    revision?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsCreate201Response
     */
    version?: string;
}
/**
 * 
 * @export
 * @interface OsidbApiV1FlawsCvssScoresCreate201Response
 */
export interface OsidbApiV1FlawsCvssScoresCreate201Response {
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsCvssScoresCreate201Response
     */
    flaw?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsCvssScoresCreate201Response
     */
    comment?: string | null;
    /**
     * 
     * @type {CvssVersionEnum}
     * @memberof OsidbApiV1FlawsCvssScoresCreate201Response
     */
    cvssVersion: CvssVersionEnum;
    /**
     * 
     * @type {IssuerEnum}
     * @memberof OsidbApiV1FlawsCvssScoresCreate201Response
     */
    issuer?: IssuerEnum;
    /**
     * 
     * @type {number}
     * @memberof OsidbApiV1FlawsCvssScoresCreate201Response
     */
    readonly score: number;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsCvssScoresCreate201Response
     */
    readonly uuid: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsCvssScoresCreate201Response
     */
    vector: string;
    /**
     * The embargoed boolean attribute is technically read-only as it just indirectly modifies the ACLs but is mandatory as it controls the access to the resource.
     * @type {boolean}
     * @memberof OsidbApiV1FlawsCvssScoresCreate201Response
     */
    embargoed: boolean;
    /**
     * 
     * @type {Array<Alert>}
     * @memberof OsidbApiV1FlawsCvssScoresCreate201Response
     */
    readonly alerts: Array<Alert>;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsCvssScoresCreate201Response
     */
    readonly createdDt: string;
    /**
     * The updated_dt timestamp attribute is mandatory on update as it is used to detect mit-air collisions.
     * @type {string}
     * @memberof OsidbApiV1FlawsCvssScoresCreate201Response
     */
    updatedDt: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsCvssScoresCreate201Response
     */
    dt?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsCvssScoresCreate201Response
     */
    env?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsCvssScoresCreate201Response
     */
    revision?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsCvssScoresCreate201Response
     */
    version?: string;
}
/**
 * 
 * @export
 * @interface OsidbApiV1FlawsCvssScoresList200Response
 */
export interface OsidbApiV1FlawsCvssScoresList200Response {
    /**
     * 
     * @type {number}
     * @memberof OsidbApiV1FlawsCvssScoresList200Response
     */
    count: number;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsCvssScoresList200Response
     */
    next?: string | null;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsCvssScoresList200Response
     */
    previous?: string | null;
    /**
     * 
     * @type {Array<FlawCVSS>}
     * @memberof OsidbApiV1FlawsCvssScoresList200Response
     */
    results: Array<FlawCVSS>;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsCvssScoresList200Response
     */
    dt?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsCvssScoresList200Response
     */
    env?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsCvssScoresList200Response
     */
    revision?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsCvssScoresList200Response
     */
    version?: string;
}
/**
 * 
 * @export
 * @interface OsidbApiV1FlawsLabelsCreate201Response
 */
export interface OsidbApiV1FlawsLabelsCreate201Response {
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsLabelsCreate201Response
     */
    readonly uuid: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsLabelsCreate201Response
     */
    label: string;
    /**
     * 
     * @type {StateEnum}
     * @memberof OsidbApiV1FlawsLabelsCreate201Response
     */
    state?: StateEnum;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsLabelsCreate201Response
     */
    contributor?: string;
    /**
     * 
     * @type {boolean}
     * @memberof OsidbApiV1FlawsLabelsCreate201Response
     */
    relevant?: boolean;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsLabelsCreate201Response
     */
    readonly type: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsLabelsCreate201Response
     */
    dt?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsLabelsCreate201Response
     */
    env?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsLabelsCreate201Response
     */
    revision?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsLabelsCreate201Response
     */
    version?: string;
}
/**
 * 
 * @export
 * @interface OsidbApiV1FlawsLabelsList200Response
 */
export interface OsidbApiV1FlawsLabelsList200Response {
    /**
     * 
     * @type {number}
     * @memberof OsidbApiV1FlawsLabelsList200Response
     */
    count: number;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsLabelsList200Response
     */
    next?: string | null;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsLabelsList200Response
     */
    previous?: string | null;
    /**
     * 
     * @type {Array<FlawCollaborator>}
     * @memberof OsidbApiV1FlawsLabelsList200Response
     */
    results: Array<FlawCollaborator>;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsLabelsList200Response
     */
    dt?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsLabelsList200Response
     */
    env?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsLabelsList200Response
     */
    revision?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsLabelsList200Response
     */
    version?: string;
}
/**
 * 
 * @export
 * @interface OsidbApiV1FlawsList200Response
 */
export interface OsidbApiV1FlawsList200Response {
    /**
     * 
     * @type {number}
     * @memberof OsidbApiV1FlawsList200Response
     */
    count: number;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsList200Response
     */
    next?: string | null;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsList200Response
     */
    previous?: string | null;
    /**
     * 
     * @type {Array<FlawV1>}
     * @memberof OsidbApiV1FlawsList200Response
     */
    results: Array<FlawV1>;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsList200Response
     */
    dt?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsList200Response
     */
    env?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsList200Response
     */
    revision?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsList200Response
     */
    version?: string;
}
/**
 * 
 * @export
 * @interface OsidbApiV1FlawsPackageVersionsCreate201Response
 */
export interface OsidbApiV1FlawsPackageVersionsCreate201Response {
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsPackageVersionsCreate201Response
     */
    _package: string;
    /**
     * 
     * @type {Array<FlawVersion>}
     * @memberof OsidbApiV1FlawsPackageVersionsCreate201Response
     */
    versions: Array<FlawVersion>;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsPackageVersionsCreate201Response
     */
    flaw: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsPackageVersionsCreate201Response
     */
    readonly uuid: string;
    /**
     * The embargoed boolean attribute is technically read-only as it just indirectly modifies the ACLs but is mandatory as it controls the access to the resource.
     * @type {boolean}
     * @memberof OsidbApiV1FlawsPackageVersionsCreate201Response
     */
    embargoed: boolean;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsPackageVersionsCreate201Response
     */
    readonly createdDt: string;
    /**
     * The updated_dt timestamp attribute is mandatory on update as it is used to detect mit-air collisions.
     * @type {string}
     * @memberof OsidbApiV1FlawsPackageVersionsCreate201Response
     */
    updatedDt: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsPackageVersionsCreate201Response
     */
    dt?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsPackageVersionsCreate201Response
     */
    env?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsPackageVersionsCreate201Response
     */
    revision?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsPackageVersionsCreate201Response
     */
    version?: string;
}
/**
 * 
 * @export
 * @interface OsidbApiV1FlawsPackageVersionsList200Response
 */
export interface OsidbApiV1FlawsPackageVersionsList200Response {
    /**
     * 
     * @type {number}
     * @memberof OsidbApiV1FlawsPackageVersionsList200Response
     */
    count: number;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsPackageVersionsList200Response
     */
    next?: string | null;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsPackageVersionsList200Response
     */
    previous?: string | null;
    /**
     * 
     * @type {Array<FlawPackageVersion>}
     * @memberof OsidbApiV1FlawsPackageVersionsList200Response
     */
    results: Array<FlawPackageVersion>;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsPackageVersionsList200Response
     */
    dt?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsPackageVersionsList200Response
     */
    env?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsPackageVersionsList200Response
     */
    revision?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsPackageVersionsList200Response
     */
    version?: string;
}
/**
 * 
 * @export
 * @interface OsidbApiV1FlawsReferencesCreate201Response
 */
export interface OsidbApiV1FlawsReferencesCreate201Response {
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsReferencesCreate201Response
     */
    description?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsReferencesCreate201Response
     */
    flaw: string;
    /**
     * 
     * @type {FlawReferenceType}
     * @memberof OsidbApiV1FlawsReferencesCreate201Response
     */
    type?: FlawReferenceType;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsReferencesCreate201Response
     */
    url: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsReferencesCreate201Response
     */
    readonly uuid: string;
    /**
     * The embargoed boolean attribute is technically read-only as it just indirectly modifies the ACLs but is mandatory as it controls the access to the resource.
     * @type {boolean}
     * @memberof OsidbApiV1FlawsReferencesCreate201Response
     */
    embargoed: boolean;
    /**
     * 
     * @type {Array<Alert>}
     * @memberof OsidbApiV1FlawsReferencesCreate201Response
     */
    readonly alerts: Array<Alert>;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsReferencesCreate201Response
     */
    readonly createdDt: string;
    /**
     * The updated_dt timestamp attribute is mandatory on update as it is used to detect mit-air collisions.
     * @type {string}
     * @memberof OsidbApiV1FlawsReferencesCreate201Response
     */
    updatedDt: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsReferencesCreate201Response
     */
    dt?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsReferencesCreate201Response
     */
    env?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsReferencesCreate201Response
     */
    revision?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsReferencesCreate201Response
     */
    version?: string;
}
/**
 * 
 * @export
 * @interface OsidbApiV1FlawsReferencesList200Response
 */
export interface OsidbApiV1FlawsReferencesList200Response {
    /**
     * 
     * @type {number}
     * @memberof OsidbApiV1FlawsReferencesList200Response
     */
    count: number;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsReferencesList200Response
     */
    next?: string | null;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsReferencesList200Response
     */
    previous?: string | null;
    /**
     * 
     * @type {Array<FlawReference>}
     * @memberof OsidbApiV1FlawsReferencesList200Response
     */
    results: Array<FlawReference>;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsReferencesList200Response
     */
    dt?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsReferencesList200Response
     */
    env?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsReferencesList200Response
     */
    revision?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsReferencesList200Response
     */
    version?: string;
}
/**
 * 
 * @export
 * @interface OsidbApiV1FlawsRetrieve200Response
 */
export interface OsidbApiV1FlawsRetrieve200Response {
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsRetrieve200Response
     */
    readonly uuid: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsRetrieve200Response
     */
    cveId?: string | null;
    /**
     * 
     * @type {AffectImpact}
     * @memberof OsidbApiV1FlawsRetrieve200Response
     */
    impact?: AffectImpact;
    /**
     * 
     * @type {Array<string>}
     * @memberof OsidbApiV1FlawsRetrieve200Response
     */
    components?: Array<string>;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsRetrieve200Response
     */
    title: string;
    /**
     * 
     * @type {Array<string>}
     * @memberof OsidbApiV1FlawsRetrieve200Response
     */
    readonly trackers: Array<string>;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsRetrieve200Response
     */
    commentZero: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsRetrieve200Response
     */
    cveDescription?: string;
    /**
     * 
     * @type {FlawRequiresCveDescription}
     * @memberof OsidbApiV1FlawsRetrieve200Response
     */
    requiresCveDescription?: FlawRequiresCveDescription;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsRetrieve200Response
     */
    statement?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsRetrieve200Response
     */
    cweId?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsRetrieve200Response
     */
    unembargoDt?: string | null;
    /**
     * 
     * @type {FlawSource}
     * @memberof OsidbApiV1FlawsRetrieve200Response
     */
    source?: FlawSource;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsRetrieve200Response
     */
    reportedDt?: string | null;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsRetrieve200Response
     */
    mitigation?: string;
    /**
     * 
     * @type {FlawMajorIncidentState}
     * @memberof OsidbApiV1FlawsRetrieve200Response
     */
    majorIncidentState?: FlawMajorIncidentState;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsRetrieve200Response
     */
    majorIncidentStartDt?: string | null;
    /**
     * 
     * @type {FlawNistCvssValidation}
     * @memberof OsidbApiV1FlawsRetrieve200Response
     */
    nistCvssValidation?: FlawNistCvssValidation;
    /**
     * 
     * @type {Array<Affect>}
     * @memberof OsidbApiV1FlawsRetrieve200Response
     */
    readonly affects: Array<Affect>;
    /**
     * 
     * @type {Array<Comment>}
     * @memberof OsidbApiV1FlawsRetrieve200Response
     */
    readonly comments: Array<Comment>;
    /**
     * 
     * @type {Array<Package>}
     * @memberof OsidbApiV1FlawsRetrieve200Response
     */
    readonly packageVersions: Array<Package>;
    /**
     * 
     * @type {Array<FlawAcknowledgment>}
     * @memberof OsidbApiV1FlawsRetrieve200Response
     */
    readonly acknowledgments: Array<FlawAcknowledgment>;
    /**
     * 
     * @type {Array<FlawReference>}
     * @memberof OsidbApiV1FlawsRetrieve200Response
     */
    readonly references: Array<FlawReference>;
    /**
     * 
     * @type {Array<FlawCVSS>}
     * @memberof OsidbApiV1FlawsRetrieve200Response
     */
    readonly cvssScores: Array<FlawCVSS>;
    /**
     * 
     * @type {Array<FlawCollaborator>}
     * @memberof OsidbApiV1FlawsRetrieve200Response
     */
    readonly labels: Array<FlawCollaborator>;
    /**
     * The embargoed boolean attribute is technically read-only as it just indirectly modifies the ACLs but is mandatory as it controls the access to the resource.
     * @type {boolean}
     * @memberof OsidbApiV1FlawsRetrieve200Response
     */
    embargoed: boolean;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsRetrieve200Response
     */
    readonly createdDt: string;
    /**
     * The updated_dt timestamp attribute is mandatory on update as it is used to detect mit-air collisions.
     * @type {string}
     * @memberof OsidbApiV1FlawsRetrieve200Response
     */
    updatedDt: string;
    /**
     * 
     * @type {FlawClassification}
     * @memberof OsidbApiV1FlawsRetrieve200Response
     */
    classification: FlawClassification;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsRetrieve200Response
     */
    groupKey?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsRetrieve200Response
     */
    owner?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsRetrieve200Response
     */
    readonly taskKey: string | null;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsRetrieve200Response
     */
    teamId?: string;
    /**
     * 
     * @type {Array<Alert>}
     * @memberof OsidbApiV1FlawsRetrieve200Response
     */
    readonly alerts: Array<Alert>;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsRetrieve200Response
     */
    dt?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsRetrieve200Response
     */
    env?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsRetrieve200Response
     */
    revision?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1FlawsRetrieve200Response
     */
    version?: string;
}
/**
 * 
 * @export
 * @interface OsidbApiV1LabelsList200Response
 */
export interface OsidbApiV1LabelsList200Response {
    /**
     * 
     * @type {number}
     * @memberof OsidbApiV1LabelsList200Response
     */
    count: number;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1LabelsList200Response
     */
    next?: string | null;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1LabelsList200Response
     */
    previous?: string | null;
    /**
     * 
     * @type {Array<FlawLabel>}
     * @memberof OsidbApiV1LabelsList200Response
     */
    results: Array<FlawLabel>;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1LabelsList200Response
     */
    dt?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1LabelsList200Response
     */
    env?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1LabelsList200Response
     */
    revision?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1LabelsList200Response
     */
    version?: string;
}
/**
 * 
 * @export
 * @interface OsidbApiV1LabelsRetrieve200Response
 */
export interface OsidbApiV1LabelsRetrieve200Response {
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1LabelsRetrieve200Response
     */
    name: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1LabelsRetrieve200Response
     */
    readonly type: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1LabelsRetrieve200Response
     */
    dt?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1LabelsRetrieve200Response
     */
    env?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1LabelsRetrieve200Response
     */
    revision?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1LabelsRetrieve200Response
     */
    version?: string;
}
/**
 * 
 * @export
 * @interface OsidbApiV1SchemaRetrieve200Response
 */
export interface OsidbApiV1SchemaRetrieve200Response {
    [key: string]: any | any;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1SchemaRetrieve200Response
     */
    dt?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1SchemaRetrieve200Response
     */
    env?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1SchemaRetrieve200Response
     */
    revision?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1SchemaRetrieve200Response
     */
    version?: string;
}
/**
 * 
 * @export
 * @interface OsidbApiV1StatusRetrieve200Response
 */
export interface OsidbApiV1StatusRetrieve200Response {
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1StatusRetrieve200Response
     */
    dt?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1StatusRetrieve200Response
     */
    env?: string;
    /**
     * 
     * @type {OsidbApiV1StatusRetrieve200ResponseOsidbData}
     * @memberof OsidbApiV1StatusRetrieve200Response
     */
    osidbData?: OsidbApiV1StatusRetrieve200ResponseOsidbData;
    /**
     * 
     * @type {object}
     * @memberof OsidbApiV1StatusRetrieve200Response
     */
    osidbService?: object;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1StatusRetrieve200Response
     */
    revision?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1StatusRetrieve200Response
     */
    version?: string;
}
/**
 * 
 * @export
 * @interface OsidbApiV1StatusRetrieve200ResponseOsidbData
 */
export interface OsidbApiV1StatusRetrieve200ResponseOsidbData {
    /**
     * 
     * @type {number}
     * @memberof OsidbApiV1StatusRetrieve200ResponseOsidbData
     */
    flawCount?: number;
}
/**
 * 
 * @export
 * @interface OsidbApiV1TrackersCreate201Response
 */
export interface OsidbApiV1TrackersCreate201Response {
    /**
     * 
     * @type {Array<string>}
     * @memberof OsidbApiV1TrackersCreate201Response
     */
    affects: Array<string>;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1TrackersCreate201Response
     */
    readonly cveId: string;
    /**
     * 
     * @type {Array<Erratum>}
     * @memberof OsidbApiV1TrackersCreate201Response
     */
    readonly errata: Array<Erratum>;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1TrackersCreate201Response
     */
    psUpdateStream: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1TrackersCreate201Response
     */
    readonly status: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1TrackersCreate201Response
     */
    readonly resolution: string;
    /**
     * 
     * @type {TrackerNotAffectedJustification}
     * @memberof OsidbApiV1TrackersCreate201Response
     */
    notAffectedJustification: TrackerNotAffectedJustification;
    /**
     * 
     * @type {TrackerType}
     * @memberof OsidbApiV1TrackersCreate201Response
     */
    readonly type: TrackerType;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1TrackersCreate201Response
     */
    readonly uuid: string;
    /**
     * 
     * @type {Array<SpecialHandlingEnum>}
     * @memberof OsidbApiV1TrackersCreate201Response
     */
    readonly specialHandling: Array<SpecialHandlingEnum>;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1TrackersCreate201Response
     */
    readonly resolvedDt: string | null;
    /**
     * The embargoed boolean attribute is technically read-only as it just indirectly modifies the ACLs but is mandatory as it controls the access to the resource.
     * @type {boolean}
     * @memberof OsidbApiV1TrackersCreate201Response
     */
    embargoed: boolean;
    /**
     * 
     * @type {Array<Alert>}
     * @memberof OsidbApiV1TrackersCreate201Response
     */
    readonly alerts: Array<Alert>;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1TrackersCreate201Response
     */
    readonly createdDt: string;
    /**
     * The updated_dt timestamp attribute is mandatory on update as it is used to detect mit-air collisions.
     * @type {string}
     * @memberof OsidbApiV1TrackersCreate201Response
     */
    updatedDt: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1TrackersCreate201Response
     */
    dt?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1TrackersCreate201Response
     */
    env?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1TrackersCreate201Response
     */
    revision?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1TrackersCreate201Response
     */
    version?: string;
}
/**
 * 
 * @export
 * @interface OsidbApiV1TrackersList200Response
 */
export interface OsidbApiV1TrackersList200Response {
    /**
     * 
     * @type {number}
     * @memberof OsidbApiV1TrackersList200Response
     */
    count: number;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1TrackersList200Response
     */
    next?: string | null;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1TrackersList200Response
     */
    previous?: string | null;
    /**
     * 
     * @type {Array<TrackerV1>}
     * @memberof OsidbApiV1TrackersList200Response
     */
    results: Array<TrackerV1>;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1TrackersList200Response
     */
    dt?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1TrackersList200Response
     */
    env?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1TrackersList200Response
     */
    revision?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1TrackersList200Response
     */
    version?: string;
}
/**
 * 
 * @export
 * @interface OsidbApiV1TrackersRetrieve200Response
 */
export interface OsidbApiV1TrackersRetrieve200Response {
    /**
     * 
     * @type {Array<string>}
     * @memberof OsidbApiV1TrackersRetrieve200Response
     */
    readonly affects: Array<string>;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1TrackersRetrieve200Response
     */
    readonly cveId: string;
    /**
     * 
     * @type {Array<Erratum>}
     * @memberof OsidbApiV1TrackersRetrieve200Response
     */
    readonly errata: Array<Erratum>;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1TrackersRetrieve200Response
     */
    readonly externalSystemId: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1TrackersRetrieve200Response
     */
    psUpdateStream?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1TrackersRetrieve200Response
     */
    readonly status: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1TrackersRetrieve200Response
     */
    readonly resolution: string;
    /**
     * 
     * @type {TrackerNotAffectedJustification}
     * @memberof OsidbApiV1TrackersRetrieve200Response
     */
    notAffectedJustification: TrackerNotAffectedJustification;
    /**
     * 
     * @type {TrackerType}
     * @memberof OsidbApiV1TrackersRetrieve200Response
     */
    readonly type: TrackerType;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1TrackersRetrieve200Response
     */
    readonly uuid: string;
    /**
     * 
     * @type {Array<SpecialHandlingEnum>}
     * @memberof OsidbApiV1TrackersRetrieve200Response
     */
    readonly specialHandling: Array<SpecialHandlingEnum>;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1TrackersRetrieve200Response
     */
    readonly resolvedDt: string | null;
    /**
     * The embargoed boolean attribute is technically read-only as it just indirectly modifies the ACLs but is mandatory as it controls the access to the resource.
     * @type {boolean}
     * @memberof OsidbApiV1TrackersRetrieve200Response
     */
    embargoed: boolean;
    /**
     * 
     * @type {Array<Alert>}
     * @memberof OsidbApiV1TrackersRetrieve200Response
     */
    readonly alerts: Array<Alert>;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1TrackersRetrieve200Response
     */
    readonly createdDt: string;
    /**
     * The updated_dt timestamp attribute is mandatory on update as it is used to detect mit-air collisions.
     * @type {string}
     * @memberof OsidbApiV1TrackersRetrieve200Response
     */
    updatedDt: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1TrackersRetrieve200Response
     */
    dt?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1TrackersRetrieve200Response
     */
    env?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1TrackersRetrieve200Response
     */
    revision?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV1TrackersRetrieve200Response
     */
    version?: string;
}
/**
 * 
 * @export
 * @interface OsidbApiV2betaAffectsBulkUpdate200Response
 */
export interface OsidbApiV2betaAffectsBulkUpdate200Response {
    /**
     * 
     * @type {Array<Affect>}
     * @memberof OsidbApiV2betaAffectsBulkUpdate200Response
     */
    results: Array<Affect>;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaAffectsBulkUpdate200Response
     */
    dt?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaAffectsBulkUpdate200Response
     */
    env?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaAffectsBulkUpdate200Response
     */
    revision?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaAffectsBulkUpdate200Response
     */
    version?: string;
}
/**
 * 
 * @export
 * @interface OsidbApiV2betaAffectsCreate201Response
 */
export interface OsidbApiV2betaAffectsCreate201Response {
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaAffectsCreate201Response
     */
    readonly uuid: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaAffectsCreate201Response
     */
    flaw: string;
    /**
     * 
     * @type {AffectAffectedness}
     * @memberof OsidbApiV2betaAffectsCreate201Response
     */
    affectedness?: AffectAffectedness;
    /**
     * 
     * @type {AffectResolution}
     * @memberof OsidbApiV2betaAffectsCreate201Response
     */
    resolution?: AffectResolution;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaAffectsCreate201Response
     */
    psUpdateStream: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaAffectsCreate201Response
     */
    psModule?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaAffectsCreate201Response
     */
    readonly cveId: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaAffectsCreate201Response
     */
    readonly psProduct: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaAffectsCreate201Response
     */
    psComponent?: string | null;
    /**
     * 
     * @type {AffectImpact}
     * @memberof OsidbApiV2betaAffectsCreate201Response
     */
    impact?: AffectImpact;
    /**
     * 
     * @type {Tracker}
     * @memberof OsidbApiV2betaAffectsCreate201Response
     */
    readonly tracker: Tracker | null;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaAffectsCreate201Response
     */
    readonly delegatedResolution: string;
    /**
     * 
     * @type {Array<AffectCVSS>}
     * @memberof OsidbApiV2betaAffectsCreate201Response
     */
    readonly cvssScores: Array<AffectCVSS>;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaAffectsCreate201Response
     */
    purl?: string | null;
    /**
     * 
     * @type {AffectNotAffectedJustification}
     * @memberof OsidbApiV2betaAffectsCreate201Response
     */
    notAffectedJustification?: AffectNotAffectedJustification;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaAffectsCreate201Response
     */
    readonly delegatedNotAffectedJustification: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaAffectsCreate201Response
     */
    readonly resolvedDt: string | null;
    /**
     * 
     * @type {Array<string>}
     * @memberof OsidbApiV2betaAffectsCreate201Response
     */
    readonly labels: Array<string>;
    /**
     * The embargoed boolean attribute is technically read-only as it just indirectly modifies the ACLs but is mandatory as it controls the access to the resource.
     * @type {boolean}
     * @memberof OsidbApiV2betaAffectsCreate201Response
     */
    embargoed: boolean;
    /**
     * 
     * @type {Array<Alert>}
     * @memberof OsidbApiV2betaAffectsCreate201Response
     */
    readonly alerts: Array<Alert>;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaAffectsCreate201Response
     */
    readonly createdDt: string;
    /**
     * The updated_dt timestamp attribute is mandatory on update as it is used to detect mit-air collisions.
     * @type {string}
     * @memberof OsidbApiV2betaAffectsCreate201Response
     */
    updatedDt: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaAffectsCreate201Response
     */
    dt?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaAffectsCreate201Response
     */
    env?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaAffectsCreate201Response
     */
    revision?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaAffectsCreate201Response
     */
    version?: string;
}
/**
 * 
 * @export
 * @interface OsidbApiV2betaAffectsCvssScoresCreate201Response
 */
export interface OsidbApiV2betaAffectsCvssScoresCreate201Response {
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaAffectsCvssScoresCreate201Response
     */
    affect?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaAffectsCvssScoresCreate201Response
     */
    comment?: string | null;
    /**
     * 
     * @type {CvssVersionEnum}
     * @memberof OsidbApiV2betaAffectsCvssScoresCreate201Response
     */
    cvssVersion: CvssVersionEnum;
    /**
     * 
     * @type {IssuerEnum}
     * @memberof OsidbApiV2betaAffectsCvssScoresCreate201Response
     */
    readonly issuer: IssuerEnum;
    /**
     * 
     * @type {number}
     * @memberof OsidbApiV2betaAffectsCvssScoresCreate201Response
     */
    readonly score: number;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaAffectsCvssScoresCreate201Response
     */
    readonly uuid: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaAffectsCvssScoresCreate201Response
     */
    vector: string;
    /**
     * The embargoed boolean attribute is technically read-only as it just indirectly modifies the ACLs but is mandatory as it controls the access to the resource.
     * @type {boolean}
     * @memberof OsidbApiV2betaAffectsCvssScoresCreate201Response
     */
    embargoed: boolean;
    /**
     * 
     * @type {Array<Alert>}
     * @memberof OsidbApiV2betaAffectsCvssScoresCreate201Response
     */
    readonly alerts: Array<Alert>;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaAffectsCvssScoresCreate201Response
     */
    readonly createdDt: string;
    /**
     * The updated_dt timestamp attribute is mandatory on update as it is used to detect mit-air collisions.
     * @type {string}
     * @memberof OsidbApiV2betaAffectsCvssScoresCreate201Response
     */
    updatedDt: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaAffectsCvssScoresCreate201Response
     */
    dt?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaAffectsCvssScoresCreate201Response
     */
    env?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaAffectsCvssScoresCreate201Response
     */
    revision?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaAffectsCvssScoresCreate201Response
     */
    version?: string;
}
/**
 * 
 * @export
 * @interface OsidbApiV2betaAffectsCvssScoresList200Response
 */
export interface OsidbApiV2betaAffectsCvssScoresList200Response {
    /**
     * 
     * @type {number}
     * @memberof OsidbApiV2betaAffectsCvssScoresList200Response
     */
    count: number;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaAffectsCvssScoresList200Response
     */
    next?: string | null;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaAffectsCvssScoresList200Response
     */
    previous?: string | null;
    /**
     * 
     * @type {Array<AffectCVSSV2>}
     * @memberof OsidbApiV2betaAffectsCvssScoresList200Response
     */
    results: Array<AffectCVSSV2>;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaAffectsCvssScoresList200Response
     */
    dt?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaAffectsCvssScoresList200Response
     */
    env?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaAffectsCvssScoresList200Response
     */
    revision?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaAffectsCvssScoresList200Response
     */
    version?: string;
}
/**
 * 
 * @export
 * @interface OsidbApiV2betaAffectsList200Response
 */
export interface OsidbApiV2betaAffectsList200Response {
    /**
     * 
     * @type {number}
     * @memberof OsidbApiV2betaAffectsList200Response
     */
    count: number;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaAffectsList200Response
     */
    next?: string | null;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaAffectsList200Response
     */
    previous?: string | null;
    /**
     * 
     * @type {Array<Affect>}
     * @memberof OsidbApiV2betaAffectsList200Response
     */
    results: Array<Affect>;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaAffectsList200Response
     */
    dt?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaAffectsList200Response
     */
    env?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaAffectsList200Response
     */
    revision?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaAffectsList200Response
     */
    version?: string;
}
/**
 * 
 * @export
 * @interface OsidbApiV2betaFlawsCvssScoresCreate201Response
 */
export interface OsidbApiV2betaFlawsCvssScoresCreate201Response {
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaFlawsCvssScoresCreate201Response
     */
    flaw?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaFlawsCvssScoresCreate201Response
     */
    comment?: string | null;
    /**
     * 
     * @type {CvssVersionEnum}
     * @memberof OsidbApiV2betaFlawsCvssScoresCreate201Response
     */
    cvssVersion: CvssVersionEnum;
    /**
     * 
     * @type {IssuerEnum}
     * @memberof OsidbApiV2betaFlawsCvssScoresCreate201Response
     */
    readonly issuer: IssuerEnum;
    /**
     * 
     * @type {number}
     * @memberof OsidbApiV2betaFlawsCvssScoresCreate201Response
     */
    readonly score: number;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaFlawsCvssScoresCreate201Response
     */
    readonly uuid: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaFlawsCvssScoresCreate201Response
     */
    vector: string;
    /**
     * The embargoed boolean attribute is technically read-only as it just indirectly modifies the ACLs but is mandatory as it controls the access to the resource.
     * @type {boolean}
     * @memberof OsidbApiV2betaFlawsCvssScoresCreate201Response
     */
    embargoed: boolean;
    /**
     * 
     * @type {Array<Alert>}
     * @memberof OsidbApiV2betaFlawsCvssScoresCreate201Response
     */
    readonly alerts: Array<Alert>;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaFlawsCvssScoresCreate201Response
     */
    readonly createdDt: string;
    /**
     * The updated_dt timestamp attribute is mandatory on update as it is used to detect mit-air collisions.
     * @type {string}
     * @memberof OsidbApiV2betaFlawsCvssScoresCreate201Response
     */
    updatedDt: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaFlawsCvssScoresCreate201Response
     */
    dt?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaFlawsCvssScoresCreate201Response
     */
    env?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaFlawsCvssScoresCreate201Response
     */
    revision?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaFlawsCvssScoresCreate201Response
     */
    version?: string;
}
/**
 * 
 * @export
 * @interface OsidbApiV2betaFlawsCvssScoresList200Response
 */
export interface OsidbApiV2betaFlawsCvssScoresList200Response {
    /**
     * 
     * @type {number}
     * @memberof OsidbApiV2betaFlawsCvssScoresList200Response
     */
    count: number;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaFlawsCvssScoresList200Response
     */
    next?: string | null;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaFlawsCvssScoresList200Response
     */
    previous?: string | null;
    /**
     * 
     * @type {Array<FlawCVSSV2>}
     * @memberof OsidbApiV2betaFlawsCvssScoresList200Response
     */
    results: Array<FlawCVSSV2>;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaFlawsCvssScoresList200Response
     */
    dt?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaFlawsCvssScoresList200Response
     */
    env?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaFlawsCvssScoresList200Response
     */
    revision?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaFlawsCvssScoresList200Response
     */
    version?: string;
}
/**
 * 
 * @export
 * @interface OsidbApiV2betaFlawsList200Response
 */
export interface OsidbApiV2betaFlawsList200Response {
    /**
     * 
     * @type {number}
     * @memberof OsidbApiV2betaFlawsList200Response
     */
    count: number;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaFlawsList200Response
     */
    next?: string | null;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaFlawsList200Response
     */
    previous?: string | null;
    /**
     * 
     * @type {Array<Flaw>}
     * @memberof OsidbApiV2betaFlawsList200Response
     */
    results: Array<Flaw>;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaFlawsList200Response
     */
    dt?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaFlawsList200Response
     */
    env?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaFlawsList200Response
     */
    revision?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaFlawsList200Response
     */
    version?: string;
}
/**
 * 
 * @export
 * @interface OsidbApiV2betaTrackersList200Response
 */
export interface OsidbApiV2betaTrackersList200Response {
    /**
     * 
     * @type {number}
     * @memberof OsidbApiV2betaTrackersList200Response
     */
    count: number;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaTrackersList200Response
     */
    next?: string | null;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaTrackersList200Response
     */
    previous?: string | null;
    /**
     * 
     * @type {Array<Tracker>}
     * @memberof OsidbApiV2betaTrackersList200Response
     */
    results: Array<Tracker>;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaTrackersList200Response
     */
    dt?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaTrackersList200Response
     */
    env?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaTrackersList200Response
     */
    revision?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaTrackersList200Response
     */
    version?: string;
}
/**
 * 
 * @export
 * @interface OsidbApiV2betaTrackersRetrieve200Response
 */
export interface OsidbApiV2betaTrackersRetrieve200Response {
    /**
     * 
     * @type {Array<string>}
     * @memberof OsidbApiV2betaTrackersRetrieve200Response
     */
    affects: Array<string>;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaTrackersRetrieve200Response
     */
    readonly cveId: string;
    /**
     * 
     * @type {Array<Erratum>}
     * @memberof OsidbApiV2betaTrackersRetrieve200Response
     */
    readonly errata: Array<Erratum>;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaTrackersRetrieve200Response
     */
    readonly externalSystemId: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaTrackersRetrieve200Response
     */
    psUpdateStream?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaTrackersRetrieve200Response
     */
    readonly status: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaTrackersRetrieve200Response
     */
    readonly resolution: string;
    /**
     * 
     * @type {TrackerNotAffectedJustification}
     * @memberof OsidbApiV2betaTrackersRetrieve200Response
     */
    notAffectedJustification: TrackerNotAffectedJustification;
    /**
     * 
     * @type {TrackerType}
     * @memberof OsidbApiV2betaTrackersRetrieve200Response
     */
    readonly type: TrackerType;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaTrackersRetrieve200Response
     */
    readonly uuid: string;
    /**
     * 
     * @type {Array<SpecialHandlingEnum>}
     * @memberof OsidbApiV2betaTrackersRetrieve200Response
     */
    readonly specialHandling: Array<SpecialHandlingEnum>;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaTrackersRetrieve200Response
     */
    readonly resolvedDt: string | null;
    /**
     * The embargoed boolean attribute is technically read-only as it just indirectly modifies the ACLs but is mandatory as it controls the access to the resource.
     * @type {boolean}
     * @memberof OsidbApiV2betaTrackersRetrieve200Response
     */
    embargoed: boolean;
    /**
     * 
     * @type {Array<Alert>}
     * @memberof OsidbApiV2betaTrackersRetrieve200Response
     */
    readonly alerts: Array<Alert>;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaTrackersRetrieve200Response
     */
    readonly createdDt: string;
    /**
     * The updated_dt timestamp attribute is mandatory on update as it is used to detect mit-air collisions.
     * @type {string}
     * @memberof OsidbApiV2betaTrackersRetrieve200Response
     */
    updatedDt: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaTrackersRetrieve200Response
     */
    dt?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaTrackersRetrieve200Response
     */
    env?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaTrackersRetrieve200Response
     */
    revision?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbApiV2betaTrackersRetrieve200Response
     */
    version?: string;
}
/**
 * 
 * @export
 * @interface OsidbIntegrationsRetrieve200Response
 */
export interface OsidbIntegrationsRetrieve200Response {
    /**
     * 
     * @type {string}
     * @memberof OsidbIntegrationsRetrieve200Response
     */
    jira: string | null;
    /**
     * 
     * @type {string}
     * @memberof OsidbIntegrationsRetrieve200Response
     */
    bugzilla: string | null;
    /**
     * 
     * @type {string}
     * @memberof OsidbIntegrationsRetrieve200Response
     */
    dt?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbIntegrationsRetrieve200Response
     */
    env?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbIntegrationsRetrieve200Response
     */
    revision?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbIntegrationsRetrieve200Response
     */
    version?: string;
}
/**
 * 
 * @export
 * @interface OsidbWhoamiRetrieve200Response
 */
export interface OsidbWhoamiRetrieve200Response {
    /**
     * Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only.
     * @type {string}
     * @memberof OsidbWhoamiRetrieve200Response
     */
    username: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbWhoamiRetrieve200Response
     */
    email?: string;
    /**
     * 
     * @type {Array<string>}
     * @memberof OsidbWhoamiRetrieve200Response
     */
    groups: Array<string>;
    /**
     * 
     * @type {Profile}
     * @memberof OsidbWhoamiRetrieve200Response
     */
    readonly profile: Profile;
    /**
     * 
     * @type {string}
     * @memberof OsidbWhoamiRetrieve200Response
     */
    dt?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbWhoamiRetrieve200Response
     */
    env?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbWhoamiRetrieve200Response
     */
    revision?: string;
    /**
     * 
     * @type {string}
     * @memberof OsidbWhoamiRetrieve200Response
     */
    version?: string;
}
/**
 * package_versions (Package model) serializer for read-only use in FlawSerializer.
 * @export
 * @interface Package
 */
export interface Package {
    /**
     * 
     * @type {string}
     * @memberof Package
     */
    _package: string;
    /**
     * 
     * @type {Array<PackageVer>}
     * @memberof Package
     */
    versions: Array<PackageVer>;
    /**
     * 
     * @type {Array<Alert>}
     * @memberof Package
     */
    readonly alerts: Array<Alert>;
}
/**
 * package_versions (Package model) serializer for read-only use in FlawSerializer.
 * @export
 * @interface PackageRequest
 */
export interface PackageRequest {
    /**
     * 
     * @type {string}
     * @memberof PackageRequest
     */
    _package: string;
    /**
     * 
     * @type {Array<PackageVerRequest>}
     * @memberof PackageRequest
     */
    versions: Array<PackageVerRequest>;
}
/**
 * PackageVer model serializer for read-only use in FlawSerializer via
 * PackageVerSerializer.
 * @export
 * @interface PackageVer
 */
export interface PackageVer {
    /**
     * 
     * @type {string}
     * @memberof PackageVer
     */
    version: string;
    /**
     * 
     * @type {string}
     * @memberof PackageVer
     * @deprecated
     */
    readonly status: string;
}
/**
 * PackageVer model serializer for read-only use in FlawSerializer via
 * PackageVerSerializer.
 * @export
 * @interface PackageVerRequest
 */
export interface PackageVerRequest {
    /**
     * 
     * @type {string}
     * @memberof PackageVerRequest
     */
    version: string;
}
/**
 * 
 * @export
 * @interface PaginatedAffectCVSSList
 */
export interface PaginatedAffectCVSSList {
    /**
     * 
     * @type {number}
     * @memberof PaginatedAffectCVSSList
     */
    count: number;
    /**
     * 
     * @type {string}
     * @memberof PaginatedAffectCVSSList
     */
    next?: string | null;
    /**
     * 
     * @type {string}
     * @memberof PaginatedAffectCVSSList
     */
    previous?: string | null;
    /**
     * 
     * @type {Array<AffectCVSS>}
     * @memberof PaginatedAffectCVSSList
     */
    results: Array<AffectCVSS>;
}
/**
 * 
 * @export
 * @interface PaginatedAffectCVSSV2List
 */
export interface PaginatedAffectCVSSV2List {
    /**
     * 
     * @type {number}
     * @memberof PaginatedAffectCVSSV2List
     */
    count: number;
    /**
     * 
     * @type {string}
     * @memberof PaginatedAffectCVSSV2List
     */
    next?: string | null;
    /**
     * 
     * @type {string}
     * @memberof PaginatedAffectCVSSV2List
     */
    previous?: string | null;
    /**
     * 
     * @type {Array<AffectCVSSV2>}
     * @memberof PaginatedAffectCVSSV2List
     */
    results: Array<AffectCVSSV2>;
}
/**
 * 
 * @export
 * @interface PaginatedAffectList
 */
export interface PaginatedAffectList {
    /**
     * 
     * @type {number}
     * @memberof PaginatedAffectList
     */
    count: number;
    /**
     * 
     * @type {string}
     * @memberof PaginatedAffectList
     */
    next?: string | null;
    /**
     * 
     * @type {string}
     * @memberof PaginatedAffectList
     */
    previous?: string | null;
    /**
     * 
     * @type {Array<Affect>}
     * @memberof PaginatedAffectList
     */
    results: Array<Affect>;
}
/**
 * 
 * @export
 * @interface PaginatedAffectV1List
 */
export interface PaginatedAffectV1List {
    /**
     * 
     * @type {number}
     * @memberof PaginatedAffectV1List
     */
    count: number;
    /**
     * 
     * @type {string}
     * @memberof PaginatedAffectV1List
     */
    next?: string | null;
    /**
     * 
     * @type {string}
     * @memberof PaginatedAffectV1List
     */
    previous?: string | null;
    /**
     * 
     * @type {Array<AffectV1>}
     * @memberof PaginatedAffectV1List
     */
    results: Array<AffectV1>;
}
/**
 * 
 * @export
 * @interface PaginatedAlertList
 */
export interface PaginatedAlertList {
    /**
     * 
     * @type {number}
     * @memberof PaginatedAlertList
     */
    count: number;
    /**
     * 
     * @type {string}
     * @memberof PaginatedAlertList
     */
    next?: string | null;
    /**
     * 
     * @type {string}
     * @memberof PaginatedAlertList
     */
    previous?: string | null;
    /**
     * 
     * @type {Array<Alert>}
     * @memberof PaginatedAlertList
     */
    results: Array<Alert>;
}
/**
 * 
 * @export
 * @interface PaginatedAuditList
 */
export interface PaginatedAuditList {
    /**
     * 
     * @type {number}
     * @memberof PaginatedAuditList
     */
    count: number;
    /**
     * 
     * @type {string}
     * @memberof PaginatedAuditList
     */
    next?: string | null;
    /**
     * 
     * @type {string}
     * @memberof PaginatedAuditList
     */
    previous?: string | null;
    /**
     * 
     * @type {Array<Audit>}
     * @memberof PaginatedAuditList
     */
    results: Array<Audit>;
}
/**
 * 
 * @export
 * @interface PaginatedEPSSList
 */
export interface PaginatedEPSSList {
    /**
     * 
     * @type {number}
     * @memberof PaginatedEPSSList
     */
    count: number;
    /**
     * 
     * @type {string}
     * @memberof PaginatedEPSSList
     */
    next?: string | null;
    /**
     * 
     * @type {string}
     * @memberof PaginatedEPSSList
     */
    previous?: string | null;
    /**
     * 
     * @type {Array<EPSS>}
     * @memberof PaginatedEPSSList
     */
    results: Array<EPSS>;
}
/**
 * 
 * @export
 * @interface PaginatedExploitOnlyReportDataList
 */
export interface PaginatedExploitOnlyReportDataList {
    /**
     * 
     * @type {number}
     * @memberof PaginatedExploitOnlyReportDataList
     */
    count: number;
    /**
     * 
     * @type {string}
     * @memberof PaginatedExploitOnlyReportDataList
     */
    next?: string | null;
    /**
     * 
     * @type {string}
     * @memberof PaginatedExploitOnlyReportDataList
     */
    previous?: string | null;
    /**
     * 
     * @type {Array<ExploitOnlyReportData>}
     * @memberof PaginatedExploitOnlyReportDataList
     */
    results: Array<ExploitOnlyReportData>;
}
/**
 * 
 * @export
 * @interface PaginatedFlawAcknowledgmentList
 */
export interface PaginatedFlawAcknowledgmentList {
    /**
     * 
     * @type {number}
     * @memberof PaginatedFlawAcknowledgmentList
     */
    count: number;
    /**
     * 
     * @type {string}
     * @memberof PaginatedFlawAcknowledgmentList
     */
    next?: string | null;
    /**
     * 
     * @type {string}
     * @memberof PaginatedFlawAcknowledgmentList
     */
    previous?: string | null;
    /**
     * 
     * @type {Array<FlawAcknowledgment>}
     * @memberof PaginatedFlawAcknowledgmentList
     */
    results: Array<FlawAcknowledgment>;
}
/**
 * 
 * @export
 * @interface PaginatedFlawCVSSList
 */
export interface PaginatedFlawCVSSList {
    /**
     * 
     * @type {number}
     * @memberof PaginatedFlawCVSSList
     */
    count: number;
    /**
     * 
     * @type {string}
     * @memberof PaginatedFlawCVSSList
     */
    next?: string | null;
    /**
     * 
     * @type {string}
     * @memberof PaginatedFlawCVSSList
     */
    previous?: string | null;
    /**
     * 
     * @type {Array<FlawCVSS>}
     * @memberof PaginatedFlawCVSSList
     */
    results: Array<FlawCVSS>;
}
/**
 * 
 * @export
 * @interface PaginatedFlawCVSSV2List
 */
export interface PaginatedFlawCVSSV2List {
    /**
     * 
     * @type {number}
     * @memberof PaginatedFlawCVSSV2List
     */
    count: number;
    /**
     * 
     * @type {string}
     * @memberof PaginatedFlawCVSSV2List
     */
    next?: string | null;
    /**
     * 
     * @type {string}
     * @memberof PaginatedFlawCVSSV2List
     */
    previous?: string | null;
    /**
     * 
     * @type {Array<FlawCVSSV2>}
     * @memberof PaginatedFlawCVSSV2List
     */
    results: Array<FlawCVSSV2>;
}
/**
 * 
 * @export
 * @interface PaginatedFlawCollaboratorList
 */
export interface PaginatedFlawCollaboratorList {
    /**
     * 
     * @type {number}
     * @memberof PaginatedFlawCollaboratorList
     */
    count: number;
    /**
     * 
     * @type {string}
     * @memberof PaginatedFlawCollaboratorList
     */
    next?: string | null;
    /**
     * 
     * @type {string}
     * @memberof PaginatedFlawCollaboratorList
     */
    previous?: string | null;
    /**
     * 
     * @type {Array<FlawCollaborator>}
     * @memberof PaginatedFlawCollaboratorList
     */
    results: Array<FlawCollaborator>;
}
/**
 * 
 * @export
 * @interface PaginatedFlawCommentList
 */
export interface PaginatedFlawCommentList {
    /**
     * 
     * @type {number}
     * @memberof PaginatedFlawCommentList
     */
    count: number;
    /**
     * 
     * @type {string}
     * @memberof PaginatedFlawCommentList
     */
    next?: string | null;
    /**
     * 
     * @type {string}
     * @memberof PaginatedFlawCommentList
     */
    previous?: string | null;
    /**
     * 
     * @type {Array<FlawComment>}
     * @memberof PaginatedFlawCommentList
     */
    results: Array<FlawComment>;
}
/**
 * 
 * @export
 * @interface PaginatedFlawLabelList
 */
export interface PaginatedFlawLabelList {
    /**
     * 
     * @type {number}
     * @memberof PaginatedFlawLabelList
     */
    count: number;
    /**
     * 
     * @type {string}
     * @memberof PaginatedFlawLabelList
     */
    next?: string | null;
    /**
     * 
     * @type {string}
     * @memberof PaginatedFlawLabelList
     */
    previous?: string | null;
    /**
     * 
     * @type {Array<FlawLabel>}
     * @memberof PaginatedFlawLabelList
     */
    results: Array<FlawLabel>;
}
/**
 * 
 * @export
 * @interface PaginatedFlawList
 */
export interface PaginatedFlawList {
    /**
     * 
     * @type {number}
     * @memberof PaginatedFlawList
     */
    count: number;
    /**
     * 
     * @type {string}
     * @memberof PaginatedFlawList
     */
    next?: string | null;
    /**
     * 
     * @type {string}
     * @memberof PaginatedFlawList
     */
    previous?: string | null;
    /**
     * 
     * @type {Array<Flaw>}
     * @memberof PaginatedFlawList
     */
    results: Array<Flaw>;
}
/**
 * 
 * @export
 * @interface PaginatedFlawPackageVersionList
 */
export interface PaginatedFlawPackageVersionList {
    /**
     * 
     * @type {number}
     * @memberof PaginatedFlawPackageVersionList
     */
    count: number;
    /**
     * 
     * @type {string}
     * @memberof PaginatedFlawPackageVersionList
     */
    next?: string | null;
    /**
     * 
     * @type {string}
     * @memberof PaginatedFlawPackageVersionList
     */
    previous?: string | null;
    /**
     * 
     * @type {Array<FlawPackageVersion>}
     * @memberof PaginatedFlawPackageVersionList
     */
    results: Array<FlawPackageVersion>;
}
/**
 * 
 * @export
 * @interface PaginatedFlawReferenceList
 */
export interface PaginatedFlawReferenceList {
    /**
     * 
     * @type {number}
     * @memberof PaginatedFlawReferenceList
     */
    count: number;
    /**
     * 
     * @type {string}
     * @memberof PaginatedFlawReferenceList
     */
    next?: string | null;
    /**
     * 
     * @type {string}
     * @memberof PaginatedFlawReferenceList
     */
    previous?: string | null;
    /**
     * 
     * @type {Array<FlawReference>}
     * @memberof PaginatedFlawReferenceList
     */
    results: Array<FlawReference>;
}
/**
 * 
 * @export
 * @interface PaginatedFlawReportDataList
 */
export interface PaginatedFlawReportDataList {
    /**
     * 
     * @type {number}
     * @memberof PaginatedFlawReportDataList
     */
    count: number;
    /**
     * 
     * @type {string}
     * @memberof PaginatedFlawReportDataList
     */
    next?: string | null;
    /**
     * 
     * @type {string}
     * @memberof PaginatedFlawReportDataList
     */
    previous?: string | null;
    /**
     * 
     * @type {Array<FlawReportData>}
     * @memberof PaginatedFlawReportDataList
     */
    results: Array<FlawReportData>;
}
/**
 * 
 * @export
 * @interface PaginatedFlawV1List
 */
export interface PaginatedFlawV1List {
    /**
     * 
     * @type {number}
     * @memberof PaginatedFlawV1List
     */
    count: number;
    /**
     * 
     * @type {string}
     * @memberof PaginatedFlawV1List
     */
    next?: string | null;
    /**
     * 
     * @type {string}
     * @memberof PaginatedFlawV1List
     */
    previous?: string | null;
    /**
     * 
     * @type {Array<FlawV1>}
     * @memberof PaginatedFlawV1List
     */
    results: Array<FlawV1>;
}
/**
 * 
 * @export
 * @interface PaginatedFlawV1ReportDataList
 */
export interface PaginatedFlawV1ReportDataList {
    /**
     * 
     * @type {number}
     * @memberof PaginatedFlawV1ReportDataList
     */
    count: number;
    /**
     * 
     * @type {string}
     * @memberof PaginatedFlawV1ReportDataList
     */
    next?: string | null;
    /**
     * 
     * @type {string}
     * @memberof PaginatedFlawV1ReportDataList
     */
    previous?: string | null;
    /**
     * 
     * @type {Array<FlawV1ReportData>}
     * @memberof PaginatedFlawV1ReportDataList
     */
    results: Array<FlawV1ReportData>;
}
/**
 * 
 * @export
 * @interface PaginatedSupportedProductsList
 */
export interface PaginatedSupportedProductsList {
    /**
     * 
     * @type {number}
     * @memberof PaginatedSupportedProductsList
     */
    count: number;
    /**
     * 
     * @type {string}
     * @memberof PaginatedSupportedProductsList
     */
    next?: string | null;
    /**
     * 
     * @type {string}
     * @memberof PaginatedSupportedProductsList
     */
    previous?: string | null;
    /**
     * 
     * @type {Array<SupportedProducts>}
     * @memberof PaginatedSupportedProductsList
     */
    results: Array<SupportedProducts>;
}
/**
 * 
 * @export
 * @interface PaginatedTrackerList
 */
export interface PaginatedTrackerList {
    /**
     * 
     * @type {number}
     * @memberof PaginatedTrackerList
     */
    count: number;
    /**
     * 
     * @type {string}
     * @memberof PaginatedTrackerList
     */
    next?: string | null;
    /**
     * 
     * @type {string}
     * @memberof PaginatedTrackerList
     */
    previous?: string | null;
    /**
     * 
     * @type {Array<Tracker>}
     * @memberof PaginatedTrackerList
     */
    results: Array<Tracker>;
}
/**
 * 
 * @export
 * @interface PaginatedTrackerV1List
 */
export interface PaginatedTrackerV1List {
    /**
     * 
     * @type {number}
     * @memberof PaginatedTrackerV1List
     */
    count: number;
    /**
     * 
     * @type {string}
     * @memberof PaginatedTrackerV1List
     */
    next?: string | null;
    /**
     * 
     * @type {string}
     * @memberof PaginatedTrackerV1List
     */
    previous?: string | null;
    /**
     * 
     * @type {Array<TrackerV1>}
     * @memberof PaginatedTrackerV1List
     */
    results: Array<TrackerV1>;
}
/**
 * 
 * @export
 * @interface PatchedIntegrationTokenPatchRequest
 */
export interface PatchedIntegrationTokenPatchRequest {
    /**
     * 
     * @type {string}
     * @memberof PatchedIntegrationTokenPatchRequest
     */
    jira?: string;
    /**
     * 
     * @type {string}
     * @memberof PatchedIntegrationTokenPatchRequest
     */
    bugzilla?: string;
}
/**
 * 
 * @export
 * @interface Profile
 */
export interface Profile {
    /**
     * 
     * @type {string}
     * @memberof Profile
     */
    bzUserId?: string;
    /**
     * 
     * @type {string}
     * @memberof Profile
     */
    jiraUserId?: string;
}
/**
 * 
 * @export
 * @interface PsStreamSelection
 */
export interface PsStreamSelection {
    /**
     * 
     * @type {string}
     * @memberof PsStreamSelection
     */
    psUpdateStream: string;
    /**
     * 
     * @type {boolean}
     * @memberof PsStreamSelection
     */
    selected: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof PsStreamSelection
     */
    acked: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof PsStreamSelection
     */
    eus: boolean;
    /**
     * 
     * @type {boolean}
     * @memberof PsStreamSelection
     */
    aus: boolean;
}
/**
 * Task rejection serializer
 * @export
 * @interface RejectRequest
 */
export interface RejectRequest {
    /**
     * 
     * @type {string}
     * @memberof RejectRequest
     */
    reason: string;
}

/**
 * 
 * @export
 */
export const RequiresCveDescriptionEnum = {
    Requested: 'REQUESTED',
    Approved: 'APPROVED',
    Rejected: 'REJECTED'
} as const;
export type RequiresCveDescriptionEnum = typeof RequiresCveDescriptionEnum[keyof typeof RequiresCveDescriptionEnum];


/**
 * 
 * @export
 */
export const ResolutionEnum = {
    Fix: 'FIX',
    Defer: 'DEFER',
    Wontfix: 'WONTFIX',
    Ooss: 'OOSS',
    Delegated: 'DELEGATED',
    Wontreport: 'WONTREPORT'
} as const;
export type ResolutionEnum = typeof ResolutionEnum[keyof typeof ResolutionEnum];


/**
 * 
 * @export
 */
export const SpecialHandlingEnum = {
    MajorIncident: 'Major Incident',
    KevActiveExploitCase: 'KEV (active exploit case)',
    CompliancePriority: 'compliance-priority',
    ContractPriority: 'contract-priority',
    MinorIncident: 'Minor Incident',
    SecuritySelect: 'security-select',
    SupportException: 'support-exception'
} as const;
export type SpecialHandlingEnum = typeof SpecialHandlingEnum[keyof typeof SpecialHandlingEnum];


/**
 * 
 * @export
 */
export const StateEnum = {
    New: 'NEW',
    Req: 'REQ',
    Skip: 'SKIP',
    Done: 'DONE'
} as const;
export type StateEnum = typeof StateEnum[keyof typeof StateEnum];

/**
 * 
 * @export
 * @interface StreamComponent
 */
export interface StreamComponent {
    /**
     * 
     * @type {string}
     * @memberof StreamComponent
     */
    psUpdateStream: string;
    /**
     * 
     * @type {string}
     * @memberof StreamComponent
     */
    psComponent: string;
    /**
     * 
     * @type {PsStreamSelection}
     * @memberof StreamComponent
     */
    offer: PsStreamSelection;
    /**
     * 
     * @type {boolean}
     * @memberof StreamComponent
     */
    selected: boolean;
    /**
     * 
     * @type {Affect}
     * @memberof StreamComponent
     */
    affect: Affect;
}
/**
 * 
 * @export
 * @interface SupportedProducts
 */
export interface SupportedProducts {
    /**
     * 
     * @type {string}
     * @memberof SupportedProducts
     */
    name: string;
}
/**
 * 
 * @export
 * @interface TokenObtainPair
 */
export interface TokenObtainPair {
    /**
     * 
     * @type {string}
     * @memberof TokenObtainPair
     */
    readonly access: string;
    /**
     * 
     * @type {string}
     * @memberof TokenObtainPair
     */
    readonly refresh: string;
}
/**
 * 
 * @export
 * @interface TokenObtainPairRequest
 */
export interface TokenObtainPairRequest {
    /**
     * 
     * @type {string}
     * @memberof TokenObtainPairRequest
     */
    username: string;
    /**
     * 
     * @type {string}
     * @memberof TokenObtainPairRequest
     */
    password: string;
}
/**
 * 
 * @export
 * @interface TokenRefresh
 */
export interface TokenRefresh {
    /**
     * 
     * @type {string}
     * @memberof TokenRefresh
     */
    readonly access: string;
}
/**
 * 
 * @export
 * @interface TokenRefreshRequest
 */
export interface TokenRefreshRequest {
    /**
     * 
     * @type {string}
     * @memberof TokenRefreshRequest
     */
    refresh: string;
}
/**
 * 
 * @export
 * @interface TokenVerifyRequest
 */
export interface TokenVerifyRequest {
    /**
     * 
     * @type {string}
     * @memberof TokenVerifyRequest
     */
    token: string;
}
/**
 * Tracker serializer
 * @export
 * @interface Tracker
 */
export interface Tracker {
    /**
     * 
     * @type {Array<string>}
     * @memberof Tracker
     */
    affects: Array<string>;
    /**
     * 
     * @type {string}
     * @memberof Tracker
     */
    readonly cveId: string;
    /**
     * 
     * @type {Array<Erratum>}
     * @memberof Tracker
     */
    readonly errata: Array<Erratum>;
    /**
     * 
     * @type {string}
     * @memberof Tracker
     */
    readonly externalSystemId: string;
    /**
     * 
     * @type {string}
     * @memberof Tracker
     */
    psUpdateStream?: string;
    /**
     * 
     * @type {string}
     * @memberof Tracker
     */
    readonly status: string;
    /**
     * 
     * @type {string}
     * @memberof Tracker
     */
    readonly resolution: string;
    /**
     * 
     * @type {TrackerNotAffectedJustification}
     * @memberof Tracker
     */
    notAffectedJustification: TrackerNotAffectedJustification;
    /**
     * 
     * @type {TrackerType}
     * @memberof Tracker
     */
    readonly type: TrackerType;
    /**
     * 
     * @type {string}
     * @memberof Tracker
     */
    readonly uuid: string;
    /**
     * 
     * @type {Array<SpecialHandlingEnum>}
     * @memberof Tracker
     */
    readonly specialHandling: Array<SpecialHandlingEnum>;
    /**
     * 
     * @type {string}
     * @memberof Tracker
     */
    readonly resolvedDt: string | null;
    /**
     * The embargoed boolean attribute is technically read-only as it just indirectly modifies the ACLs but is mandatory as it controls the access to the resource.
     * @type {boolean}
     * @memberof Tracker
     */
    embargoed: boolean;
    /**
     * 
     * @type {Array<Alert>}
     * @memberof Tracker
     */
    readonly alerts: Array<Alert>;
    /**
     * 
     * @type {string}
     * @memberof Tracker
     */
    readonly createdDt: string;
    /**
     * The updated_dt timestamp attribute is mandatory on update as it is used to detect mit-air collisions.
     * @type {string}
     * @memberof Tracker
     */
    updatedDt: string;
}
/**
 * @type TrackerNotAffectedJustification
 * 
 * @export
 */
export type TrackerNotAffectedJustification = BlankEnum | NotAffectedJustificationEnum;
/**
 * Tracker serializer
 * @export
 * @interface TrackerPost
 */
export interface TrackerPost {
    /**
     * 
     * @type {Array<string>}
     * @memberof TrackerPost
     */
    affects: Array<string>;
    /**
     * 
     * @type {string}
     * @memberof TrackerPost
     */
    readonly cveId: string;
    /**
     * 
     * @type {Array<Erratum>}
     * @memberof TrackerPost
     */
    readonly errata: Array<Erratum>;
    /**
     * 
     * @type {string}
     * @memberof TrackerPost
     */
    psUpdateStream: string;
    /**
     * 
     * @type {string}
     * @memberof TrackerPost
     */
    readonly status: string;
    /**
     * 
     * @type {string}
     * @memberof TrackerPost
     */
    readonly resolution: string;
    /**
     * 
     * @type {TrackerNotAffectedJustification}
     * @memberof TrackerPost
     */
    notAffectedJustification: TrackerNotAffectedJustification;
    /**
     * 
     * @type {TrackerType}
     * @memberof TrackerPost
     */
    readonly type: TrackerType;
    /**
     * 
     * @type {string}
     * @memberof TrackerPost
     */
    readonly uuid: string;
    /**
     * 
     * @type {Array<SpecialHandlingEnum>}
     * @memberof TrackerPost
     */
    readonly specialHandling: Array<SpecialHandlingEnum>;
    /**
     * 
     * @type {string}
     * @memberof TrackerPost
     */
    readonly resolvedDt: string | null;
    /**
     * The embargoed boolean attribute is technically read-only as it just indirectly modifies the ACLs but is mandatory as it controls the access to the resource.
     * @type {boolean}
     * @memberof TrackerPost
     */
    embargoed: boolean;
    /**
     * 
     * @type {Array<Alert>}
     * @memberof TrackerPost
     */
    readonly alerts: Array<Alert>;
    /**
     * 
     * @type {string}
     * @memberof TrackerPost
     */
    readonly createdDt: string;
    /**
     * The updated_dt timestamp attribute is mandatory on update as it is used to detect mit-air collisions.
     * @type {string}
     * @memberof TrackerPost
     */
    updatedDt: string;
}
/**
 * Tracker serializer
 * @export
 * @interface TrackerPostRequest
 */
export interface TrackerPostRequest {
    /**
     * 
     * @type {Array<string>}
     * @memberof TrackerPostRequest
     */
    affects: Array<string>;
    /**
     * 
     * @type {string}
     * @memberof TrackerPostRequest
     */
    psUpdateStream: string;
    /**
     * The embargoed boolean attribute is technically read-only as it just indirectly modifies the ACLs but is mandatory as it controls the access to the resource.
     * @type {boolean}
     * @memberof TrackerPostRequest
     */
    embargoed: boolean;
    /**
     * The updated_dt timestamp attribute is mandatory on update as it is used to detect mit-air collisions.
     * @type {string}
     * @memberof TrackerPostRequest
     */
    updatedDt: string;
    /**
     * Setting sync_to_bz to false disables flaw sync with Bugzilla after this operation. Use only as part of bulk actions and trigger a flaw bugzilla sync afterwards. Does nothing if BZ is disabled.
     * @type {boolean}
     * @memberof TrackerPostRequest
     */
    syncToBz?: boolean;
}
/**
 * 
 * @export
 * @interface TrackerReportData
 */
export interface TrackerReportData {
    /**
     * 
     * @type {TrackerType}
     * @memberof TrackerReportData
     */
    type: TrackerType;
    /**
     * 
     * @type {string}
     * @memberof TrackerReportData
     */
    externalSystemId: string;
    /**
     * 
     * @type {string}
     * @memberof TrackerReportData
     */
    status?: string;
    /**
     * 
     * @type {string}
     * @memberof TrackerReportData
     */
    resolution?: string;
}
/**
 * Tracker serializer
 * @export
 * @interface TrackerRequest
 */
export interface TrackerRequest {
    /**
     * 
     * @type {Array<string>}
     * @memberof TrackerRequest
     */
    affects: Array<string>;
    /**
     * 
     * @type {string}
     * @memberof TrackerRequest
     */
    psUpdateStream?: string;
    /**
     * The embargoed boolean attribute is technically read-only as it just indirectly modifies the ACLs but is mandatory as it controls the access to the resource.
     * @type {boolean}
     * @memberof TrackerRequest
     */
    embargoed: boolean;
    /**
     * The updated_dt timestamp attribute is mandatory on update as it is used to detect mit-air collisions.
     * @type {string}
     * @memberof TrackerRequest
     */
    updatedDt: string;
    /**
     * Setting sync_to_bz to false disables flaw sync with Bugzilla after this operation. Use only as part of bulk actions and trigger a flaw bugzilla sync afterwards. Does nothing if BZ is disabled.
     * @type {boolean}
     * @memberof TrackerRequest
     */
    syncToBz?: boolean;
}
/**
 * 
 * @export
 * @interface TrackerSuggestion
 */
export interface TrackerSuggestion {
    /**
     * 
     * @type {Array<StreamComponent>}
     * @memberof TrackerSuggestion
     */
    streamsComponents: Array<StreamComponent>;
    /**
     * 
     * @type {Array<Affect>}
     * @memberof TrackerSuggestion
     */
    notApplicable: Array<Affect>;
}
/**
 * 
 * @export
 * @interface TrackerSuggestionV1
 */
export interface TrackerSuggestionV1 {
    /**
     * 
     * @type {Array<ModuleComponent>}
     * @memberof TrackerSuggestionV1
     */
    modulesComponents: Array<ModuleComponent>;
    /**
     * 
     * @type {Array<Affect>}
     * @memberof TrackerSuggestionV1
     */
    notApplicable: Array<Affect>;
}

/**
 * 
 * @export
 */
export const TrackerType = {
    Jira: 'JIRA',
    Bugzilla: 'BUGZILLA'
} as const;
export type TrackerType = typeof TrackerType[keyof typeof TrackerType];

/**
 * Serializer for the tracker model adapted to affects v1
 * @export
 * @interface TrackerV1
 */
export interface TrackerV1 {
    /**
     * 
     * @type {Array<string>}
     * @memberof TrackerV1
     */
    readonly affects: Array<string>;
    /**
     * 
     * @type {string}
     * @memberof TrackerV1
     */
    readonly cveId: string;
    /**
     * 
     * @type {Array<Erratum>}
     * @memberof TrackerV1
     */
    readonly errata: Array<Erratum>;
    /**
     * 
     * @type {string}
     * @memberof TrackerV1
     */
    readonly externalSystemId: string;
    /**
     * 
     * @type {string}
     * @memberof TrackerV1
     */
    psUpdateStream?: string;
    /**
     * 
     * @type {string}
     * @memberof TrackerV1
     */
    readonly status: string;
    /**
     * 
     * @type {string}
     * @memberof TrackerV1
     */
    readonly resolution: string;
    /**
     * 
     * @type {TrackerNotAffectedJustification}
     * @memberof TrackerV1
     */
    notAffectedJustification: TrackerNotAffectedJustification;
    /**
     * 
     * @type {TrackerType}
     * @memberof TrackerV1
     */
    readonly type: TrackerType;
    /**
     * 
     * @type {string}
     * @memberof TrackerV1
     */
    readonly uuid: string;
    /**
     * 
     * @type {Array<SpecialHandlingEnum>}
     * @memberof TrackerV1
     */
    readonly specialHandling: Array<SpecialHandlingEnum>;
    /**
     * 
     * @type {string}
     * @memberof TrackerV1
     */
    readonly resolvedDt: string | null;
    /**
     * The embargoed boolean attribute is technically read-only as it just indirectly modifies the ACLs but is mandatory as it controls the access to the resource.
     * @type {boolean}
     * @memberof TrackerV1
     */
    embargoed: boolean;
    /**
     * 
     * @type {Array<Alert>}
     * @memberof TrackerV1
     */
    readonly alerts: Array<Alert>;
    /**
     * 
     * @type {string}
     * @memberof TrackerV1
     */
    readonly createdDt: string;
    /**
     * The updated_dt timestamp attribute is mandatory on update as it is used to detect mit-air collisions.
     * @type {string}
     * @memberof TrackerV1
     */
    updatedDt: string;
}
/**
 * Serializer for the tracker model adapted to affects v1
 * @export
 * @interface TrackerV1Request
 */
export interface TrackerV1Request {
    /**
     * 
     * @type {string}
     * @memberof TrackerV1Request
     */
    psUpdateStream?: string;
    /**
     * The embargoed boolean attribute is technically read-only as it just indirectly modifies the ACLs but is mandatory as it controls the access to the resource.
     * @type {boolean}
     * @memberof TrackerV1Request
     */
    embargoed: boolean;
    /**
     * The updated_dt timestamp attribute is mandatory on update as it is used to detect mit-air collisions.
     * @type {string}
     * @memberof TrackerV1Request
     */
    updatedDt: string;
    /**
     * Setting sync_to_bz to false disables flaw sync with Bugzilla after this operation. Use only as part of bulk actions and trigger a flaw bugzilla sync afterwards. Does nothing if BZ is disabled.
     * @type {boolean}
     * @memberof TrackerV1Request
     */
    syncToBz?: boolean;
}
/**
 * 
 * @export
 * @interface TrackersApiV1FileCreate200Response
 */
export interface TrackersApiV1FileCreate200Response {
    /**
     * 
     * @type {Array<ModuleComponent>}
     * @memberof TrackersApiV1FileCreate200Response
     */
    modulesComponents: Array<ModuleComponent>;
    /**
     * 
     * @type {Array<Affect>}
     * @memberof TrackersApiV1FileCreate200Response
     */
    notApplicable: Array<Affect>;
    /**
     * 
     * @type {string}
     * @memberof TrackersApiV1FileCreate200Response
     */
    dt?: string;
    /**
     * 
     * @type {string}
     * @memberof TrackersApiV1FileCreate200Response
     */
    env?: string;
    /**
     * 
     * @type {string}
     * @memberof TrackersApiV1FileCreate200Response
     */
    revision?: string;
    /**
     * 
     * @type {string}
     * @memberof TrackersApiV1FileCreate200Response
     */
    version?: string;
}
/**
 * 
 * @export
 * @interface TrackersApiV2FileCreate200Response
 */
export interface TrackersApiV2FileCreate200Response {
    /**
     * 
     * @type {Array<StreamComponent>}
     * @memberof TrackersApiV2FileCreate200Response
     */
    streamsComponents: Array<StreamComponent>;
    /**
     * 
     * @type {Array<Affect>}
     * @memberof TrackersApiV2FileCreate200Response
     */
    notApplicable: Array<Affect>;
    /**
     * 
     * @type {string}
     * @memberof TrackersApiV2FileCreate200Response
     */
    dt?: string;
    /**
     * 
     * @type {string}
     * @memberof TrackersApiV2FileCreate200Response
     */
    env?: string;
    /**
     * 
     * @type {string}
     * @memberof TrackersApiV2FileCreate200Response
     */
    revision?: string;
    /**
     * 
     * @type {string}
     * @memberof TrackersApiV2FileCreate200Response
     */
    version?: string;
}
/**
 * 
 * @export
 * @interface User
 */
export interface User {
    /**
     * Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only.
     * @type {string}
     * @memberof User
     */
    username: string;
    /**
     * 
     * @type {string}
     * @memberof User
     */
    email?: string;
    /**
     * 
     * @type {Array<string>}
     * @memberof User
     */
    groups: Array<string>;
    /**
     * 
     * @type {Profile}
     * @memberof User
     */
    readonly profile: Profile;
}
