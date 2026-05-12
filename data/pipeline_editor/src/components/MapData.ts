// To parse this data:
//
//   import { Convert, MapData } from "./file";
//
//   const mapData = Convert.toMapData(json);
//
// These functions will throw an error if the JSON doesn't
// match the expected interface, even if the JSON is valid.

export interface MapData {
    version:   number;
    generator: string;
    osm3s:     Osm3S;
    elements:  Element[];
}

export interface Element {
    type:     Type;
    id:       number;
    bounds:   Bounds;
    nodes:    number[];
    geometry: Geometry[];
    tags:     Tags;
}

export interface Bounds {
    minlat: number;
    minlon: number;
    maxlat: number;
    maxlon: number;
}

export interface Geometry {
    lat: number;
    lon: number;
}

export interface Tags {
    man_made:           ManMade;
    substance:          Substance;
    layer?:             string;
    location?:          Location;
    source?:            string;
    "name:ru"?:         string;
    operator?:          string;
    network?:           Network;
    usage?:             Network;
    "addr:country"?:    AddrCountry;
    "addr:region"?:     AddrRegion;
    diameter?:          string;
    name?:              string;
    "name:en"?:         string;
    description?:       string;
    flow_direction?:    string;
    maxheight?:         string;
    pressure?:          string;
    "operator:source"?: string;
    bridge?:            string;
    note?:              string;
    colour?:            string;
    start_date?:        string;
    "name:zh"?:         string;
}

export enum AddrCountry {
    Uz = "UZ",
}

export enum AddrRegion {
    QaraqalpaqstanRespublikası = "Qaraqalpaqstan Respublikası",
}

export enum Location {
    Overground = "overground",
    Overhead = "overhead",
    Underground = "underground",
}

export enum ManMade {
    Pipeline = "pipeline",
}

export enum Network {
    Gathering = "gathering",
    Transmission = "transmission",
    TransmissionBranch = "transmission_branch",
    Transportation = "transportation",
}

export enum Substance {
    Gas = "gas",
}

export enum Type {
    Way = "way",
}

export interface Osm3S {
    timestamp_osm_base: string;
    copyright:          string;
}

// Converts JSON strings to/from your types
// and asserts the results of JSON.parse at runtime
export class Convert {
    public static toMapData(json: string): MapData {
        return cast(JSON.parse(json), r("MapData"));
    }

    public static mapDataToJson(value: MapData): string {
        return JSON.stringify(uncast(value, r("MapData")), null, 2);
    }
}

function invalidValue(typ: any, val: any, key: any, parent: any = ''): never {
    const prettyTyp = prettyTypeName(typ);
    const parentText = parent ? ` on ${parent}` : '';
    const keyText = key ? ` for key "${key}"` : '';
    throw Error(`Invalid value${keyText}${parentText}. Expected ${prettyTyp} but got ${JSON.stringify(val)}`);
}

function prettyTypeName(typ: any): string {
    if (Array.isArray(typ)) {
        if (typ.length === 2 && typ[0] === undefined) {
            return `an optional ${prettyTypeName(typ[1])}`;
        } else {
            return `one of [${typ.map(a => { return prettyTypeName(a); }).join(", ")}]`;
        }
    } else if (typeof typ === "object" && typ.literal !== undefined) {
        return typ.literal;
    } else {
        return typeof typ;
    }
}

function jsonToJSProps(typ: any): any {
    if (typ.jsonToJS === undefined) {
        const map: any = {};
        typ.props.forEach((p: any) => map[p.json] = { key: p.js, typ: p.typ });
        typ.jsonToJS = map;
    }
    return typ.jsonToJS;
}

function jsToJSONProps(typ: any): any {
    if (typ.jsToJSON === undefined) {
        const map: any = {};
        typ.props.forEach((p: any) => map[p.js] = { key: p.json, typ: p.typ });
        typ.jsToJSON = map;
    }
    return typ.jsToJSON;
}

function transform(val: any, typ: any, getProps: any, key: any = '', parent: any = ''): any {
    function transformPrimitive(typ: string, val: any): any {
        if (typeof typ === typeof val) return val;
        return invalidValue(typ, val, key, parent);
    }

    function transformUnion(typs: any[], val: any): any {
        // val must validate against one typ in typs
        const l = typs.length;
        for (let i = 0; i < l; i++) {
            const typ = typs[i];
            try {
                return transform(val, typ, getProps);
            } catch (_) {}
        }
        return invalidValue(typs, val, key, parent);
    }

    function transformEnum(cases: string[], val: any): any {
        if (cases.indexOf(val) !== -1) return val;
        return invalidValue(cases.map(a => { return l(a); }), val, key, parent);
    }

    function transformArray(typ: any, val: any): any {
        // val must be an array with no invalid elements
        if (!Array.isArray(val)) return invalidValue(l("array"), val, key, parent);
        return val.map(el => transform(el, typ, getProps));
    }

    function transformDate(val: any): any {
        if (val === null) {
            return null;
        }
        const d = new Date(val);
        if (isNaN(d.valueOf())) {
            return invalidValue(l("Date"), val, key, parent);
        }
        return d;
    }

    function transformObject(props: { [k: string]: any }, additional: any, val: any): any {
        if (val === null || typeof val !== "object" || Array.isArray(val)) {
            return invalidValue(l(ref || "object"), val, key, parent);
        }
        const result: any = {};
        Object.getOwnPropertyNames(props).forEach(key => {
            const prop = props[key];
            const v = Object.prototype.hasOwnProperty.call(val, key) ? val[key] : undefined;
            result[prop.key] = transform(v, prop.typ, getProps, key, ref);
        });
        Object.getOwnPropertyNames(val).forEach(key => {
            if (!Object.prototype.hasOwnProperty.call(props, key)) {
                result[key] = transform(val[key], additional, getProps, key, ref);
            }
        });
        return result;
    }

    if (typ === "any") return val;
    if (typ === null) {
        if (val === null) return val;
        return invalidValue(typ, val, key, parent);
    }
    if (typ === false) return invalidValue(typ, val, key, parent);
    let ref: any = undefined;
    while (typeof typ === "object" && typ.ref !== undefined) {
        ref = typ.ref;
        typ = typeMap[typ.ref];
    }
    if (Array.isArray(typ)) return transformEnum(typ, val);
    if (typeof typ === "object") {
        return typ.hasOwnProperty("unionMembers") ? transformUnion(typ.unionMembers, val)
            : typ.hasOwnProperty("arrayItems")    ? transformArray(typ.arrayItems, val)
            : typ.hasOwnProperty("props")         ? transformObject(getProps(typ), typ.additional, val)
            : invalidValue(typ, val, key, parent);
    }
    // Numbers can be parsed by Date but shouldn't be.
    if (typ === Date && typeof val !== "number") return transformDate(val);
    return transformPrimitive(typ, val);
}

