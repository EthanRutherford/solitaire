export const saveGameTable = "saves";
export const settingsTable = "settings";
export const logsTable = "logs";

// opens the database, initializing it if necessary
async function openDatabase() {
	return new Promise<IDBDatabase>((resolve, reject) => {
		const request = indexedDB.open("solitaire", 2);

		request.onupgradeneeded = function({oldVersion}) {
			const database = this.result;

			// create tables
			if (oldVersion < 1) {
				database.createObjectStore(saveGameTable, {keyPath: "key"});
				database.createObjectStore(settingsTable, {keyPath: "key"});
			}
			if (oldVersion < 2) {
				database.createObjectStore(logsTable, {autoIncrement: true});
			}
		};

		void navigator.storage.persist();
		request.onerror = reject;
		request.onsuccess = function() {
			resolve(this.result);
		};
	});
}

// core database interactions
async function getCore<T>(objectStore: IDBObjectStore, id: IDBValidKey) {
	return new Promise<T | null>((resolve, reject) => {
		const request = objectStore.get(id);
		request.onerror = reject;
		request.onsuccess = function() {
			resolve(this.result as T | null);
		};
	});
}
async function listCore<T>(objectStore: IDBObjectStore) {
	return new Promise<{id: IDBValidKey; value: T}[]>((resolve, reject) => {
		const request = objectStore.openCursor();
		request.onerror = reject;

		const list: {id: IDBValidKey; value: T}[] = [];
		request.onsuccess = function() {
			const cursor = this.result;
			if (cursor) {
				list.push({id: cursor.key, value: cursor.value as T});
				cursor.continue();
			} else {
				resolve(list);
			}
		};
	});
}
async function addCore<T>(objectStore: IDBObjectStore, object: T) {
	return new Promise<IDBValidKey>((resolve, reject) => {
		const request = objectStore.add(object);
		request.onerror = reject;
		request.onsuccess = function() {
			resolve(this.result);
		};
	});
}
async function putCore<T>(objectStore: IDBObjectStore, object: T, id?: IDBValidKey) {
	return new Promise<IDBValidKey>((resolve, reject) => {
		const request = objectStore.put(object, id);
		request.onerror = reject;
		request.onsuccess = function() {
			resolve(this.result);
		};
	});
}
async function deleteCore(objectStore: IDBObjectStore, id: IDBValidKey) {
	return new Promise<void>((resolve, reject) => {
		const request = objectStore.delete(id);
		request.onerror = reject;
		request.onsuccess = function() {
			resolve();
		};
	});
}
async function countCore(objectStore: IDBObjectStore) {
	return new Promise<number>((resolve, reject) => {
		const request = objectStore.count();
		request.onerror = reject;
		request.onsuccess = function() {
			resolve(this.result);
		};
	});
}
async function firstIdCore(objectStore: IDBObjectStore) {
	return new Promise<IDBValidKey>((resolve, reject) => {
		const request = objectStore.openCursor();
		request.onerror = reject;

		request.onsuccess = function() {
			const cursor = this.result;
			if (cursor) {
				resolve(cursor.key);
			} else {
				reject();
			}
		};
	});
}
async function getStore(tableName: string, readwrite = false) {
	const db = await openDatabase();
	const transaction = db.transaction([tableName], readwrite ? "readwrite" : "readonly");
	return transaction.objectStore(tableName);
}

// public api
export async function get<T>(tableName: string, id: IDBValidKey) {
	return await getCore<T>(await getStore(tableName), id);
}
export async function list<T>(tableName: string) {
	return await listCore<T>(await getStore(tableName));
}
export async function add<T>(tableName: string, object: T) {
	return await addCore(await getStore(tableName, true), object);
}
export async function put<T>(tableName: string, object: T, id?: IDBValidKey) {
	return await putCore(await getStore(tableName, true), object, id);
}
export async function remove(tableName: string, id: IDBValidKey) {
	await deleteCore(await getStore(tableName, true), id);
}
export async function limit(tableName: string, length: number) {
	const store = await getStore(tableName);
	const count = await countCore(store);
	if (count > length) {
		await deleteCore(store, await firstIdCore(store));
	}
}
