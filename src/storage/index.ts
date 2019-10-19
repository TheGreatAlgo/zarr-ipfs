import { normalizeStoragePath } from '../util';
import { Store, ValidStoreType } from "./types";
import { ARRAY_META_KEY, GROUP_META_KEY } from '../names';
import { FillType, Order, Filter, Compressor, ZarrGroupMetadata } from "../types";
import { ContainsArrayError, ContainsGroupError } from '../errors';


/**
 * Return true if the store contains an array at the given logical path.
 */
export function containsArray<T>(store: Store<ValidStoreType>, path: string | null = null) {
    path = normalizeStoragePath(path);
    const prefix = pathToPrefix(path);
    const key = prefix + ARRAY_META_KEY;
    return store.containsItem(key);
}

/**
 * Return true if the store contains a group at the given logical path.
 */
export function containsGroup<T>(store: Store<ValidStoreType>, path: string | null = null) {
    path = normalizeStoragePath(path);
    const prefix = pathToPrefix(path);
    const key = prefix + GROUP_META_KEY;
    return store.containsItem(key);
}


export function pathToPrefix(path: string): string {
    // assume path already normalized
    if (path.length > 0) {
        return path + '/';
    }
    return '';
}

function listDirFromKeys(store: Store<any>, path: string): string[] {
    // assume path already normalized
    const prefix = pathToPrefix(path);
    const children = new Set<string>();

    for (const key in store.keys()) {
        if (key.startsWith(prefix) && key.length > prefix.length) {
            const suffix = key.slice(prefix.length);
            const child = suffix.split('/')[0];
            children.add(child);
        }
    }
    return Array.from(children).sort();
}

function requireParentGroup(store: Store<any>, path: string, chunkStore: Store<any> | null, overwrite: boolean) {
    // Assume path is normalized
    if (path.length === 0) {
        return;
    }

    const segments = path.split("/");
    let p = "";
    for (const s of segments) {
        p += s;
        if (containsArray(store, p)) {
            initGroupMetadata(store, p, chunkStore,
                overwrite);
        } else if (!containsGroup(store, p)) {
            initGroupMetadata(store, p, chunkStore);
        }
        p += "/";
    }
}

/**
 * Obtain a directory listing for the given path. If `store` provides a `listDir`
 *  method, this will be called, otherwise will fall back to implementation via the
 *  `MutableMapping` interface.
 * @param store 
 */
export function listDir(store: Store<any>, path: string | null = null): string[] {
    path = normalizeStoragePath(path);
    if (store.listDir) {
        return store.listDir(path);
    } else {
        return listDirFromKeys(store, path);
    }
}

function initGroupMetadata(store: Store<ValidStoreType>, path: string | null = null, chunkStore: null | Store<ValidStoreType> = null, overwrite = false) {
    path = normalizeStoragePath(path);

    if (overwrite) {
        throw Error("Group overwriting not implemented yet :(");
    } else if (containsArray(store, path)) {
        throw new ContainsArrayError(path);
    } else if (containsGroup(store, path)) {
        throw new ContainsGroupError(path);
    }

    const metadata: ZarrGroupMetadata = { zarr_format: 2 };
    const key = pathToPrefix(path) + GROUP_META_KEY;
    store.setItem(key, JSON.stringify(metadata));
}

function initArrayMetadata(
    store: Store<ValidStoreType>,
    chunks: boolean,
    path: string | null,
    compressor: null | Compressor,
    fillValue: FillType,
    order: Order,
    overwrite: boolean,
    chunkStore: null | Store<ValidStoreType>,
    filters: null | Filter[]
) {

}

export function initArray(
    store: Store<ValidStoreType>,
    chunks: boolean,
    path: string | null = null,
    compressor: null | Compressor = null,
    fillValue: FillType = null,
    order: Order = "C",
    overwrite: boolean = false,
    chunkStore: null | Store<ValidStoreType> = null,
    filters: null | Filter[] = null
) {

    path = normalizeStoragePath(path);
    requireParentGroup(store, path, chunkStore, overwrite);
    initArrayMetadata(store, chunks, path, compressor, fillValue, order, overwrite, chunkStore, filters);
}