function cast<T>(val: any, typ: any): T {
    return transform(val, typ, jsonToJSProps);
}

function uncast<T>(val: T, typ: any): any {
    return transform(val, typ, jsToJSONProps);
}

function l(typ: any) {
    return { literal: typ };
}

function a(typ: any) {
    return { arrayItems: typ };
}

function u(...typs: any[]) {
    return { unionMembers: typs };
}

function o(props: any[], additional: any) {
    return { props, additional };
}

function m(additional: any) {
    return { props: [], additional };
}

function r(name: string) {
    return { ref: name };
}

const typeMap: any = {
    "MapData": o([
        { json: "version", js: "version", typ: 3.14 },
        { json: "generator", js: "generator", typ: "" },
        { json: "osm3s", js: "osm3s", typ: r("Osm3S") },
        { json: "elements", js: "elements", typ: a(r("Element")) },
    ], false),
    "Element": o([
        { json: "type", js: "type", typ: r("Type") },
        { json: "id", js: "id", typ: 0 },
        { json: "bounds", js: "bounds", typ: r("Bounds") },
        { json: "nodes", js: "nodes", typ: a(0) },
        { json: "geometry", js: "geometry", typ: a(r("Geometry")) },
        { json: "tags", js: "tags", typ: r("Tags") },
    ], false),
    "Bounds": o([
        { json: "minlat", js: "minlat", typ: 3.14 },
        { json: "minlon", js: "minlon", typ: 3.14 },
        { json: "maxlat", js: "maxlat", typ: 3.14 },
        { json: "maxlon", js: "maxlon", typ: 3.14 },
    ], false),
    "Geometry": o([
        { json: "lat", js: "lat", typ: 3.14 },
        { json: "lon", js: "lon", typ: 3.14 },
    ], false),
    "Tags": o([
        { json: "man_made", js: "man_made", typ: r("ManMade") },
        { json: "substance", js: "substance", typ: r("Substance") },
        { json: "layer", js: "layer", typ: u(undefined, "") },
        { json: "location", js: "location", typ: u(undefined, r("Location")) },
        { json: "source", js: "source", typ: u(undefined, "") },
        { json: "name:ru", js: "name:ru", typ: u(undefined, "") },
        { json: "operator", js: "operator", typ: u(undefined, "") },
        { json: "network", js: "network", typ: u(undefined, r("Network")) },
        { json: "usage", js: "usage", typ: u(undefined, r("Network")) },
        { json: "addr:country", js: "addr:country", typ: u(undefined, r("AddrCountry")) },
        { json: "addr:region", js: "addr:region", typ: u(undefined, r("AddrRegion")) },
        { json: "diameter", js: "diameter", typ: u(undefined, "") },
        { json: "name", js: "name", typ: u(undefined, "") },
        { json: "name:en", js: "name:en", typ: u(undefined, "") },
        { json: "description", js: "description", typ: u(undefined, "") },
        { json: "flow_direction", js: "flow_direction", typ: u(undefined, "") },
        { json: "maxheight", js: "maxheight", typ: u(undefined, "") },
        { json: "pressure", js: "pressure", typ: u(undefined, "") },
        { json: "operator:source", js: "operator:source", typ: u(undefined, "") },
        { json: "bridge", js: "bridge", typ: u(undefined, "") },
        { json: "note", js: "note", typ: u(undefined, "") },
        { json: "colour", js: "colour", typ: u(undefined, "") },
        { json: "start_date", js: "start_date", typ: u(undefined, "") },
        { json: "name:zh", js: "name:zh", typ: u(undefined, "") },
    ], false),
    "Osm3S": o([
        { json: "timestamp_osm_base", js: "timestamp_osm_base", typ: Date },
        { json: "copyright", js: "copyright", typ: "" },
    ], false),
    "AddrCountry": [
        "UZ",
    ],
    "AddrRegion": [
        "Qaraqalpaqstan Respublikası",
    ],
    "Location": [
        "overground",
        "overhead",
        "underground",
    ],
    "ManMade": [
        "pipeline",
    ],
    "Network": [
        "gathering",
        "transmission",
        "transmission_branch",
        "transportation",
    ],
    "Substance": [
        "gas",
    ],
    "Type": [
        "way",
    ],
};
