export const saveGameTable = "saves";

// opens the database, initializing it if necessary
function openDatabase() {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open("solitaire", 1);

		request.onupgradeneeded = function(event) {
			const database = event.target.result;

			// drop existing tables
			for (const name of database.objectStoreNames) {
				database.deleteObjectStore(name);
			}

			// create table for saved games
			database.createObjectStore(saveGameTable, {keyPath: "key"});
		};

		navigator.storage.persist();
		request.onerror = reject;
		request.onsuccess = function() {
			resolve(this.result);
		};
	});
}

// core database interactions
function getCore(objectStore, id) {
	return new Promise((resolve, reject) => {
		const request = objectStore.get(id);
		request.onerror = reject;
		request.onsuccess = function(event) {
			resolve(event.target.result);
		};
	});
}
function listCore(objectStore) {
	return new Promise((resolve, reject) => {
		const request = objectStore.openCursor();
		request.onerror = reject;

		const list = [];
		request.onsuccess = function(event) {
			const cursor = event.target.result;
			if (cursor) {
				list.push({id: cursor.key, value: cursor.value});
				cursor.continue();
			} else {
				resolve(list);
			}
		};
	});
}
function addCore(objectStore, object) {
	return new Promise((resolve, reject) => {
		const request = objectStore.add(object);
		request.onerror = reject;
		request.onsuccess = function(event) {
			resolve(event.target.result);
		};
	});
}
function putCore(objectStore, object, id) {
	return new Promise((resolve, reject) => {
		const request = objectStore.put(object, id);
		request.onerror = reject;
		request.onsuccess = function(event) {
			resolve(event.target.result);
		};
	});
}
function deleteCore(objectStore, id) {
	return new Promise((resolve, reject) => {
		const request = objectStore.delete(id);
		request.onerror = reject;
		request.onsuccess = function() {
			resolve();
		};
	});
}
async function getStore(tableName, readwrite = false) {
	const db = await openDatabase();
	const transaction = db.transaction([tableName], readwrite ? "readwrite" : "readonly");
	return transaction.objectStore(tableName);
}

// public api
export async function get(tableName, id) {
	return await getCore(await getStore(tableName), id);
}
export async function list(tableName) {
	return await listCore(await getStore(tableName));
}
export async function add(tableName, object) {
	return await addCore(await getStore(tableName, true), object);
}
export async function put(tableName, object, id) {
	return await putCore(await getStore(tableName, true), object, id);
}
export async function remove(tableName, id) {
	return await deleteCore(await getStore(tableName, false), id);
}
